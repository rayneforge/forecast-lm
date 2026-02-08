FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/Rayneforge.Forecast.Worker/Rayneforge.Forecast.Worker.csproj", "src/Rayneforge.Forecast.Worker/"]
COPY ["src/Rayneforge.Forecast.ServiceDefaults/Rayneforge.Forecast.ServiceDefaults.csproj", "src/Rayneforge.Forecast.ServiceDefaults/"]
COPY ["src/Rayneforge.Forcecast.Domain/Rayneforge.Forecast.Domain.csproj", "src/Rayneforge.Forecast.Domain/"]
COPY ["src/Rayneforge.Forecast.Infrastructure/Rayneforge.Forecast.Infrastructure.csproj", "src/Rayneforge.Forecast.Infrastructure/"]

RUN dotnet restore "src/Rayneforge.Forecast.Worker/Rayneforge.Forecast.Worker.csproj"

COPY . .
WORKDIR "/src/src/Rayneforge.Forecast.Worker"
RUN dotnet build "Rayneforge.Forecast.Worker.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Rayneforge.Forecast.Worker.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/azure-functions/dotnet-isolated:10.0-preview AS base
WORKDIR /home/site/wwwroot
COPY --from=publish /app/publish .
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

