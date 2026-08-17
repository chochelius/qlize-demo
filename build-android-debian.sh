#!/usr/bin/env bash
# ==============================================================================
# QLIZE | Cyber-Zen Vectorial — Script de Compilación Android para Debian 12
# Automatiza la preparación del entorno, build web, sync y generación de APK/AAB
# ==============================================================================

set -euo pipefail

# Colores para la salida en terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          QLIZE • COMPILADOR ANDROID PARA DEBIAN 12        ║"
echo "║             Empaquetado Nativo con Capacitor              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

BUILD_TYPE="${1:-debug}" # Opciones: debug, release, bundle, all

# ------------------------------------------------------------------------------
# 1. Verificación de Dependencias del Sistema
# ------------------------------------------------------------------------------
echo -e "${BLUE}[1/6] Verificando dependencias del sistema...${NC}"

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}✘ Falta el comando requerido: $1${NC}"
        return 1
    fi
    return 0
}

MISSING_DEPS=0
check_cmd "node" || MISSING_DEPS=1
check_cmd "npm" || MISSING_DEPS=1
check_cmd "java" || MISSING_DEPS=1

if ! command -v javac &> /dev/null; then
    echo -e "${RED}✘ Falta el compilador Java ('javac'). Tienes instalado solo el JRE en vez del JDK.${NC}"
    echo -e "${YELLOW}ℹ Para instalar el JDK completo en Debian 12, ejecuta:${NC}"
    echo -e "  sudo apt update && sudo apt install -y openjdk-21-jdk"
    echo -e "  (o sudo apt install -y openjdk-17-jdk)"
    MISSING_DEPS=1
fi

if [ $MISSING_DEPS -ne 0 ]; then
    echo -e "\n${YELLOW}ℹ Dependencias requeridas en Debian 12:${NC}"
    echo -e "  sudo apt update && sudo apt install -y openjdk-21-jdk curl unzip git"
    echo -e "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo -e "  sudo apt install -y nodejs"
    exit 1
fi

# Configuración y auto-detección de JAVA_HOME apuntando al JDK con compilador
if [ -z "${JAVA_HOME:-}" ] || [ ! -f "${JAVA_HOME}/bin/javac" ]; then
    if command -v javac &> /dev/null; then
        JAVAC_REAL_PATH=$(readlink -f "$(which javac)")
        export JAVA_HOME="$(dirname "$(dirname "$JAVAC_REAL_PATH")")"
    fi
fi

if [ -n "${JAVA_HOME:-}" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
fi

# Verificar versión de Java (se requiere Java 17 o 21 para AGP 8+)
JAVA_VER=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}' | cut -d'.' -f1)
if [ -z "$JAVA_VER" ] || [ "$JAVA_VER" = "1" ]; then
    JAVA_VER=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}' | cut -d'.' -f2)
fi

JAVAC_VER=$(javac -version 2>&1 | awk '{print $2}')

echo -e "  ✓ Node.js: $(node -v)"
echo -e "  ✓ npm: v$(npm -v)"
echo -e "  ✓ Java Runtime: Versión ${JAVA_VER}"
echo -e "  ✓ Java Compiler (javac): Versión ${JAVAC_VER:-$JAVA_VER}"
if [ -n "${JAVA_HOME:-}" ]; then
    echo -e "  ✓ JAVA_HOME: ${GREEN}${JAVA_HOME}${NC}"
fi

# ------------------------------------------------------------------------------
# 2. Verificación de ANDROID_HOME / ANDROID_SDK_ROOT
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[2/6] Verificando Android SDK...${NC}"

if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
    # Intentar ubicaciones estándar
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
    elif [ -d "$HOME/android-sdk" ]; then
        export ANDROID_HOME="$HOME/android-sdk"
    elif [ -d "/usr/lib/android-sdk" ]; then
        export ANDROID_HOME="/usr/lib/android-sdk"
    elif [ -d "/opt/android-sdk" ]; then
        export ANDROID_HOME="/opt/android-sdk"
    fi
fi

if [ -n "${ANDROID_HOME:-}" ]; then
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/bin:$PATH"
    echo -e "  ✓ ANDROID_HOME configurado en: ${GREEN}$ANDROID_HOME${NC}"
else
    echo -e "${YELLOW}⚠ Advertencia: ANDROID_HOME no está definido.${NC}"
    echo -e "  Si Gradle tiene el SDK configurado en 'local.properties' o en Android Studio, continuará."
    echo -e "  Para configurar el SDK manualmente en Debian 12:"
    echo -e "    export ANDROID_HOME=\$HOME/Android/Sdk"
    echo -e "    export PATH=\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH"
fi

# ------------------------------------------------------------------------------
# 3. Instalación y Build de la Aplicación Web
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[3/6] Compilando recursos web con Vite...${NC}"

if [ ! -d "node_modules" ]; then
    echo "  Instalando dependencias de npm..."
    npm install
fi

npm run build

# ------------------------------------------------------------------------------
# 4. Sincronización con el Proyecto Nativo de Capacitor
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[4/6] Sincronizando assets nativos con Capacitor...${NC}"
npx cap sync android

# Limpiar cualquier binario .apk que haya sido copiado a los assets nativos
rm -f android/app/src/main/assets/public/*.apk

# Asegurar permisos de ejecución en gradlew
chmod +x android/gradlew

# ------------------------------------------------------------------------------
# 5. Compilación del Proyecto Android con Gradle
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[5/6] Ejecutando Gradle (Tipo de build: ${BUILD_TYPE})...${NC}"

cd android

case "$BUILD_TYPE" in
    debug)
        echo "  Compilando APK de depuración (Debug APK)..."
        ./gradlew assembleDebug
        OUTPUT_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
        ;;
    release)
        echo "  Compilando APK de producción (Release APK)..."
        ./gradlew assembleRelease
        OUTPUT_PATH="android/app/build/outputs/apk/release/app-release-unsigned.apk"
        ;;
    bundle)
        echo "  Generando Android App Bundle (.aab) para Google Play..."
        ./gradlew bundleRelease
        OUTPUT_PATH="android/app/build/outputs/bundle/release/app-release.aab"
        ;;
    all)
        echo "  Compilando APK Debug, APK Release y Bundle AAB..."
        ./gradlew assembleDebug assembleRelease bundleRelease
        OUTPUT_PATH="android/app/build/outputs/"
        ;;
    *)
        echo -e "${RED}Opción inválida: $BUILD_TYPE${NC}"
        echo "Uso: ./build-android-debian.sh [debug|release|bundle|all]"
        exit 1
        ;;
esac

cd ..

# ------------------------------------------------------------------------------
# 6. Resumen de Salida & Distribución Web
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}       ✔ COMPILACIÓN FINALIZADA CON ÉXITO                  ${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "Paquete: ${CYAN}com.qlize.jump${NC}"
echo -e "Archivos generados en:"
echo -e "  👉 ${BOLD}${OUTPUT_PATH}${NC}\n"

# Copiar el APK generado a public/qlize.apk para distribución web
if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
    cp "android/app/build/outputs/apk/debug/app-debug.apk" "public/qlize.apk"
    echo -e "  ✓ APK copiado automáticamente a ${GREEN}public/qlize.apk${NC} para descarga web"
elif [ -f "android/app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
    cp "android/app/build/outputs/apk/release/app-release-unsigned.apk" "public/qlize.apk"
    echo -e "  ✓ APK copiado automáticamente a ${GREEN}public/qlize.apk${NC} para descarga web"
fi

if [ "$BUILD_TYPE" = "debug" ]; then
    echo -e "\n${YELLOW}Para instalar el APK en un dispositivo conectado por USB:${NC}"
    echo -e "  adb install -r ${OUTPUT_PATH}"
fi
