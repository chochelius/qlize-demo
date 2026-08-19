# ==============================================================================
# QLIZE | Cyber-Zen Vectorial — Script de Compilación para Windows
# Empaqueta la versión de escritorio nativa ultraliviana y portable (.NET 10 + WebView2)
# ==============================================================================

[CmdletBinding()]
param (
    [ValidateSet("Release", "Debug")]
    [string]$Configuration = "Release",

    [switch]$Portable,
    [switch]$SingleFile,
    [switch]$SkipWebBuild
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          QLIZE * COMPILADOR NATIVO PARA WINDOWS           " -ForegroundColor Yellow
if ($Portable) {
    Write-Host "       Generando Version Portable Autocontenida (.exe)      " -ForegroundColor Green
} else {
    Write-Host "        Empaquetado Liviano con .NET 10 + WebView2         " -ForegroundColor Cyan
}
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------------
# 1. Verificación de Dependencias
# ------------------------------------------------------------------------------
Write-Host "[1/5] Verificando herramientas del sistema..." -ForegroundColor Blue

function Check-Tool ($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "Error: No se encontro el comando '$name' en el PATH." -ForegroundColor Red
        exit 1
    }
}

Check-Tool "node"
Check-Tool "npm"
Check-Tool "dotnet"

$dotnetVersion = (dotnet --version).Trim()
Write-Host "  * Node.js: $((node --version).Trim())" -ForegroundColor DarkGray
Write-Host "  * .NET SDK: $dotnetVersion" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 2. Compilación del Frontend Web (dist/)
# ------------------------------------------------------------------------------
if (-not $SkipWebBuild) {
    Write-Host "`n[2/5] Compilando frontend web (Vite)..." -ForegroundColor Blue
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error al compilar el frontend con Vite." -ForegroundColor Red
        exit $LASTEXITCODE
    }
} else {
    Write-Host "`n[2/5] Omitiendo compilacion web (-SkipWebBuild)..." -ForegroundColor DarkGray
}

if (-not (Test-Path "dist/index.html")) {
    Write-Host "Error: dist/index.html no existe. Compila el frontend primero." -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# 3. Publicación del Proyecto .NET 10
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Publicando binario nativo de Windows ($Configuration)..." -ForegroundColor Blue

$OutputDir = Join-Path $PSScriptRoot "dist-windows"
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$publishArgs = @(
    "publish",
    "windows/QLIZE.Windows.csproj",
    "-c", $Configuration,
    "--nologo"
)

if ($Portable) {
    # Publicación 100% Autocontenida (Self-Contained Single-File)
    $publishArgs += @(
        "-r", "win-x64",
        "--self-contained", "true",
        "-p:PublishSingleFile=true",
        "-p:IncludeNativeLibrariesForSelfExtract=true",
        "-p:EnableCompressionInSingleFile=true",
        "-o", $OutputDir
    )
} elseif ($SingleFile) {
    # Publicación Framework-Dependent Single-File
    $publishArgs += @(
        "-r", "win-x64",
        "--self-contained", "false",
        "-p:PublishSingleFile=true",
        "-o", $OutputDir
    )
} else {
    # Publicación Estándar de Carpeta Distribuible
    $publishArgs += @(
        "-o", $OutputDir
    )
}

dotnet @publishArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error durante dotnet publish." -ForegroundColor Red
    exit $LASTEXITCODE
}

# ------------------------------------------------------------------------------
# 4. Sincronización de Assets Web / Renombrado Portable
# ------------------------------------------------------------------------------
Write-Host "`n[4/5] Organizando paquete de distribucion..." -ForegroundColor Blue

$exePath = Join-Path $OutputDir "QLIZE.exe"

if ($Portable) {
    $portableExePath = Join-Path $OutputDir "QLIZE-Portable.exe"
    if (Test-Path $exePath) {
        Move-Item -Path $exePath -Destination $portableExePath -Force
    }
    # Limpiar archivos .pdb / .xml temporales generados por la publicación
    Get-ChildItem -Path $OutputDir -Include "*.pdb", "*.xml" -File | Remove-Item -Force -ErrorAction SilentlyContinue
    $targetExe = $portableExePath
} else {
    # En versión estándar de carpeta, copiar dist/ al lado del ejecutable para permitir modding/edición directa
    $destDist = Join-Path $OutputDir "dist"
    Copy-Item -Path "dist" -Destination $destDist -Recurse -Force
    $targetExe = $exePath
}

# ------------------------------------------------------------------------------
# 5. Resumen de Salida
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Validando paquete de distribucion..." -ForegroundColor Blue

if (Test-Path $targetExe) {
    $exeSize = (Get-Item $targetExe).Length / 1MB
    $totalSize = (Get-ChildItem $OutputDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  * COMPILACION EXITOSA DE QLIZE PARA WINDOWS!              " -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  * Ejecutable:     $targetExe" -ForegroundColor White
    Write-Host "  * Tamano binario: $([math]::Round($exeSize, 2)) MB" -ForegroundColor White
    if (-not $Portable) {
        Write-Host "  * Tamano total:   $([math]::Round($totalSize, 2)) MB (incluye assets web)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Para ejecutar la aplicacion:" -ForegroundColor Yellow
    if ($Portable) {
        Write-Host "  powershell -Command `"Start-Process '$targetExe'`"" -ForegroundColor Cyan
    } else {
        Write-Host "  npm run windows:open" -ForegroundColor Cyan
    }
    Write-Host ""
} else {
    Write-Host "Error: No se encontro el ejecutable en $targetExe" -ForegroundColor Red
    exit 1
}
