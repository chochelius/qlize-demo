import { defineConfig, loadEnv } from 'vite';
import { recordSession, recordEvent, recordFeedback } from './server/qa-backend.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isQAMode = env.MODO_QA === 'true' || env.VITE_MODO_QA === 'true';

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
    plugins: isQAMode ? [qaPlugin()] : [],
    server: {
      allowedHosts: ['demo.qlize.site'],
    },
  };
});
