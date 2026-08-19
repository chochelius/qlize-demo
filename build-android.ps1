<#
.SYNOPSIS
    Compilador y empaquetador de QLIZE para Android en Windows PowerShell.
.DESCRIPTION
    Automatiza la verificación de Java/Android SDK, build web con Vite, sincronización
    con Capacitor y generación del Android App Bundle (.aab) o APK firmado para Google Play Store.
.PARAMETER Bundle
    Genera el Android App Bundle (.aab) listo para Google Play Console (por defecto).
.PARAMETER Release
    Genera el APK Release para pruebas directas en dispositivo.
.PARAMETER Debug
    Genera el APK Debug para desarrollo.
.PARAMETER Clean
    Limpia los directorios de build antes de compilar.
#>
param(
    [switch]$Bundle,
    [switch]$Release,
    [switch]$Debug,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   QLIZE | Cyber-Zen Vectorial - Compilador Android (Windows)  " -ForegroundColor Cyan
Write-Host "          Generador de Android App Bundle (.aab) & APK         " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificación y Configuración de Java JDK
Write-Host "[1/5] Verificando entorno Java..." -ForegroundColor Yellow

if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\javac.exe")) {
    $defaultJdk = "C:\Program Files\Java\jdk-21.0.12"
    if (Test-Path "$defaultJdk\bin\javac.exe") {
        $env:JAVA_HOME = $defaultJdk
    } else {
        $foundJdk = Get-ChildItem "C:\Program Files\Java" -Directory -Filter "jdk*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundJdk -and (Test-Path "$($foundJdk.FullName)\bin\javac.exe")) {
            $env:JAVA_HOME = $foundJdk.FullName
        }
    }
}

if (-not $env:JAVA_HOME) {
    Write-Host "ERROR: No se encontró un JDK de Java (javac). Instala JDK 17 o 21." -ForegroundColor Red
    exit 1
}

$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Write-Host "  OK Java JDK: $env:JAVA_HOME" -ForegroundColor Green

# 2. Verificación de Android SDK
Write-Host "
[2/5] Verificando Android SDK..." -ForegroundColor Yellow
if (-not $env:ANDROID_HOME) {
    $defaultSdk = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $defaultSdk) {
        $env:ANDROID_HOME = $defaultSdk
    }
}

if ($env:ANDROID_HOME) {
    Write-Host "  OK Android SDK: $env:ANDROID_HOME" -ForegroundColor Green
    if (-not (Test-Path "android\local.properties")) {
        $escapedPath = $env:ANDROID_HOME.Replace("\", "\\")
        Set-Content -Path "android\local.properties" -Value "sdk.dir=$escapedPath"
    }
} else {
    Write-Host "  ADVERTENCIA: ANDROID_HOME no está definido en variables de entorno." -ForegroundColor Yellow
}

# 3. Compilación de recursos Web (Vite)
Write-Host "
[3/5] Compilando aplicación web con Vite..." -ForegroundColor Yellow
$env:VITE_MODO_QA = "false"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló 'npm run build'." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 4. Sincronización con Capacitor Android
Write-Host "
[4/5] Sincronizando assets nativos con Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló 'npx cap sync android'." -ForegroundColor Red
    exit $LASTEXITCODE
}

# Limpiar archivos .apk viejos dentro de los assets copiados
if (Test-Path "android\app\src\main\assets\public\*.apk") {
    Remove-Item "android\app\src\main\assets\public\*.apk" -Force -ErrorAction SilentlyContinue
}

# 5. Compilación con Gradle
Write-Host "
[5/5] Ejecutando Gradle..." -ForegroundColor Yellow

if (-not (Test-Path "release")) {
    New-Item -ItemType Directory -Path "release" | Out-Null
}

Push-Location "android"

try {
    if ($Clean) {
        Write-Host "  Limpiando proyecto..." -ForegroundColor Gray
        .\gradlew.bat clean --console=plain
    }

    if ($Release) {
        Write-Host "  Generando APK de Release..." -ForegroundColor Cyan
        .\gradlew.bat assembleRelease --console=plain
        $srcApk = "app\build\outputs\apk\release\app-release.apk"
        if (-not (Test-Path $srcApk)) {
            $srcApk = "app\build\outputs\apk\release\app-release-unsigned.apk"
        }
        Pop-Location
        if (Test-Path "android\$srcApk") {
            Copy-Item "android\$srcApk" "release\QLIZE-v1.0.0.apk" -Force
            Copy-Item "android\$srcApk" "public\qlize.apk" -Force
            Write-Host "
================================================================" -ForegroundColor Green
            Write-Host "  COMPILACION EXITOSA!" -ForegroundColor Green
            Write-Host "  APK generado en: release\QLIZE-v1.0.0.apk" -ForegroundColor Green
            Write-Host "================================================================" -ForegroundColor Green
        }
    } elseif ($Debug) {
        Write-Host "  Generando APK de Debug..." -ForegroundColor Cyan
        .\gradlew.bat assembleDebug --console=plain
        Pop-Location
        Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" "release\QLIZE-v1.0.0-debug.apk" -Force
        Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" "public\qlize.apk" -Force
        Write-Host "
================================================================" -ForegroundColor Green
        Write-Host "  COMPILACION EXITOSA!" -ForegroundColor Green
        Write-Host "  APK Debug generado en: release\QLIZE-v1.0.0-debug.apk" -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Green
    } else {
        # Por defecto: Generar Android App Bundle (.aab) para Google Play
        Write-Host "  Generando Android App Bundle (.aab) para Google Play Store..." -ForegroundColor Cyan
        .\gradlew.bat bundleRelease --console=plain
        $srcAab = "app\build\outputs\bundle\release\app-release.aab"
        Pop-Location
        if (Test-Path "android\$srcAab") {
            Copy-Item "android\$srcAab" "release\QLIZE-v1.0.0.aab" -Force
            $item = Get-Item "release\QLIZE-v1.0.0.aab"
            $sizeMb = [math]::Round($item.Length / 1MB, 2)
            Write-Host "
================================================================" -ForegroundColor Green
            Write-Host "  BUNDLE PARA GOOGLE PLAY GENERADO CON EXITO!" -ForegroundColor Green
            Write-Host "  Archivo: release\QLIZE-v1.0.0.aab ($sizeMb MB)" -ForegroundColor Green
            Write-Host "  Listo para subir a Google Play Console (Prueba Cerrada / Producción)" -ForegroundColor Cyan
            Write-Host "================================================================" -ForegroundColor Green
        } else {
            Write-Host "ERROR: No se encontró el archivo .aab generado." -ForegroundColor Red
            exit 1
        }
    }
}
catch {
    Pop-Location
    Write-Host "ERROR durante la compilación: $_" -ForegroundColor Red
    exit 1
}
