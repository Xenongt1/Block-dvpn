# Check if running with admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Restarting script with administrator privileges..."
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "Running with administrator privileges..."

# Function to check if port is in use
function Test-PortInUse {
    param($port)
    $listener = $null
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
        $listener.Start()
        return $false
    }
    catch {
        return $true
    }
    finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

# Kill any existing Node.js processes
Write-Host "Stopping existing Node.js processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait for port 3006 to be available
Write-Host "Waiting for port 3006 to be available..."
$maxAttempts = 10
$attempts = 0
while ((Test-PortInUse -port 3006) -and ($attempts -lt $maxAttempts)) {
    Write-Host "Port 3006 is still in use. Waiting..."
    Start-Sleep -Seconds 2
    $attempts++
}

if ($attempts -eq $maxAttempts) {
    Write-Host "Error: Port 3006 is still in use after maximum attempts. Please check for blocking processes."
    exit 1
}

# Navigate to the backend directory
Set-Location $PSScriptRoot

# Start the backend server
Write-Host "Starting backend server..."
npm run dev 