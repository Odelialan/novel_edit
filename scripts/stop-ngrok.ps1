# Novel Edit ngrok Tunnel Stopper (PowerShell)
# For Windows PowerShell 5.1+ and PowerShell Core 6.0+

param(
    [switch]$Help
)

# Show help information
if ($Help) {
    Write-Host @"
Novel Edit ngrok Tunnel Stopper Usage:

Parameters:
  -Help       Show this help information

Examples:
  .\stop-ngrok.ps1              # Stop ngrok tunnel
  .\stop-ngrok.ps1 -Help        # Show help

Notes:
  1. First run may require admin privileges
  2. If execution policy error occurs, run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
"@ -ForegroundColor Cyan
    exit 0
}

# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================" -ForegroundColor Green
Write-Host "          Novel Edit ngrok Tunnel Stopper" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Stopping ngrok tunnel..." -ForegroundColor Yellow
Write-Host ""

# Find and terminate ngrok processes
try {
    $ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
    
    if ($ngrokProcesses) {
        Write-Host "Found $($ngrokProcesses.Count) ngrok process(es), terminating..." -ForegroundColor Yellow
        
        foreach ($process in $ngrokProcesses) {
            try {
                $process.Kill()
                Write-Host "✓ Terminated ngrok process (PID: $($process.Id))" -ForegroundColor Green
            } catch {
                Write-Host "⚠ Cannot terminate ngrok process (PID: $($process.Id)): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        
        # Wait for processes to fully terminate
        Start-Sleep -Seconds 2
        
        # Check again if any ngrok processes remain
        $remainingProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
        if ($remainingProcesses) {
            Write-Host "⚠ Still have $($remainingProcesses.Count) ngrok process(es) running, please close manually" -ForegroundColor Yellow
        } else {
            Write-Host "✓ All ngrok processes successfully terminated" -ForegroundColor Green
        }
    } else {
        Write-Host "No running ngrok processes found." -ForegroundColor White
    }
    
} catch {
    Write-Host "✗ Error finding ngrok processes: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "ngrok tunnel stopped!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "If ngrok windows are still open, please close them manually." -ForegroundColor White
Write-Host "To restart tunnel, run: .\scripts\start-ngrok.ps1" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Green

Read-Host "Press any key to exit"
