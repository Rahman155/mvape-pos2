# ============================================================================
# VAPESTORE POS PWA - Build Script (PowerShell)
# ============================================================================

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:HUSKY = "0"

Write-Host ""
Write-Host "============================================================================"
Write-Host "VAPESTORE POS PWA - BUILD SCRIPT"
Write-Host "============================================================================"
Write-Host ""
Write-Host "Project Root: $ProjectRoot"
Write-Host ""

# ============================================================================
# STEP 1: Build Backend
# ============================================================================
Write-Host "============================================================================"
Write-Host "STEP 1: Building Backend"
Write-Host "============================================================================"
Write-Host ""

$BackendPath = "$ProjectRoot\packages\backend"
Push-Location $BackendPath

Write-Host "Installing backend dependencies..."
cmd /c "pnpm install" >$null 2>&1

Write-Host "Building backend..."
cmd /c "pnpm run build"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Backend build failed"
    Pop-Location
    exit 1
}

if (Test-Path "dist") {
    Write-Host "[OK] Backend built successfully"
    Write-Host "Output: $BackendPath\dist"
}
else {
    Write-Host "[ERROR] Backend dist folder not created"
    Pop-Location
    exit 1
}

Pop-Location
Write-Host ""

# ============================================================================
# STEP 2: Build Frontend
# ============================================================================
Write-Host "============================================================================"
Write-Host "STEP 2: Building Frontend"
Write-Host "============================================================================"
Write-Host ""

$FrontendPath = "$ProjectRoot\packages\frontend"
Push-Location $FrontendPath

Write-Host "Installing frontend dependencies..."
cmd /c "pnpm install" >$null 2>&1

Write-Host "Building frontend (this may take several minutes)..."
cmd /c "pnpm run build"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed"
    Pop-Location
    exit 1
}

if (Test-Path ".next") {
    Write-Host "[OK] Frontend built successfully"
    Write-Host "Output: $FrontendPath\.next"
}
else {
    Write-Host "[ERROR] Frontend .next folder not created"
    Pop-Location
    exit 1
}

Pop-Location
Write-Host ""

# ============================================================================
# BUILD COMPLETE
# ============================================================================
Write-Host "============================================================================"
Write-Host "BUILD COMPLETE - SUCCESS!"
Write-Host "============================================================================"
Write-Host ""
Write-Host "Output Locations:"
Write-Host "  Backend:  $BackendPath\dist"
Write-Host "  Frontend: $FrontendPath\.next"
Write-Host ""
Write-Host "Ready for deployment!"
Write-Host ""

Read-Host "Press Enter to exit"
exit 0
