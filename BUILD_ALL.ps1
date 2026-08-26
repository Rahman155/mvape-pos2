#!/usr/bin/env pwsh
# ============================================================================
# VAPESTORE POS PWA - Complete Build Script (PowerShell)
# ============================================================================
# This script will:
# 1. Configure npm to use HTTPS (fix EUNSUPPORTEDPROTOCOL error)
# 2. Clear npm cache
# 3. Install and build backend
# 4. Install and build frontend
#
# USAGE: 
#   1. Open PowerShell as Administrator
#   2. Run: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
#   3. Run: .\BUILD_ALL.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

# Colors
$InfoColor = "Cyan"
$SuccessColor = "Green"
$ErrorColor = "Red"
$HeaderColor = "Yellow"

# Get project root
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor $HeaderColor
    Write-Host $Message -ForegroundColor $HeaderColor
    Write-Host "============================================================================" -ForegroundColor $HeaderColor
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "[✓ SUCCESS] $Message" -ForegroundColor $SuccessColor
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[✗ ERROR] $Message" -ForegroundColor $ErrorColor
}

function Write-Info {
    param([string]$Message)
    Write-Host "[ℹ INFO] $Message" -ForegroundColor $InfoColor
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Invoke-Command-Safe {
    param(
        [string]$Command,
        [string]$SuccessMessage,
        [string]$ErrorMessage
    )
    
    try {
        Write-Host $Command -ForegroundColor Gray
        Invoke-Expression $Command | Out-Host
        Write-Success $SuccessMessage
        return $true
    }
    catch {
        Write-Error-Custom $ErrorMessage
        Write-Host $_.Exception.Message -ForegroundColor $ErrorColor
        return $false
    }
}

# ============================================================================
# STEP 1: Verify npm Installation
# ============================================================================
Write-Header "STEP 1: Verifying npm Installation"

if (-not (Test-Command "npm")) {
    Write-Error-Custom "npm is not installed or not in PATH"
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor $ErrorColor
    Read-Host "Press Enter to exit"
    exit 1
}

$npmVersion = npm --version
Write-Info "npm version: $npmVersion"
Write-Success "npm is installed"

# ============================================================================
# STEP 2: Configure npm
# ============================================================================
Write-Header "STEP 2: Configuring npm to use HTTPS"

Write-Info "Setting npm registry to HTTPS..."
if (-not (Invoke-Command-Safe "npm config set registry https://registry.npmjs.org/" `
    "npm registry configured" `
    "Failed to set npm registry")) {
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Setting git protocol to HTTPS..."
if (-not (Invoke-Command-Safe "npm config set git-protocol https" `
    "git protocol configured" `
    "Failed to set git protocol")) {
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Updating npm to latest version..."
if (-not (Invoke-Command-Safe "npm install -g npm@latest" `
    "npm updated to latest version" `
    "Failed to update npm")) {
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Verifying npm configuration..."
$npmConfig = npm config list
if ($npmConfig -match "registry.*npmjs") {
    Write-Success "npm registry is configured correctly"
} else {
    Write-Error-Custom "npm registry not properly configured"
    Read-Host "Press Enter to exit"
    exit 1
}

if ($npmConfig -match "git-protocol.*https") {
    Write-Success "git protocol is configured correctly"
} else {
    Write-Error-Custom "git protocol not properly configured"
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# STEP 3: Clear npm cache
# ============================================================================
Write-Header "STEP 3: Clearing npm cache"

Write-Info "Clearing npm cache..."
if (-not (Invoke-Command-Safe "npm cache clean --force" `
    "npm cache cleared successfully" `
    "Failed to clear npm cache")) {
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# STEP 4: Build Backend
# ============================================================================
Write-Header "STEP 4: Building Backend"

$BackendDir = Join-Path $ProjectRoot "packages\backend"
Write-Info "Backend directory: $BackendDir"

if (-not (Test-Path $BackendDir)) {
    Write-Error-Custom "Backend directory not found at $BackendDir"
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $BackendDir

Write-Info "Removing old node_modules and lock file..."
if (Test-Path "node_modules") {
    Write-Host "Removing node_modules folder..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Write-Host "Removing package-lock.json..." -ForegroundColor Gray
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}

Write-Info "Installing backend dependencies..."
if (-not (Invoke-Command-Safe "npm install" `
    "Backend dependencies installed successfully" `
    "Failed to install backend dependencies")) {
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Building backend TypeScript..."
if (-not (Invoke-Command-Safe "npm run build" `
    "Backend built successfully" `
    "Failed to build backend")) {
    Read-Host "Press Enter to exit"
    exit 1
}

$BackendDistDir = Join-Path $BackendDir "dist"
if (Test-Path $BackendDistDir) {
    Write-Success "Backend dist directory created successfully"
    Write-Info "Backend output location: $BackendDistDir"
} else {
    Write-Error-Custom "Backend dist directory was not created"
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# STEP 5: Build Frontend
# ============================================================================
Write-Header "STEP 5: Building Frontend"

$FrontendDir = Join-Path $ProjectRoot "packages\frontend"
Write-Info "Frontend directory: $FrontendDir"

if (-not (Test-Path $FrontendDir)) {
    Write-Error-Custom "Frontend directory not found at $FrontendDir"
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $FrontendDir

Write-Info "Removing old node_modules and lock file..."
if (Test-Path "node_modules") {
    Write-Host "Removing node_modules folder..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Write-Host "Removing package-lock.json..." -ForegroundColor Gray
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}

Write-Info "Installing frontend dependencies..."
if (-not (Invoke-Command-Safe "npm install" `
    "Frontend dependencies installed successfully" `
    "Failed to install frontend dependencies")) {
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Building frontend Next.js application..."
if (-not (Invoke-Command-Safe "npm run build" `
    "Frontend built successfully" `
    "Failed to build frontend")) {
    Read-Host "Press Enter to exit"
    exit 1
}

$FrontendNextDir = Join-Path $FrontendDir ".next"
if (Test-Path $FrontendNextDir) {
    Write-Success "Frontend .next directory created successfully"
    Write-Info "Frontend output location: $FrontendNextDir"
} else {
    Write-Error-Custom "Frontend .next directory was not created"
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# BUILD COMPLETE
# ============================================================================
Write-Header "BUILD COMPLETE - SUCCESS"

Write-Host ""
Write-Host "✓ All builds completed successfully!" -ForegroundColor $SuccessColor
Write-Host ""
Write-Host "Build Output Locations:" -ForegroundColor $HeaderColor
Write-Host "  • Backend: $BackendDir\dist" -ForegroundColor $SuccessColor
Write-Host "  • Frontend: $FrontendDir\.next" -ForegroundColor $SuccessColor
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor $HeaderColor
Write-Host "  1. Review the BUILD_AND_DEPLOYMENT_GUIDE.md" -ForegroundColor $InfoColor
Write-Host "  2. Choose your deployment strategy" -ForegroundColor $InfoColor
Write-Host "  3. Deploy the application" -ForegroundColor $InfoColor
Write-Host ""
Write-Host "Documentation:" -ForegroundColor $HeaderColor
Write-Host "  • BUILD_AND_DEPLOYMENT_GUIDE.md" -ForegroundColor $InfoColor
Write-Host "  • NPM_ERROR_FIX_GUIDE.md" -ForegroundColor $InfoColor
Write-Host "  • GETTING_STARTED.md" -ForegroundColor $InfoColor
Write-Host ""
Write-Host "Project Root: $ProjectRoot" -ForegroundColor $InfoColor
Write-Host ""

Read-Host "Press Enter to close"
exit 0
