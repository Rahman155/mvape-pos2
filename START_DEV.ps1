# Script untuk menjalankan Backend dan Frontend
# Run: powershell -ExecutionPolicy Bypass -File START_DEV.ps1

param(
    [ValidateSet("backend", "frontend", "both", "setup")]
    [string]$Component = "both"
)

$projectRoot = $PSScriptRoot
$backendDir = Join-Path $projectRoot "packages\backend"
$frontendDir = Join-Path $projectRoot "packages\frontend"

function Show-Menu {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "Vapestore POS - Development Server" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pilih mode:" -ForegroundColor Yellow
    Write-Host "  1. Backend only (Port 3001)" -ForegroundColor White
    Write-Host "  2. Frontend only (Port 3000)" -ForegroundColor White
    Write-Host "  3. Backend + Frontend (Port 3001 & 3000)" -ForegroundColor White
    Write-Host "  4. Setup Database (baru kali pertama)" -ForegroundColor White
    Write-Host "  0. Exit" -ForegroundColor White
    Write-Host ""
}

function Start-Backend {
    Write-Host ""
    Write-Host "🚀 Starting Backend..." -ForegroundColor Green
    Write-Host "   Port: 3001" -ForegroundColor Gray
    Write-Host "   API: http://localhost:3001" -ForegroundColor Gray
    Write-Host "   Health: http://localhost:3001/health" -ForegroundColor Gray
    Write-Host ""
    
    Set-Location $backendDir
    & pnpm run dev
}

function Start-Frontend {
    Write-Host ""
    Write-Host "🚀 Starting Frontend..." -ForegroundColor Green
    Write-Host "   Port: 3000" -ForegroundColor Gray
    Write-Host "   URL: http://localhost:3000" -ForegroundColor Gray
    Write-Host ""
    
    Set-Location $frontendDir
    & pnpm run dev
}

function Start-Both {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "🚀 Starting Both Services" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  Anda perlu membuka 2 terminal/tab:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Terminal 1:" -ForegroundColor Cyan
    Write-Host "  cd packages\backend" -ForegroundColor White
    Write-Host "  pnpm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Terminal 2:" -ForegroundColor Cyan
    Write-Host "  cd packages\frontend" -ForegroundColor White
    Write-Host "  pnpm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Atau gunakan terminal manager seperti tmux/PowerShell tab." -ForegroundColor Yellow
    Write-Host ""
}

function Run-DatabaseSetup {
    Write-Host ""
    Write-Host "📊 Running Database Setup..." -ForegroundColor Green
    Write-Host ""
    
    $setupScript = Join-Path $projectRoot "SETUP_DATABASE.ps1"
    
    if (Test-Path $setupScript) {
        & powershell -ExecutionPolicy Bypass -File $setupScript
    } else {
        Write-Host "❌ SETUP_DATABASE.ps1 not found" -ForegroundColor Red
    }
}

# Handle command line parameter
if ($Component -ne "both") {
    switch ($Component) {
        "backend" { Start-Backend }
        "frontend" { Start-Frontend }
        "setup" { Run-DatabaseSetup }
        default { Write-Host "Unknown component: $Component" -ForegroundColor Red }
    }
    Exit 0
}

# Interactive menu
while ($true) {
    Show-Menu
    $choice = Read-Host "Pilih opsi (0-4)"
    
    switch ($choice) {
        "1" { Start-Backend; break }
        "2" { Start-Frontend; break }
        "3" { Start-Both; break }
        "4" { Run-DatabaseSetup }
        "0" { 
            Write-Host ""
            Write-Host "Goodbye! 👋" -ForegroundColor Green
            Exit 0 
        }
        default { 
            Write-Host "❌ Opsi tidak valid" -ForegroundColor Red
        }
    }
}
