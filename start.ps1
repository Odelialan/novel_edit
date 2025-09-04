# Novel Edit PowerShell Startup Script
# For Windows PowerShell 5.1+ and PowerShell Core 6.0+

param(
    [switch]$Docker,
    [switch]$Local,
    [switch]$Help
)

# Show help information
if ($Help) {
    Write-Host @"
Novel Edit Startup Script Usage:

Startup modes:
  -Docker     Use Docker mode (default)
  -Local      Use local development mode
  -Help       Show this help information

Examples:
  .\start.ps1              # Use Docker mode
  .\start.ps1 -Local       # Use local development mode
  .\start.ps1 -Help        # Show help

Notes:
  1. First run may require admin privileges
  2. If execution policy error occurs, run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  3. This script must be run from the project root directory
  4. Virtual environment will be created in project root (./venv)
"@ -ForegroundColor Cyan
    exit 0
}

# Ensure we're in the project root directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ((Get-Location).Path -ne $scriptPath) {
    Write-Host "⚠ Warning: Script should be run from project root directory" -ForegroundColor Yellow
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor White
    Write-Host "Script location: $scriptPath" -ForegroundColor White
    Write-Host "Changing to project root directory..." -ForegroundColor Yellow
    Set-Location $scriptPath
}

# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set environment variables for proper novel_repo path
$env:NOVEL_REPO_PATH = "../novel_repo"

Write-Host "================================================" -ForegroundColor Green
Write-Host "          Novel Edit System Launcher" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Check PowerShell version
$PSVersion = $PSVersionTable.PSVersion
Write-Host "PowerShell Version: $PSVersion" -ForegroundColor Yellow

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Python installed: $pythonVersion" -ForegroundColor Green
    } else {
        throw "Python not installed"
    }
} catch {
    Write-Host "✗ Error: Python not found, please install Python 3.10+" -ForegroundColor Red
    Write-Host "Download: https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not installed"
    }
} catch {
    Write-Host "✗ Error: Node.js not found, please install Node.js 18+" -ForegroundColor Red
    Write-Host "Download: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}

# Check Docker
$useDocker = $true
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
        
        # Check if Docker is running
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Docker service is running" -ForegroundColor Green
        } else {
            Write-Host "⚠ Docker installed but service not running, switching to local mode" -ForegroundColor Yellow
            $useDocker = $false
        }
    } else {
        throw "Docker not installed"
    }
} catch {
    Write-Host "⚠ Docker not found, will use local development mode" -ForegroundColor Yellow
    $useDocker = $false
}

# Decide startup mode based on parameters and detection results
if ($Local) {
    $useDocker = $false
}

if ($useDocker) {
    Write-Host ""
    Write-Host "Using Docker mode..." -ForegroundColor Cyan
    Write-Host ""
    
    # Build and start Docker services
    Write-Host "Building Docker images..." -ForegroundColor Yellow
    docker-compose build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Docker build failed, switching to local mode" -ForegroundColor Red
        $useDocker = $false
    } else {
        Write-Host ""
        Write-Host "Starting services..." -ForegroundColor Yellow
        docker-compose up -d
        
        if ($LASTEXITCODE -eq 0) {
            # Wait for services to start
            Write-Host "Waiting for services to start..." -ForegroundColor Yellow
            Start-Sleep -Seconds 15
            
            # Check service status
            Write-Host "Checking service status..." -ForegroundColor Yellow
            docker-compose ps
            
            Write-Host ""
            Write-Host "================================================" -ForegroundColor Green
            Write-Host "System started successfully!" -ForegroundColor Green
            Write-Host "================================================" -ForegroundColor Green
            Write-Host "Backend API: http://localhost:8000" -ForegroundColor White
            Write-Host "Frontend UI: http://localhost:3000" -ForegroundColor White
            Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
            Write-Host ""
            Write-Host "LAN Access:" -ForegroundColor Cyan
            Write-Host "- Backend API: http://[Your IP]:8000" -ForegroundColor White
            Write-Host "- Frontend UI: http://[Your IP]:3000" -ForegroundColor White
            Write-Host ""
            Write-Host "Management Commands:" -ForegroundColor Cyan
            Write-Host "- View logs: docker-compose logs -f" -ForegroundColor White
            Write-Host "- Stop services: docker-compose down" -ForegroundColor White
            Write-Host "- Restart services: docker-compose restart" -ForegroundColor White
            Write-Host ""
            Write-Host "To start ngrok tunnel, run: .\scripts\start-ngrok.ps1" -ForegroundColor Yellow
            Write-Host "================================================" -ForegroundColor Green
            
            Read-Host "Press any key to exit"
            exit 0
        } else {
            Write-Host "✗ Docker startup failed, switching to local mode" -ForegroundColor Red
            $useDocker = $false
        }
    }
}

# Local development mode
if (-not $useDocker) {
    Write-Host ""
    Write-Host "Using local development mode..." -ForegroundColor Cyan
    Write-Host ""
    
    # Create necessary directories
    $directories = @("novel_repo", "secrets", "logs")
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "Created directory: $dir" -ForegroundColor Yellow
        }
    }
    
    # Backend setup
    Write-Host "Setting up backend..." -ForegroundColor Yellow
    
    # Check if backend directory exists
    if (-not (Test-Path "backend")) {
        Write-Host "✗ Error: Backend directory not found!" -ForegroundColor Red
        Write-Host "Please ensure you're running this script from the project root directory." -ForegroundColor Yellow
        Read-Host "Press any key to exit"
        exit 1
    }
    
    # Check and setup virtual environment in project root
    if (Test-Path "venv\Scripts\Activate.ps1") {
        Write-Host "Activating project virtual environment..." -ForegroundColor Yellow
        & "venv\Scripts\Activate.ps1"
    } else {
        Write-Host "Creating project virtual environment..." -ForegroundColor Yellow
        python -m venv venv
        
        Write-Host "Activating virtual environment..." -ForegroundColor Yellow
        & "venv\Scripts\Activate.ps1"
        
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        pip install -r backend\requirements.txt
    }
    
    # Start backend service
    Write-Host "Starting backend service..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal
    
    # Wait for backend to start
    Write-Host "Waiting for backend service to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Frontend setup
    Write-Host "Setting up frontend..." -ForegroundColor Yellow
    
    # Check if frontend directory exists
    if (-not (Test-Path "frontend")) {
        Write-Host "✗ Error: Frontend directory not found!" -ForegroundColor Red
        Write-Host "Please ensure you're running this script from the project root directory." -ForegroundColor Yellow
        Read-Host "Press any key to exit"
        exit 1
    }
    
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    
    Write-Host "Starting frontend service..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal
    
    Set-Location ..
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "Local development mode started successfully!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "Backend API: http://localhost:8000" -ForegroundColor White
    Write-Host "Frontend UI: http://localhost:3000" -ForegroundColor White
    Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "LAN Access:" -ForegroundColor Cyan
    Write-Host "- Backend API: http://[Your IP]:8000" -ForegroundColor White
    Write-Host "- Frontend UI: http://[Your IP]:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Management Notes:" -ForegroundColor Cyan
    Write-Host "- Backend service runs in separate PowerShell window" -ForegroundColor White
    Write-Host "- Frontend service runs in separate PowerShell window" -ForegroundColor White
    Write-Host "- Close corresponding window to stop service" -ForegroundColor White
    Write-Host "- Virtual environment: .\venv\Scripts\Activate.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "To start ngrok tunnel, run: .\scripts\start-ngrok.ps1" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Green
}

Read-Host "Press any key to exit"
