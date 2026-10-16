<#
.SYNOPSIS
    Runs the Game Night backend (Spring Boot) and frontend (Angular) at the same time.

.DESCRIPTION
    Each server gets its own console window so their logs stay separate and readable, while this
    window waits and acts as the off switch: press Ctrl+C here and both are shut down together.

.EXAMPLE
    .\start-dev.ps1

.EXAMPLE
    .\start-dev.ps1 -FrontendPort 4300
    Serves the app on a different port, e.g. when 4200 is taken.
#>
[CmdletBinding()]
param(
    [string] $BackendPath = 'C:\Users\alvin\java-workspace\gameShows',
    [string] $FrontendPath = 'C:\Users\alvin\angular-workspace\projects\game-night',
    [int] $BackendPort = 8080,
    [int] $FrontendPort = 4200
)

$ErrorActionPreference = 'Stop'

function Test-PortInUse {
    param([int] $Port)
    $listening = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $listening
}

# The Angular CLI needs the workspace root (where angular.json lives), which is a few levels above
# the project folder, so accept either and walk up to find it.
function Find-AngularWorkspaceRoot {
    param([string] $StartPath)
    $dir = Get-Item -LiteralPath $StartPath
    while ($null -ne $dir) {
        if (Test-Path -LiteralPath (Join-Path $dir.FullName 'angular.json')) {
            return $dir.FullName
        }
        $dir = $dir.Parent
    }
    throw "No angular.json found in '$StartPath' or any parent folder."
}

function Start-DevServer {
    param([string] $Title, [string] $WorkingDirectory, [string] $Command)
    # `title` names the window; `|| pause` holds it open on a crash so the error stays readable
    # instead of the window vanishing.
    $cmdLine = '/c', ('title {0} && {1} || pause' -f $Title, $Command)
    return Start-Process -FilePath 'cmd.exe' -ArgumentList $cmdLine -WorkingDirectory $WorkingDirectory -PassThru
}

function Stop-DevServer {
    param([string] $Label, [System.Diagnostics.Process] $Process)
    if ($null -eq $Process -or $Process.HasExited) {
        return
    }
    Write-Host "  stopping $Label (PID $($Process.Id))"
    # /T because the real server is a grandchild (cmd -> mvnw/npx -> java/node).
    & taskkill.exe /PID $Process.Id /T /F 2>&1 | Out-Null
}

function Wait-ForUrl {
    param([string] $Url, [int] $TimeoutSeconds)
    for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    return $false
}

foreach ($path in @($BackendPath, $FrontendPath)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Path not found: $path"
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $BackendPath 'mvnw.cmd'))) {
    throw "No mvnw.cmd in '$BackendPath' - is that the backend project root?"
}

$workspaceRoot = Find-AngularWorkspaceRoot -StartPath $FrontendPath
$projectName = Split-Path -Leaf $FrontendPath

foreach ($port in @($BackendPort, $FrontendPort)) {
    if (Test-PortInUse -Port $port) {
        throw "Port $port is already in use - something is still running. Stop it and try again."
    }
}

Write-Host ''
Write-Host 'Game Night' -ForegroundColor Cyan
Write-Host "  backend   $BackendPath"
Write-Host "  frontend  $projectName (workspace $workspaceRoot)"
Write-Host ''

$backend = $null
$frontend = $null
try {
    Write-Host 'Starting backend...'
    $backend = Start-DevServer -Title 'Game Night backend' -WorkingDirectory $BackendPath `
        -Command '.\mvnw.cmd spring-boot:run'

    Write-Host 'Starting frontend...'
    $frontend = Start-DevServer -Title 'Game Night frontend' -WorkingDirectory $workspaceRoot `
        -Command ('npx ng serve {0} --port {1}' -f $projectName, $FrontendPort)

    if (Wait-ForUrl -Url "http://localhost:$BackendPort/actuator/health" -TimeoutSeconds 90) {
        Write-Host "  API ready   http://localhost:$BackendPort" -ForegroundColor Green
    } else {
        Write-Warning "Backend didn't answer on port $BackendPort - check its window."
    }

    if (Wait-ForUrl -Url "http://localhost:$FrontendPort/" -TimeoutSeconds 120) {
        Write-Host "  App ready   http://localhost:$FrontendPort" -ForegroundColor Green
    } else {
        Write-Warning "Frontend didn't answer on port $FrontendPort - check its window."
    }

    Write-Host ''
    Write-Host 'Both running. Press Ctrl+C here to stop them.' -ForegroundColor Cyan

    while (-not ($backend.HasExited -and $frontend.HasExited)) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ''
    Write-Host 'Shutting down...'
    Stop-DevServer -Label 'frontend' -Process $frontend
    Stop-DevServer -Label 'backend' -Process $backend
    Write-Host 'Done.'
}
