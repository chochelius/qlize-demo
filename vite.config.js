import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';
import path from 'path';
import { recordSession, recordEvent, recordFeedback } from './server/qa-backend.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isQAMode = env.MODO_QA === 'true' || env.VITE_MODO_QA === 'true';

  const apkPlugin = () => ({
    name: 'vite-plugin-apk-serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/qlize.apk' || req.url?.endsWith('.apk')) {
          const apkName = req.url.replace(/^\//, '').split('?')[0];
          const apkPath = path.resolve(process.cwd(), 'public', apkName);

          if (fs.existsSync(apkPath)) {
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', `attachment; filename="${apkName}"`);
            return fs.createReadStream(apkPath).pipe(res);
          } else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.end('El archivo APK no se encuentra en el servidor. Compila el APK primero con ./build-android-debian.sh');
          }
        }
        next();
      });
    }
  });

  const qaPlugin = () => ({
    name: 'vite-plugin-qa-telemetry',
    configureServer(server) {
      if (!isQAMode) return;

      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/api/qa/')) {
          return next();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const data = body ? JSON.parse(body) : {};

            if (req.url === '/api/qa/session') {
              recordSession(data.sessionId, data.userAgent || req.headers['user-agent']);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (req.url === '/api/qa/event') {
              recordEvent(data);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (req.url === '/api/qa/feedback') {
              recordFeedback(data);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            res.statusCode = 404;
            res.end('Not Found');
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  });

  return {
    define: {
      __MODO_QA__: JSON.stringify(isQAMode),
    },
    plugins: isQAMode ? [apkPlugin(), qaPlugin()] : [apkPlugin()],
    server: {
      allowedHosts: ['demo.qlize.site'],
    },
  };
});
