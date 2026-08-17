#!/bin/bash
# Generar keystore para firma de APK Android
# Este certificado es para desarrollo/distribución fuera de Google Play

set -e

KEYSTORE_FILE="android/qlize-release.keystore"
KEY_ALIAS="qlize-key"
KEY_PASSWORD="qlize2024"  # Cambiar en producción
STORE_PASSWORD="qlize2024"  # Cambiar en producción

echo "Generando keystore para firma de APK..."

if [ -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  El keystore ya existe: $KEYSTORE_FILE"
    echo "Si quieres regenerarlo, bórralo primero:"
    echo "  rm $KEYSTORE_FILE"
    exit 1
fi

keytool -genkeypair \
    -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$STORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=QLIZE, OU=Development, O=QLIZE, L=Santiago, ST=RM, C=CL"

echo ""
echo "✅ Keystore generado: $KEYSTORE_FILE"
echo ""
echo "⚠️  IMPORTANTE:"
echo "  - Guarda este archivo en un lugar seguro"
echo "  - NO lo subas a git (ya está en .gitignore)"
echo "  - Si lo pierdes, no podrás actualizar la app"
echo "  - Las contraseñas están en este script, cámbialas en producción"
echo ""
echo "Configuración agregada a android/app/build.gradle"
