# Portfolio authentication API deployment (separate from KnightCore)

This service uses the existing AWS RDS SQL Server database `PortfolioDB`, adds only `dbo.PortfolioEmailVerificationTokens` and unique indexes for usernames/emails, and does not stop or rebuild the existing KnightCore containers.

## 1. Prepare the private environment file on EC2

The file `/etc/portfolio-api/portfolio.env` already holds SMTP settings. Add the database and optional first-account settings to that file. Never commit this file or paste its values into chat.

Required values:
```dotenv
DB_USERNAME=knightadmin
DB_PASSWORD='REPLACE_WITH_THE_ROTATED_DATABASE_PASSWORD'
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=sagar01101100@gmail.com
SMTP_PASSWORD='YOUR_GMAIL_APP_PASSWORD_WITHOUT_SPACES'
SMTP_FROM_EMAIL=sagar01101100@gmail.com
```

To create the requested first accounts on the first API startup, also add two different strong passwords (12–128 characters) that you choose privately:
```dotenv
BOOTSTRAP_ADMIN_PASSWORD='CHOOSE_A_STRONG_UNIQUE_ADMIN_PASSWORD'
BOOTSTRAP_USER_PASSWORD='CHOOSE_A_DIFFERENT_STRONG_USER_PASSWORD'
```

Keep the file root-owned and mode 600:
```bash
sudo chown root:root /etc/portfolio-api/portfolio.env
sudo chmod 600 /etc/portfolio-api/portfolio.env
```

The bootstrap settings create `sagar000108` / `sagar000108@gmail.com` with role `Admin`, and `sagarpita` / `sagarpita@gmail.com` with role `User`, only if neither the username nor email already exists. Both are initially inactive/unverified and receive verification emails. The service intentionally does not promote an existing account automatically.

Before starting the API, run this read-only SQL check in SSMS or through the same `sqlcmd` container used earlier. Confirm `UserIdIsIdentity` is `1`; the duplicate queries should return no rows. Do not paste passwords into SQL text.

```sql
SELECT COLUMNPROPERTY(OBJECT_ID('dbo.Users'), 'UserId', 'IsIdentity') AS UserIdIsIdentity;
SELECT Username, COUNT_BIG(*) AS RowCount
FROM dbo.Users GROUP BY Username HAVING COUNT_BIG(*) > 1;
SELECT Email, COUNT_BIG(*) AS RowCount
FROM dbo.Users GROUP BY Email HAVING COUNT_BIG(*) > 1;
```

If `UserIdIsIdentity` is not `1`, stop before deploying and review the table definition rather than altering it automatically.

## 2. Clone the isolated branch and start only the portfolio API

Run on the **Ubuntu SSH terminal**. This clone is separate from `~/KnightCore`.

```bash
git clone --single-branch --branch feature/portfolio-auth-api https://github.com/sagar01101100/s_portfolio.git ~/s_portfolio-auth
cd ~/s_portfolio-auth
sudo docker compose -f compose.portfolio-api.yaml config --quiet
sudo docker compose -f compose.portfolio-api.yaml up --build -d
```

The service binds only to `127.0.0.1:8181`; it does not publish a public port and does not touch the existing KnightCore Compose stack. If the build fails due to low memory, do not restart or stop KnightCore; share only the final error lines with secrets redacted.

Check its logs and local health:
```bash
sudo docker compose -f compose.portfolio-api.yaml ps
sudo docker compose -f compose.portfolio-api.yaml logs --tail=80 portfolio-auth-api
curl -i http://127.0.0.1:8181/api/v1/health
```

## 3. Add the Caddy route

Back up the Caddy configuration before editing:
```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup-portfolio-auth
sudo nano /etc/caddy/Caddyfile
```

Inside the existing `3-25-207-136.sslip.io { ... }` site block, add this route **before the final generic `handle { ... }`**. Keep the existing `/portfolio/*` route and KnightCore reverse proxy unchanged.

```caddy
handle_path /portfolio-api/* {
    reverse_proxy 127.0.0.1:8181
}
```

Validate and reload:
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl -i https://3-25-207-136.sslip.io/portfolio-api/api/v1/health
```

Expected health response: HTTP 200 with `{"status":"healthy","service":"portfolio-auth-api"}`. If validation fails, restore the backup and do not reload.

## 4. Deploy the Knight Space signup UI files

Only after the API health check succeeds, deploy the two changed frontend files from this branch. This updates the existing static portfolio files but leaves KnightCore containers alone.

```bash
sudo cp /var/www/s_portfolio/app.js /var/www/s_portfolio/app.js.backup
sudo cp /var/www/s_portfolio/style.css /var/www/s_portfolio/style.css.backup
sudo cp ~/s_portfolio-auth/dist/app.js /var/www/s_portfolio/app.js
sudo cp ~/s_portfolio-auth/dist/style.css /var/www/s_portfolio/style.css
```

If the live static root is not `/var/www/s_portfolio`, confirm it from the existing Caddyfile's `root` directive before copying. Hard refresh the browser (Ctrl+F5) or clear the portfolio service-worker cache if the old JavaScript remains cached.

## 5. Test

- Open `https://3-25-207-136.sslip.io/portfolio/`, select the Knight Space shelf item, and choose **Create an account**.
- Register a test account with a unique username, an email you can access, and a password of at least 12 characters.
- Confirm the verification email arrives from `sagar01101100@gmail.com` and the link activates the account.
- Check login using the new API at `/portfolio-api/api/v1/auth/login`; the existing portfolio login UI still needs to be wired to this server-side login before those accounts can unlock the private room.
- Once the two bootstrap accounts are created, remove the `BOOTSTRAP_ADMIN_PASSWORD` and `BOOTSTRAP_USER_PASSWORD` lines from the environment file and restart only this API service.

Registration API: `POST /portfolio-api/api/v1/auth/register` with JSON `{"username":"...","email":"...","password":"..." }`. Other endpoints: `POST /portfolio-api/api/v1/auth/resend-verification`, `GET /portfolio-api/api/v1/auth/verify?token=...`, `POST /portfolio-api/api/v1/auth/login`, `GET /portfolio-api/api/v1/auth/me`, and `POST /portfolio-api/api/v1/auth/logout`.

## Important notes

- Rotate the database password if it was exposed in terminal text/chat, then use only the new password in the protected environment file.
- The RDS login must have permission to create a verification-token table and unique indexes in `PortfolioDB`. Initialization intentionally fails if duplicate usernames or emails already exist.
- Passwords and verification tokens are never stored in plaintext; verification tokens are random, single-use, expire after the configured interval, and are stored hashed.
- Do not expose port 8181 in the EC2 security group. TLS terminates at Caddy; the API is reachable only through loopback.
