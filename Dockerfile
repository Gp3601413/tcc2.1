# Build da API ASP.NET Core 8
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY SmartFixApi/SmartFixApi.csproj SmartFixApi/
RUN dotnet restore SmartFixApi/SmartFixApi.csproj

COPY SmartFixApi/ SmartFixApi/
WORKDIR /src/SmartFixApi
RUN dotnet publish SmartFixApi.csproj -c Release -o /app/publish /p:UseAppHost=false

# Imagem final, menor, apenas com o runtime do ASP.NET Core
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "SmartFixApi.dll"]
