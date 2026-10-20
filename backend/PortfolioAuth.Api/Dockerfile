FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY PortfolioAuth.Api.csproj ./
RUN dotnet restore PortfolioAuth.Api.csproj
COPY . ./
RUN dotnet publish PortfolioAuth.Api.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
USER root
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl --fail --silent --show-error https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /tmp/rds-ca.pem \
    && awk ' /-----BEGIN CERTIFICATE-----/ { n++; file=sprintf("/usr/local/share/ca-certificates/aws-rds-%d.crt",n) } file { print > file } /-----END CERTIFICATE-----/ { close(file); file="" } ' /tmp/rds-ca.pem \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/* /tmp/rds-ca.pem
WORKDIR /app
COPY --from=build /out ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "PortfolioAuth.Api.dll"]
