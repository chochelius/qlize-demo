using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace QLIZE.Windows;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm(args));
    }
}

public class MainForm : Form
{
    private readonly string[] _args;
    private WebView2 _webView = null!;
    private CoreWebView2Environment? _environment;
    private bool _isFullScreen = false;
    private FormBorderStyle _previousBorderStyle;
    private Rectangle _previousBounds;
    private FormWindowState _previousWindowState;

    // Mapa de recursos incrustados en el ensamblado (dist/)
    private static readonly Dictionary<string, string> EmbeddedResources = new(StringComparer.OrdinalIgnoreCase);

    // DWM API para Barra de Título Oscura Cyber-Zen (#02040a)
    [DllImport("dwmapi.dll", PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    private const int DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1 = 19;
    private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
    private const int DWMWA_CAPTION_COLOR = 35; // Windows 11 Build 22000+

    static MainForm()
    {
        IndexEmbeddedResources();
    }

    public MainForm(string[] args)
    {
        _args = args;
        InitializeWindow();
        InitializeWebViewAsync();
    }

    private static void IndexEmbeddedResources()
    {
        var assembly = Assembly.GetExecutingAssembly();
        foreach (var resourceName in assembly.GetManifestResourceNames())
        {
            // Normalizar separadores
            string normalized = resourceName.Replace('\\', '/');
            int distIndex = normalized.IndexOf("dist.", StringComparison.OrdinalIgnoreCase);
            if (distIndex >= 0)
            {
                string relativePath = "/" + normalized[(distIndex + 5)..];
                EmbeddedResources[relativePath] = resourceName;
            }
        }
    }

    private void InitializeWindow()
    {
        Text = "QLIZE | Cyber-Zen Vectorial";
        BackColor = Color.FromArgb(2, 4, 10); // #02040a
        ClientSize = new Size(480, 854);
        MinimumSize = new Size(360, 640);
        StartPosition = FormStartPosition.CenterScreen;

        // Cargar icono si está disponible
        try
        {
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
            if (File.Exists(iconPath))
            {
                Icon = new Icon(iconPath);
            }
        }
        catch
        {
            // Ignorar si no se puede cargar el icono
        }

        // Aplicar modo oscuro a la barra de título de Windows
        ApplyDarkTitleBar();

        // Control WebView2
        _webView = new WebView2
        {
            Dock = DockStyle.Fill,
            DefaultBackgroundColor = Color.FromArgb(2, 4, 10) // Evita parpadeo blanco
        };
        Controls.Add(_webView);
    }

    private void ApplyDarkTitleBar()
    {
        try
        {
            int useDarkMode = 1;
            if (DwmSetWindowAttribute(Handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref useDarkMode, sizeof(int)) != 0)
            {
                DwmSetWindowAttribute(Handle, DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1, ref useDarkMode, sizeof(int));
            }

            // Color del caption: 0x00BBGGRR -> para #02040a es 0x000a0402
            int captionColor = 0x000a0402;
            DwmSetWindowAttribute(Handle, DWMWA_CAPTION_COLOR, ref captionColor, sizeof(int));
        }
        catch
        {
            // DWM no disponible en entornos limitados
        }
    }

    private async void InitializeWebViewAsync()
    {
        try
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            // Detección de Modo Portable (USB / Carpeta aislada)
            bool isPortable = HasArg("--portable") ||
                              Directory.Exists(Path.Combine(baseDir, "data")) ||
                              File.Exists(Path.Combine(baseDir, "portable.lock"));

            string userDataFolder = isPortable
                ? Path.Combine(baseDir, "data", "WebView2Data")
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "QLIZE", "WebView2Data");

            if (isPortable && !Directory.Exists(userDataFolder))
            {
                Directory.CreateDirectory(userDataFolder);
            }

            _environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await _webView.EnsureCoreWebView2Async(_environment);

            bool isDevMode = HasArg("--dev");
            bool isDebugMode = isDevMode || HasArg("--debug");
            string? customUrl = GetArgValue("--url");

            // Configuración de seguridad y UI de WebView2
            _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = isDebugMode;
            _webView.CoreWebView2.Settings.AreDevToolsEnabled = isDebugMode;
            _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = isDebugMode;

            // Inyectar listener de pantalla completa en el DOM
            await _webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(@"
                window.addEventListener('keydown', function(e) {
                    if (e.key === 'F11' || (e.altKey && e.key === 'Enter')) {
                        e.preventDefault();
                        window.chrome.webview.postMessage({ action: 'toggle_fullscreen' });
                    }
                }, true);
            ");

            _webView.CoreWebView2.WebMessageReceived += (sender, args) =>
            {
                try
                {
                    string message = args.TryGetWebMessageAsString();
                    if (message.Contains("toggle_fullscreen"))
                    {
                        ToggleFullScreen();
                    }
                }
                catch
                {
                    // Ignorar mensajes no reconocidos
                }
            };

            if (!string.IsNullOrEmpty(customUrl))
            {
                _webView.CoreWebView2.Navigate(customUrl);
            }
            else if (isDevMode)
            {
                string devUrl = "http://localhost:5173";
                _webView.CoreWebView2.Navigate(devUrl);
            }
            else
            {
                // Modo Producción / Portable:
                string? distPath = FindDistFolder();
                if (distPath != null && Directory.Exists(distPath))
                {
                    // Opción A: Servir desde carpeta física dist/
                    _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                        "qlize.local",
                        distPath,
                        CoreWebView2HostResourceAccessKind.Allow
                    );
                    _webView.CoreWebView2.Navigate("https://qlize.local/index.html");
                }
                else if (EmbeddedResources.Count > 0)
                {
                    // Opción B (100% Portable Single-File): Servir desde recursos incrustados en memoria
                    _webView.CoreWebView2.AddWebResourceRequestedFilter("https://qlize.local/*", CoreWebView2WebResourceContext.All);
                    _webView.CoreWebView2.WebResourceRequested += CoreWebView2_WebResourceRequested;
                    _webView.CoreWebView2.Navigate("https://qlize.local/index.html");
                }
                else
                {
                    RenderDistNotFoundPage();
                }
            }
        }
        catch (Exception ex)
        {
            RenderErrorPage(ex.Message);
        }
    }

    private void CoreWebView2_WebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
    {
        if (_environment == null) return;

        try
        {
            var uri = new Uri(e.Request.Uri);
            string path = uri.AbsolutePath;
            if (string.IsNullOrEmpty(path) || path == "/")
            {
                path = "/index.html";
            }

            // Desescapar caracteres URL (ej. espacios o caracteres especiales)
            path = Uri.UnescapeDataString(path);

            if (EmbeddedResources.TryGetValue(path, out string? resourceName))
            {
                var assembly = Assembly.GetExecutingAssembly();
                var stream = assembly.GetManifestResourceStream(resourceName);
                if (stream != null)
                {
                    string mimeType = GetMimeType(path);
                    var response = _environment.CreateWebResourceResponse(
                        stream,
                        200,
                        "OK",
                        $"Content-Type: {mimeType}\r\nAccess-Control-Allow-Origin: *"
                    );
                    e.Response = response;
                    return;
                }
            }

            // Recurso no encontrado en memoria
            var notFoundResponse = _environment.CreateWebResourceResponse(
                new MemoryStream(),
                404,
                "Not Found",
                "Content-Type: text/plain"
            );
            e.Response = notFoundResponse;
        }
        catch (Exception ex)
        {
            var errorResponse = _environment.CreateWebResourceResponse(
                new MemoryStream(System.Text.Encoding.UTF8.GetBytes(ex.Message)),
                500,
                "Internal Server Error",
                "Content-Type: text/plain"
            );
            e.Response = errorResponse;
        }
    }

    private static string GetMimeType(string path)
    {
        string ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".html" or ".htm" => "text/html; charset=utf-8",
            ".js" or ".mjs" => "application/javascript; charset=utf-8",
            ".css" => "text/css; charset=utf-8",
            ".json" or ".webmanifest" => "application/json; charset=utf-8",
            ".svg" => "image/svg+xml",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".ico" => "image/x-icon",
            ".mp3" => "audio/mpeg",
            ".ogg" => "audio/ogg",
            ".wav" => "audio/wav",
            ".woff2" => "font/woff2",
            ".woff" => "font/woff",
            ".ttf" => "font/ttf",
            ".otf" => "font/otf",
            _ => "application/octet-stream"
        };
    }

    private string? FindDistFolder()
    {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string[] candidates =
        [
            Path.Combine(baseDir, "dist"),
            Path.Combine(baseDir, "..", "dist"),
            Path.Combine(baseDir, "..", "..", "..", "..", "dist"),
            Path.Combine(Directory.GetCurrentDirectory(), "dist")
        ];

        foreach (var path in candidates)
        {
            try
            {
                string fullPath = Path.GetFullPath(path);
                if (Directory.Exists(fullPath) && File.Exists(Path.Combine(fullPath, "index.html")))
                {
                    return fullPath;
                }
            }
            catch
            {
                // Continuar buscando
            }
        }

        return null;
    }

    private void ToggleFullScreen()
    {
        if (InvokeRequired)
        {
            Invoke(new Action(ToggleFullScreen));
            return;
        }

        if (!_isFullScreen)
        {
            _previousBounds = Bounds;
            _previousBorderStyle = FormBorderStyle;
            _previousWindowState = WindowState;

            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Normal;
            Bounds = Screen.FromControl(this).Bounds;
            _isFullScreen = true;
        }
        else
        {
            FormBorderStyle = _previousBorderStyle;
            WindowState = _previousWindowState;
            Bounds = _previousBounds;
            _isFullScreen = false;
        }
    }

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == Keys.F11 || keyData == (Keys.Alt | Keys.Enter))
        {
            ToggleFullScreen();
            return true;
        }
        return base.ProcessCmdKey(ref msg, keyData);
    }

    private bool HasArg(string flag)
    {
        return Array.Exists(_args, a => string.Equals(a, flag, StringComparison.OrdinalIgnoreCase));
    }

    private string? GetArgValue(string flag)
    {
        for (int i = 0; i < _args.Length - 1; i++)
        {
            if (string.Equals(_args[i], flag, StringComparison.OrdinalIgnoreCase))
            {
                return _args[i + 1];
            }
        }
        return null;
    }

    private void RenderDistNotFoundPage()
    {
        string html = """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  margin: 0; padding: 40px 20px;
                  background-color: #02040a; color: #f5f5f7;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex; flex-direction: column; align-items: center; justify-content: center;
                  height: 80vh; text-align: center;
                }
                h1 { color: #e2b13c; font-size: 1.8rem; letter-spacing: 2px; margin-bottom: 12px; }
                p { color: #8a8d9b; font-size: 0.95rem; line-height: 1.6; max-width: 360px; }
                code { background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 4px; color: #2bb382; font-family: monospace; }
                .btn { margin-top: 24px; padding: 10px 20px; background: #e2b13c; color: #02040a; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
              </style>
            </head>
            <body>
              <h1>QLIZE • PORT WINDOWS</h1>
              <p>No se encontraron los recursos de <code>dist/</code> compilados ni incrustados.</p>
              <p>Para generar los archivos del juego, ejecuta en la terminal:</p>
              <p><code>npm run build</code></p>
              <p>O compila la versión portable con:</p>
              <p><code>npm run build:windows:portable</code></p>
            </body>
            </html>
            """;
        _webView.NavigateToString(html);
    }

    private void RenderErrorPage(string error)
    {
        string encodedError = System.Net.WebUtility.HtmlEncode(error);
        string template = """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  margin: 0; padding: 40px 20px;
                  background-color: #02040a; color: #f5f5f7;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex; flex-direction: column; align-items: center; justify-content: center;
                  height: 80vh; text-align: center;
                }
                h1 { color: #d32f2f; font-size: 1.6rem; letter-spacing: 2px; }
                p { color: #8a8d9b; font-size: 0.9rem; }
                pre { background: rgba(211,47,47,0.1); color: #ff8a80; padding: 12px; border-radius: 6px; max-width: 380px; overflow: auto; text-align: left; font-size: 0.8rem; }
              </style>
            </head>
            <body>
              <h1>ERROR DE INICIALIZACIÓN</h1>
              <p>No se pudo iniciar el runtime de WebView2:</p>
              <pre>{{ERROR_MESSAGE}}</pre>
            </body>
            </html>
            """;
        _webView.NavigateToString(template.Replace("{{ERROR_MESSAGE}}", encodedError));
    }
}
