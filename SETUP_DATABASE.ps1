# Script Setup Database PostgreSQL untuk Vapestore POS
# Run: powershell -ExecutionPolicy Bypass -File SETUP_DATABASE.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Vapestore POS - Database Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if PostgreSQL is installed
Write-Host "[1/4] Checking PostgreSQL installation..." -ForegroundColor Yellow
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($null -eq $psqlPath) {
    Write-Host "❌ PostgreSQL not found in PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL first:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "  2. Run installer and set password for 'postgres' user" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    Write-Host ""
    Exit 1
}

Write-Host "✅ PostgreSQL found: $($psqlPath.Source)" -ForegroundColor Green
Write-Host ""

# 2. Test postgres connection
Write-Host "[2/4] Testing PostgreSQL connection..." -ForegroundColor Yellow

$postgresPassword = Read-Host "Enter postgres user password (set during PostgreSQL install)"

try {
    # Suppress output and capture result
    $testConnection = & psql -h localhost -U postgres -d postgres -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connected to PostgreSQL successfully" -ForegroundColor Green
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Host "❌ Failed to connect to PostgreSQL" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  - Check if PostgreSQL service is running (Services.msc)" -ForegroundColor White
    Write-Host "  - Check if port 5432 is available" -ForegroundColor White
    Write-Host "  - Verify postgres user password" -ForegroundColor White
    Write-Host ""
    Exit 1
}

Write-Host ""

# 3. Create database user and database
Write-Host "[3/4] Creating database user and database..." -ForegroundColor Yellow

$sqlScript = @"
-- Create vapestore_dev user if not exists
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'vapestore_dev') THEN
    CREATE ROLE vapestore_dev WITH LOGIN PASSWORD 'password123';
  END IF;
END
`$`$;

-- Create database if not exists
SELECT 'CREATE DATABASE vapestore_pos OWNER vapestore_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vapestore_pos')\gexec

-- Grant privileges
ALTER ROLE vapestore_dev CREATEDB;
"@

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$sqlScript | Out-File -Encoding UTF8 -FilePath $tempFile

try {
    # Run SQL script
    $output = & psql -h localhost -U postgres -d postgres -f $tempFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database user and database created successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database creation completed with warnings:" -ForegroundColor Yellow
        Write-Host $output -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to create database" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Exit 1
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""

# 4. Test vapestore_dev connection
Write-Host "[4/4] Testing vapestore_dev user connection..." -ForegroundColor Yellow

try {
    $output = & psql -h localhost -U vapestore_dev -d vapestore_pos -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connected to vapestore_pos database successfully" -ForegroundColor Green
    } else {
        throw "Connection test failed"
    }
} catch {
    Write-Host "⚠️  Could not connect as vapestore_dev" -ForegroundColor Yellow
    Write-Host "This might be expected on first run. Continue..." -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ Database Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd packages/backend" -ForegroundColor White
Write-Host "  2. pnpm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Backend will run migrations automatically on startup." -ForegroundColor Yellow
Write-Host ""
