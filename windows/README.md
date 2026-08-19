# QLIZE — Port Nativo & Portable para Windows (.NET 10 + WebView2)

Port de escritorio ultraliviano y 100% portable para Windows 10/11 basado en **Microsoft Edge WebView2** y **.NET 10**.

## Características
- **100% Portable (Single-File `.exe`)**: Opción de empaquetar el juego completo (código, música MP3, fuentes y gráficos vectoriales) dentro de un único archivo `.exe` ejecutable en cualquier PC sin carpetas adyacentes ni instalación.
- **Modo USB / Datos Aislados**: Si existe una carpeta `data/` junto al ejecutable o se ejecuta con el parámetro `--portable`, todo el progreso, medallas y ajustes se guardan en la carpeta local sin tocar `%LOCALAPPDATA%` ni el registro de Windows.
- **Aceleración por Hardware**: Renderizado Direct3D / WebGL2 completo y Web Audio API a 60/120 FPS.
- **Estética Cyber-Zen**: Ventana centrada en proporción vertical (450×800), barra de título oscura inmersiva (`#02040a`) y fondo sin parpadeos blancos.
- **Soporte de Pantalla Completa**: Alterna pantalla completa sin bordes mediante `F11` o `Alt + Enter`.

## Modos de Ejecución

### 1. Modo Desarrollo (Hot Reload)
Inicia el juego conectado al servidor de desarrollo de Vite con recarga en vivo:
```powershell
# Terminal 1 (Servidor Vite):
npm run dev

# Terminal 2 (Ventana Windows):
npm run windows:dev
```

### 2. Compilación Estándar (Carpeta Distribuible)
Compila el bundle web y genera la versión con assets en `dist-windows/`:
```powershell
npm run build:windows
```

### 3. Compilación 100% Portable (Single-File .exe Autocontenido)
Genera `dist-windows/QLIZE-Portable.exe` con todos los recursos y el runtime autocontenido listo para distribuir:
```powershell
npm run build:windows:portable
```

## Modo USB / Pendrive
Para llevar QLIZE en un pendrive o disco externo:
1. Copia `QLIZE-Portable.exe` a tu pendrive.
2. Crea una carpeta llamada `data` en la misma ubicación del archivo.
3. Al ejecutar el juego, todas las partidas y configuraciones se guardarán dentro de `data/WebView2Data/` sin dejar rastro en el ordenador.

## Argumentos de Línea de Comandos
- `--dev`: Se conecta a `http://localhost:5173`.
- `--portable`: Fuerza el guardado de datos en `./data/`.
- `--url <url>`: Se conecta a una URL personalizada.
- `--debug`: Habilita herramientas de desarrollo (F12) y menú contextual.
