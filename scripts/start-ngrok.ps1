# Novel Edit ngrok Tunnel Starter (PowerShell)
# For Windows PowerShell 5.1+ and PowerShell Core 6.0+

param(
    [switch]$Help
)

# Show help information
if ($Help) {
    Write-Host @"
Novel Edit ngrok Tunnel Starter Usage:

Parameters:
  -Help       Show this help information

Examples:
  .\start-ngrok.ps1              # Start ngrok tunnel
  .\start-ngrok.ps1 -Help        # Show help

Notes:
  1. First run may require admin privileges
  2. If execution policy error occurs, run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  3. Need to configure NGROK_AUTHTOKEN in .env file first
"@ -ForegroundColor Cyan
    exit 0
}

# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================" -ForegroundColor Green
Write-Host "          Novel Edit ngrok Tunnel Starter" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Check environment variables
$ngrokToken = $env:NGROK_AUTHTOKEN
if (-not $ngrokToken) {
    # Try to read from .env file
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" | Where-Object { $_ -match "^NGROK_AUTHTOKEN=" }
        if ($envContent) {
            $ngrokToken = ($envContent -split "=")[1].Trim()
        }
    }
}

if (-not $ngrokToken) {
    Write-Host "✗ Error: NGROK_AUTHTOKEN environment variable not set." -ForegroundColor Red
    Write-Host "Please set NGROK_AUTHTOKEN in .env file or set environment variable manually." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Setup methods:" -ForegroundColor Cyan
    Write-Host "1. Create .env file in project root directory" -ForegroundColor White
    Write-Host "2. Add: NGROK_AUTHTOKEN=your-ngrok-token" -ForegroundColor White
    Write-Host "3. Or run: `$env:NGROK_AUTHTOKEN='your-ngrok-token'" -ForegroundColor White
    Write-Host ""
    Write-Host "Get ngrok token: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}

# Check if ngrok is installed
try {
    $ngrokVersion = ngrok --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ngrok installed: $ngrokVersion" -ForegroundColor Green
    } else {
        throw "ngrok not installed"
    }
} catch {
    Write-Host "✗ Error: ngrok not found, please install ngrok first." -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation methods:" -ForegroundColor Cyan
    Write-Host "1. Download: https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Extract to project root or add to PATH" -ForegroundColor White
    Write-Host "3. Or use: npm install -g ngrok" -ForegroundColor White
    Read-Host "Press any key to exit"
    exit 1
}

Write-Host "Starting ngrok tunnel..." -ForegroundColor Yellow
Write-Host "Target port: 3000 (Frontend Web)" -ForegroundColor White
Write-Host ""

# Start ngrok tunnel
try {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 3000 --log stdout --authtoken '$ngrokToken'" -WindowStyle Normal
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "ngrok tunnel started successfully!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please check ngrok window for public access address." -ForegroundColor White
    Write-Host "Usually format: https://xxxxx.ngrok.io" -ForegroundColor White
    Write-Host ""
    Write-Host "Notes:" -ForegroundColor Cyan
    Write-Host "1. Public access has security risks, use with caution" -ForegroundColor White
    Write-Host "2. Tunnel address changes each restart" -ForegroundColor White
    Write-Host "3. Free version has connection limits" -ForegroundColor White
    Write-Host ""
    Write-Host "Stop tunnel: Close ngrok window or run .\scripts\stop-ngrok.ps1" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Failed to start ngrok: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "Press any key to exit"
