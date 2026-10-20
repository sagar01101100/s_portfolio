using System.Data;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<PasswordHasher<PortfolioUser>>();
var app = builder.Build();

var tokenMinutes = ReadInt("VERIFICATION_TOKEN_MINUTES", 30, 5, 1440);
var sessionHours = ReadInt("SESSION_HOURS", 8, 1, 168);
var publicOrigin = (Environment.GetEnvironmentVariable("PUBLIC_ORIGIN") ?? "").TrimEnd('/');
if (!Uri.TryCreate(publicOrigin, UriKind.Absolute, out var origin) || origin.Scheme != Uri.UriSchemeHttps)
    throw new InvalidOperationException("PUBLIC_ORIGIN must be an HTTPS URL.");
if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("DB_PASSWORD")) ||
    string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("DB_USERNAME")))
    throw new InvalidOperationException("Set DB_USERNAME and DB_PASSWORD in the protected environment file.");

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers.CacheControl = "no-store";
    await next();
});

await EnsureSchemaAsync();
await BootstrapConfiguredAccountsAsync();

app.MapGet("/api/v1/health", async Task<IResult> () =>
{
    try
    {
        await using var connection = await OpenConnectionAsync();
        await using var command = new SqlCommand("SELECT 1", connection);
        await command.ExecuteScalarAsync();
        return Results.Ok(new { status = "healthy", service = "portfolio-auth-api" });
    }
    catch
    {
        return Results.Json(new { status = "unhealthy" }, statusCode: 503);
    }
});

app.MapPost("/api/v1/auth/register", async Task<IResult> (RegisterRequest request, PasswordHasher<PortfolioUser> hasher, ILogger<Program> logger) =>
{
    var username = (request.Username ?? "").Trim();
    var email = (request.Email ?? "").Trim();
    var password = request.Password ?? "";
    if (username.Length is < 3 or > 50 || username.Any(char.IsControl))
        return Results.BadRequest(new { message = "Username must be between 3 and 50 characters." });
    if (email.Length > 255 || !MailAddress.TryCreate(email, out var address) || !string.Equals(address.Address, email, StringComparison.OrdinalIgnoreCase))
        return Results.BadRequest(new { message = "Enter a valid email address." });
    if (password.Length < 12 || password.Length > 128)
        return Results.BadRequest(new { message = "Password must contain 12–128 characters." });

    var user = new PortfolioUser { Username = username, Email = email, Role = "User" };
    user.PasswordHash = hasher.HashPassword(user, password);
    try
    {
        var token = CreateToken();
        await using var connection = await OpenConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(IsolationLevel.Serializable);
        await using (var duplicate = new SqlCommand("SELECT TOP (1) 1 FROM dbo.Users WITH (UPDLOCK, HOLDLOCK) WHERE Username=@username OR Email=@email", connection, transaction))
        {
            AddNVarChar(duplicate, "@username", 50, username);
            AddNVarChar(duplicate, "@email", 255, email);
            if (await duplicate.ExecuteScalarAsync() is not null)
                return Results.Conflict(new { message = "That username or email is already registered." });
        }
        await using (var insert = new SqlCommand("""
            INSERT INTO dbo.Users (Username, Email, PasswordHash, DisplayName, Role, IsEmailVerified, IsActive, CreatedAt, UpdatedAt)
            OUTPUT INSERTED.UserId
            VALUES (@username, @email, @passwordHash, NULL, N'User', 0, 0, SYSUTCDATETIME(), NULL)
            """, connection, transaction))
        {
            AddNVarChar(insert, "@username", 50, username);
            AddNVarChar(insert, "@email", 255, email);
            AddNVarChar(insert, "@passwordHash", 255, user.PasswordHash);
            user.UserId = Convert.ToInt64(await insert.ExecuteScalarAsync());
        }
        await InsertVerificationTokenAsync(connection, transaction, user.UserId, token, tokenMinutes);
        await transaction.CommitAsync();
        try
        {
            await SendVerificationEmailAsync(user.Email, user.Username, token, publicOrigin, tokenMinutes);
            return Results.Json(new { message = "Account created. Check your email for the verification link; it expires in 30 minutes." }, statusCode: 201);
        }
        catch (Exception ex)
        {
            logger.LogError("Verification email delivery failed ({ErrorType}). Use the resend-verification endpoint.", ex.GetType().Name);
            return Results.Json(new { message = "Your account was created, but the verification email could not be sent. Please request another verification email." }, statusCode: 503);
        }
    }
    catch (SqlException ex) when (ex.Number is 2601 or 2627)
    {
        return Results.Conflict(new { message = "That username or email is already registered." });
    }
});

app.MapPost("/api/v1/auth/resend-verification", async Task<IResult> (ResendRequest request, ILogger<Program> logger) =>
{
    var email = (request.Email ?? "").Trim();
    if (email.Length is 0 or > 255 || !MailAddress.TryCreate(email, out _))
        return Results.BadRequest(new { message = "Enter a valid email address." });

    await using var connection = await OpenConnectionAsync();
    await using var command = new SqlCommand("SELECT TOP (1) UserId, Username, Email, IsEmailVerified FROM dbo.Users WHERE Email=@email", connection);
    AddNVarChar(command, "@email", 255, email);
    await using var reader = await command.ExecuteReaderAsync();
    if (!await reader.ReadAsync() || reader.GetBoolean(3))
        return Results.Ok(new { message = "If the account needs verification, a link will be sent to its email address." });
    var user = new PortfolioUser { UserId = reader.GetInt64(0), Username = reader.GetString(1), Email = reader.GetString(2) };
    await reader.CloseAsync();
    var token = CreateToken();
    await using (var invalidate = new SqlCommand("UPDATE dbo.PortfolioEmailVerificationTokens SET UsedAt=SYSUTCDATETIME() WHERE UserId=@userId AND UsedAt IS NULL", connection))
    {
        invalidate.Parameters.Add("@userId", SqlDbType.BigInt).Value = user.UserId;
        await invalidate.ExecuteNonQueryAsync();
    }
    await InsertVerificationTokenAsync(connection, null, user.UserId, token, tokenMinutes);
    try { await SendVerificationEmailAsync(user.Email, user.Username, token, publicOrigin, tokenMinutes); }
    catch (Exception ex)
    {
        logger.LogError("Verification resend failed ({ErrorType}).", ex.GetType().Name);
    }
    return Results.Ok(new { message = "If the account needs verification, a link will be sent to its email address." });
});

app.MapGet("/api/v1/auth/verify", async Task<IResult> (string? token) =>
{
    if (string.IsNullOrWhiteSpace(token) || token.Length > 200)
        return Results.BadRequest(new { message = "This verification link is invalid or incomplete." });
    var hash = HashToken(token);
    await using var connection = await OpenConnectionAsync();
    await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(IsolationLevel.Serializable);
    long userId;
    await using (var lookup = new SqlCommand("SELECT TOP (1) UserId FROM dbo.PortfolioEmailVerificationTokens WITH (UPDLOCK, HOLDLOCK) WHERE TokenHash=@hash AND UsedAt IS NULL AND ExpiresAt>SYSUTCDATETIME()", connection, transaction))
    {
        AddNVarChar(lookup, "@hash", 64, hash);
        var value = await lookup.ExecuteScalarAsync();
        if (value is null)
        {
            await transaction.RollbackAsync();
            return Results.BadRequest(new { message = "This verification link has expired or has already been used. Request a new link." });
        }
        userId = Convert.ToInt64(value);
    }
    await using (var consume = new SqlCommand("UPDATE dbo.PortfolioEmailVerificationTokens SET UsedAt=SYSUTCDATETIME() WHERE TokenHash=@hash AND UsedAt IS NULL AND ExpiresAt>SYSUTCDATETIME()", connection, transaction))
    {
        AddNVarChar(consume, "@hash", 64, hash);
        if (await consume.ExecuteNonQueryAsync() != 1)
        {
            await transaction.RollbackAsync();
            return Results.BadRequest(new { message = "This verification link has expired or has already been used." });
        }
    }
    await using (var activate = new SqlCommand("UPDATE dbo.Users SET IsEmailVerified=1, IsActive=1, UpdatedAt=SYSUTCDATETIME() WHERE UserId=@userId", connection, transaction))
    {
        activate.Parameters.Add("@userId", SqlDbType.BigInt).Value = userId;
        await activate.ExecuteNonQueryAsync();
    }
    await transaction.CommitAsync();
    return Results.Content("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Email verified</title><body style=\"margin:0;background:#111921;color:#f3eee5;font:16px system-ui;display:grid;place-items:center;min-height:100vh\"><main style=\"max-width:520px;padding:32px;text-align:center\"><h1>Email verified</h1><p>Your Knight Space account is active. Return to the portfolio and sign in.</p><a style=\"color:#e8bd8c\" href=\"/portfolio/\">Return to portfolio</a></main></body></html>", "text/html");
});

app.MapPost("/api/v1/auth/login", async Task<IResult> (LoginRequest request, PasswordHasher<PortfolioUser> hasher, HttpContext context) =>
{
    var login = (request.Login ?? "").Trim();
    var password = request.Password ?? "";
    if (login.Length == 0 || password.Length == 0)
        return Results.BadRequest(new { message = "Enter your username/email and password." });

    await using var connection = await OpenConnectionAsync();
    PortfolioUser? user = null;
    await using (var command = new SqlCommand("""
        SELECT TOP (1) UserId, Username, Email, PasswordHash, Role, IsEmailVerified, IsActive
        FROM dbo.Users WHERE Username=@login OR Email=@login
        """, connection))
    {
        AddNVarChar(command, "@login", 255, login);
        await using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
            user = new PortfolioUser { UserId = reader.GetInt64(0), Username = reader.GetString(1), Email = reader.GetString(2), PasswordHash = reader.GetString(3), Role = reader.GetString(4), IsEmailVerified = reader.GetBoolean(5), IsActive = reader.GetBoolean(6) };
    }
    if (user is null || !user.IsActive || !user.IsEmailVerified ||
        hasher.VerifyHashedPassword(user, user.PasswordHash, password) == PasswordVerificationResult.Failed)
        return Results.Json(new { message = "Invalid credentials, or verify your email before signing in." }, statusCode: 401);

    var rawToken = CreateToken();
    var tokenHash = HashToken(rawToken);
    var expires = DateTime.UtcNow.AddHours(sessionHours);
    await using (var insert = new SqlCommand("INSERT INTO dbo.UserSessions (UserId, TokenHash, ExpiresAt, CreatedAt, RevokedAt) VALUES (@userId,@tokenHash,@expires,SYSUTCDATETIME(),NULL)", connection))
    {
        insert.Parameters.Add("@userId", SqlDbType.BigInt).Value = user.UserId;
        AddNVarChar(insert, "@tokenHash", 255, tokenHash);
        insert.Parameters.Add("@expires", SqlDbType.DateTime2).Value = expires;
        await insert.ExecuteNonQueryAsync();
    }
    context.Response.Cookies.Append("Portfolio.Session", rawToken, new CookieOptions
    {
        HttpOnly = true, Secure = true, SameSite = SameSiteMode.Lax,
        Path = "/", Expires = new DateTimeOffset(expires)
    });
    return Results.Ok(new { user = new { user.UserId, user.Username, user.Email, user.Role }, expiresAtUtc = expires });
});

app.MapGet("/api/v1/auth/me", async Task<IResult> (HttpContext context) =>
{
    if (!context.Request.Cookies.TryGetValue("Portfolio.Session", out var rawToken) || string.IsNullOrWhiteSpace(rawToken))
        return Results.Unauthorized();
    await using var connection = await OpenConnectionAsync();
    await using var command = new SqlCommand("""
        SELECT TOP (1) u.UserId, u.Username, u.Email, u.Role
        FROM dbo.UserSessions s JOIN dbo.Users u ON u.UserId=s.UserId
        WHERE s.TokenHash=@tokenHash AND s.RevokedAt IS NULL AND s.ExpiresAt>SYSUTCDATETIME()
          AND u.IsActive=1 AND u.IsEmailVerified=1
        """, connection);
    AddNVarChar(command, "@tokenHash", 255, HashToken(rawToken));
    await using var reader = await command.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.Unauthorized();
    return Results.Ok(new { user = new { userId = reader.GetInt64(0), username = reader.GetString(1), email = reader.GetString(2), role = reader.GetString(3) } });
});

app.MapPost("/api/v1/auth/logout", async Task<IResult> (HttpContext context) =>
{
    if (context.Request.Cookies.TryGetValue("Portfolio.Session", out var rawToken) && !string.IsNullOrWhiteSpace(rawToken))
    {
        await using var connection = await OpenConnectionAsync();
        await using var command = new SqlCommand("UPDATE dbo.UserSessions SET RevokedAt=SYSUTCDATETIME() WHERE TokenHash=@tokenHash AND RevokedAt IS NULL", connection);
        AddNVarChar(command, "@tokenHash", 255, HashToken(rawToken));
        await command.ExecuteNonQueryAsync();
    }
    context.Response.Cookies.Delete("Portfolio.Session", new CookieOptions { HttpOnly = true, Secure = true, SameSite = SameSiteMode.Lax, Path = "/" });
    return Results.Ok(new { message = "Signed out." });
});

app.Run();

static string ConnectionString()
{
    var server = Environment.GetEnvironmentVariable("DB_SERVER") ?? throw new InvalidOperationException("DB_SERVER is required.");
    var database = Environment.GetEnvironmentVariable("DB_NAME") ?? "PortfolioDB";
    var username = Environment.GetEnvironmentVariable("DB_USERNAME")!;
    var password = Environment.GetEnvironmentVariable("DB_PASSWORD")!;
    return new SqlConnectionStringBuilder
    {
        DataSource = server.Contains(',') ? server : server + ",1433",
        InitialCatalog = database,
        UserID = username,
        Password = password,
        Encrypt = true,
        TrustServerCertificate = false,
        ConnectTimeout = 15,
        PersistSecurityInfo = false
    }.ConnectionString;
}

static async Task<SqlConnection> OpenConnectionAsync()
{
    var connection = new SqlConnection(ConnectionString());
    await connection.OpenAsync();
    return connection;
}

static async Task EnsureSchemaAsync()
{
    await using var connection = await OpenConnectionAsync();
    var sql = """
        IF OBJECT_ID(N'dbo.PortfolioEmailVerificationTokens', N'U') IS NULL
        BEGIN
            CREATE TABLE dbo.PortfolioEmailVerificationTokens (
                TokenId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_PortfolioEmailVerificationTokens PRIMARY KEY,
                UserId bigint NOT NULL,
                TokenHash nvarchar(64) NOT NULL,
                ExpiresAt datetime2 NOT NULL,
                CreatedAt datetime2 NOT NULL CONSTRAINT DF_PortfolioEmailVerificationTokens_CreatedAt DEFAULT SYSUTCDATETIME(),
                UsedAt datetime2 NULL,
                CONSTRAINT FK_PortfolioEmailVerificationTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
            );
            CREATE UNIQUE INDEX UX_PortfolioEmailVerificationTokens_TokenHash ON dbo.PortfolioEmailVerificationTokens(TokenHash);
            CREATE INDEX IX_PortfolioEmailVerificationTokens_UserId ON dbo.PortfolioEmailVerificationTokens(UserId);
        END;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Users') AND name=N'UX_PortfolioUsers_Username')
        BEGIN
            IF EXISTS (SELECT Username FROM dbo.Users GROUP BY Username HAVING COUNT_BIG(*)>1)
                THROW 51000, 'Duplicate usernames exist in dbo.Users; resolve them before enabling portfolio authentication.', 1;
            CREATE UNIQUE INDEX UX_PortfolioUsers_Username ON dbo.Users(Username);
        END;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Users') AND name=N'UX_PortfolioUsers_Email')
        BEGIN
            IF EXISTS (SELECT Email FROM dbo.Users GROUP BY Email HAVING COUNT_BIG(*)>1)
                THROW 51001, 'Duplicate emails exist in dbo.Users; resolve them before enabling portfolio authentication.', 1;
            CREATE UNIQUE INDEX UX_PortfolioUsers_Email ON dbo.Users(Email);
        END;
        """;
    await using var command = new SqlCommand(sql, connection);
    await command.ExecuteNonQueryAsync();
}

static async Task InsertVerificationTokenAsync(SqlConnection connection, SqlTransaction? transaction, long userId, string token, int minutes)
{
    await using var command = new SqlCommand("""
        INSERT INTO dbo.PortfolioEmailVerificationTokens (UserId, TokenHash, ExpiresAt, CreatedAt)
        VALUES (@userId, @tokenHash, DATEADD(MINUTE, @minutes, SYSUTCDATETIME()), SYSUTCDATETIME())
        """, connection, transaction);
    command.Parameters.Add("@userId", SqlDbType.BigInt).Value = userId;
    AddNVarChar(command, "@tokenHash", 64, HashToken(token));
    command.Parameters.Add("@minutes", SqlDbType.Int).Value = minutes;
    await command.ExecuteNonQueryAsync();
}

static async Task SendVerificationEmailAsync(string email, string username, string token, string publicOrigin, int tokenMinutes)
{
    var host = Environment.GetEnvironmentVariable("SMTP_HOST") ?? throw new InvalidOperationException("SMTP_HOST is not configured.");
    var port = int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out var parsedPort) ? parsedPort : 587;
    var smtpUser = Environment.GetEnvironmentVariable("SMTP_USERNAME") ?? throw new InvalidOperationException("SMTP_USERNAME is not configured.");
    var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? throw new InvalidOperationException("SMTP_PASSWORD is not configured.");
    var from = Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") ?? smtpUser;
    var link = $"{publicOrigin}/portfolio-api/api/v1/auth/verify?token={Uri.EscapeDataString(token)}";
    using var message = new MailMessage(from, email)
    {
        Subject = "Verify your Knight Space account",
        IsBodyHtml = true,
        Body = $"""
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#20252b">
              <h2>Welcome to Knight Space, {WebUtility.HtmlEncode(username)}.</h2>
              <p>Confirm your email address to activate your account. This link expires in {tokenMinutes} minutes and can only be used once.</p>
              <p><a href="{WebUtility.HtmlEncode(link)}" style="display:inline-block;padding:12px 18px;background:#d7aa76;color:#15202a;text-decoration:none;border-radius:6px">Verify email</a></p>
              <p>If you did not request this account, you can ignore this email.</p>
            </div>
            """
    };
    using var client = new SmtpClient(host, port) { EnableSsl = true, DeliveryMethod = SmtpDeliveryMethod.Network, Timeout = 15000 };
    client.Credentials = new NetworkCredential(smtpUser, smtpPassword);
    await client.SendMailAsync(message);
}

static async Task BootstrapConfiguredAccountsAsync()
{
    var adminPassword = Environment.GetEnvironmentVariable("BOOTSTRAP_ADMIN_PASSWORD");
    var userPassword = Environment.GetEnvironmentVariable("BOOTSTRAP_USER_PASSWORD");
    if (string.IsNullOrWhiteSpace(adminPassword) && string.IsNullOrWhiteSpace(userPassword)) return;
    var hasher = new PasswordHasher<PortfolioUser>();
    if (!string.IsNullOrWhiteSpace(adminPassword))
        await BootstrapOneAsync("sagar000108", "sagar000108@gmail.com", "Admin", adminPassword, hasher);
    if (!string.IsNullOrWhiteSpace(userPassword))
        await BootstrapOneAsync("sagarpita", "sagarpita@gmail.com", "User", userPassword, hasher);
}

static async Task BootstrapOneAsync(string username, string email, string role, string password, PasswordHasher<PortfolioUser> hasher)
{
    if (password.Length < 12 || password.Length > 128)
        throw new InvalidOperationException($"The configured {role} bootstrap password must contain 12–128 characters.");
    await using var connection = await OpenConnectionAsync();
    await using var check = new SqlCommand("SELECT TOP (1) UserId FROM dbo.Users WHERE Username=@username OR Email=@email", connection);
    AddNVarChar(check, "@username", 50, username);
    AddNVarChar(check, "@email", 255, email);
    if (await check.ExecuteScalarAsync() is not null) return;
    var user = new PortfolioUser { Username = username, Email = email, Role = role };
    user.PasswordHash = hasher.HashPassword(user, password);
    long id;
    await using (var insert = new SqlCommand("""
        INSERT INTO dbo.Users (Username, Email, PasswordHash, DisplayName, Role, IsEmailVerified, IsActive, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.UserId
        VALUES (@username, @email, @passwordHash, NULL, @role, 0, 0, SYSUTCDATETIME(), NULL)
        """, connection))
    {
        AddNVarChar(insert, "@username", 50, username);
        AddNVarChar(insert, "@email", 255, email);
        AddNVarChar(insert, "@passwordHash", 255, user.PasswordHash);
        AddNVarChar(insert, "@role", 20, role);
        id = Convert.ToInt64(await insert.ExecuteScalarAsync());
    }
    var token = CreateToken();
    await InsertVerificationTokenAsync(connection, null, id, token, ReadInt("VERIFICATION_TOKEN_MINUTES", 30, 5, 1440));
    try { await SendVerificationEmailAsync(email, username, token, GetPublicOrigin(), ReadInt("VERIFICATION_TOKEN_MINUTES", 30, 5, 1440)); }
    catch (Exception ex) { Console.Error.WriteLine($"Bootstrap verification email could not be sent for {role} account ({ex.GetType().Name}). Use resend-verification after deployment."); }
}

static string GetPublicOrigin() => (Environment.GetEnvironmentVariable("PUBLIC_ORIGIN") ?? "").TrimEnd('/');

static int ReadInt(string name, int fallback, int min, int max)
{
    var value = int.TryParse(Environment.GetEnvironmentVariable(name), out var parsed) ? parsed : fallback;
    return Math.Clamp(value, min, max);
}

static string CreateToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
static void AddNVarChar(SqlCommand command, string name, int size, string value)
{
    command.Parameters.Add(name, SqlDbType.NVarChar, size).Value = value;
}

sealed class PortfolioUser
{
    public long UserId { get; set; }
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "User";
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; }
}
sealed record RegisterRequest(string? Username, string? Email, string? Password);
sealed record ResendRequest(string? Email);
sealed record LoginRequest(string? Login, string? Password);
