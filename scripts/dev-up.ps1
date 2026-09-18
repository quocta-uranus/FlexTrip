[CmdletBinding()]
param(
  [ValidateRange(10, 300)]
  [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'be'
$backendEnv = Join-Path $backendDir '.env'

if (-not (Test-Path -LiteralPath $backendEnv)) {
  throw "Missing be/.env. Copy be/env.example to be/.env before starting the project."
}

$databaseUrlLine = Get-Content -LiteralPath $backendEnv |
  Where-Object { $_ -match '^DATABASE_URL=' } |
  Select-Object -First 1

if (-not $databaseUrlLine -or $databaseUrlLine -notmatch ':(\d+)/[^?]+') {
  throw "DATABASE_URL in be/.env does not contain a valid port."
}

$databasePort = $Matches[1]
$env:POSTGRES_PORT = $databasePort

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Desktop is not running or cannot be accessed. Start Docker Desktop and try again."
}

Push-Location $repoRoot
try {
  Write-Host "Starting PostgreSQL on port $databasePort and Redis on port 6379..."
  $composeArgs = @('compose')
  if ($databasePort -ne '5432') {
    $composeArgs += @(
      '-f', (Join-Path $repoRoot 'docker-compose.yml'),
      '-f', (Join-Path $repoRoot 'docker-compose.local.yml')
    )
  }
  $composeArgs += @('up', '-d', '--force-recreate')

  & docker @composeArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose could not start. Check whether ports $databasePort or 6379 are already in use."
  }

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $postgresHealth = docker inspect --format '{{.State.Health.Status}}' flextrip_postgres 2>$null
    $redisHealth = docker inspect --format '{{.State.Health.Status}}' flextrip_redis 2>$null

    if ($postgresHealth -eq 'healthy' -and $redisHealth -eq 'healthy') {
      break
    }

    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  if ($postgresHealth -ne 'healthy') {
    throw @"
PostgreSQL did not become healthy. The saved Docker volume may use a different password.
To keep existing data, run:
docker exec flextrip_postgres psql -U flextrip -d flextrip_db -c "ALTER ROLE flextrip WITH LOGIN PASSWORD 'flextrip';"
Then run this script again.
"@
  }

  if ($redisHealth -ne 'healthy') {
    throw "Redis did not become healthy. Run 'docker compose logs redis' for details."
  }
} finally {
  Pop-Location
}

Push-Location $backendDir
try {
  Write-Host 'Applying existing Prisma migrations...'
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) {
    throw "Prisma migration failed. Confirm DATABASE_URL in be/.env uses port $databasePort."
  }

  Write-Host 'Generating Prisma Client...'
  npx prisma generate
  if ($LASTEXITCODE -ne 0) {
    throw 'Prisma Client generation failed.'
  }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'FlexTrip infrastructure is ready.' -ForegroundColor Green
Write-Host "PostgreSQL: localhost:$databasePort"
Write-Host 'Redis:      localhost:6379'
Write-Host 'Start the backend with: cd be; npm run start:dev'
