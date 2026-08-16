// =========================================================
// QLIZE QA BACKEND: PERSISTENCIA NATIVA SQLITE & TERMINAL LOGS
// Node.js 24 Native SQLite (`node:sqlite`)
// =========================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import process from 'node:process';

let db = null;

export function initQADatabase(dbPath = null) {
  if (db) return db;
  const targetPath = dbPath || path.resolve(process.cwd(), 'qa_logs.sqlite');
  db = new DatabaseSync(targetPath);

  // Crear tablas si no existen
  db.exec(`
    CREATE TABLE IF NOT EXISTS qa_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS qa_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      event_type TEXT,
      mode TEXT,
      stage TEXT,
      score INTEGER,
      sync_ratio REAL,
      lives INTEGER,
      duration_sec REAL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS qa_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      mode TEXT,
      stage TEXT,
      rating INTEGER,
      comment TEXT,
      score INTEGER,
      sync_ratio REAL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════');
  console.log('\x1b[33m%s\x1b[0m', ' [MODO QA ACTIVADO] Base de datos SQLite conectada: qa_logs.sqlite');
  console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════');

  return db;
}

export function recordSession(sessionId, userAgent = '') {
  try {
    const database = initQADatabase();
    const stmt = database.prepare(`
      INSERT OR IGNORE INTO qa_sessions (session_id, user_agent)
      VALUES (?, ?)
    `);
    stmt.run(sessionId, userAgent);
    console.log(`\x1b[90m[QA SESIÓN INICIADA]\x1b[0m ID: \x1b[33m${sessionId}\x1b[0m | Agente: ${userAgent.slice(0, 50)}...`);
  } catch (err) {
    console.error('[QA Backend Error Session]', err.message);
  }
}

export function recordEvent(data) {
  try {
    const database = initQADatabase();
    const {
      sessionId = 'anon',
      eventType = 'unknown',
      mode = 'N/A',
      stage = 'N/A',
      score = 0,
      syncRatio = 1.0,
      lives = 3,
      durationSec = 0,
      details = ''
    } = data;

    const stmt = database.prepare(`
      INSERT INTO qa_events (session_id, event_type, mode, stage, score, sync_ratio, lives, duration_sec, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      eventType,
      mode,
      stage,
      Math.round(score),
      Number((syncRatio * 100).toFixed(1)),
      lives,
      Number(durationSec.toFixed(2)),
      typeof details === 'object' ? JSON.stringify(details) : String(details)
    );

    // Formatear log compacto en terminal
    const timeBadge = new Date().toLocaleTimeString();
    const syncPct = `${Math.round(syncRatio * 100)}%`;
    console.log(
      `\x1b[34m[QA ${timeBadge}]\x1b[0m \x1b[1m${eventType.toUpperCase()}\x1b[0m | Modo: \x1b[33m${mode}\x1b[0m | Etapa: \x1b[36m${stage}\x1b[0m | Puntos: \x1b[32m${score}m\x1b[0m | Sincronía: \x1b[35m${syncPct}\x1b[0m | Vidas: ${lives}`
    );
  } catch (err) {
    console.error('[QA Backend Error Event]', err.message);
  }
}

export function recordFeedback(data) {
  try {
    const database = initQADatabase();
    const {
      sessionId = 'anon',
      mode = 'N/A',
      stage = 'N/A',
      rating = 5,
      comment = '',
      score = 0,
      syncRatio = 1.0
    } = data;

    const stmt = database.prepare(`
      INSERT INTO qa_feedback (session_id, mode, stage, rating, comment, score, sync_ratio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      mode,
      stage,
      rating,
      comment,
      Math.round(score),
      Number((syncRatio * 100).toFixed(1))
    );

    // Renderizar recuadro destacado en la terminal
    const stars = '⭐'.repeat(Math.max(1, Math.min(5, rating)));
    console.log('\n\x1b[42m\x1b[30m\x1b[1m 🌟 NUEVO FEEDBACK DE JUGADOR RECIBIDO (MODO QA) \x1b[0m');
    console.log(` \x1b[1mModo / Contexto:\x1b[0m \x1b[33m${mode}\x1b[0m (${stage})`);
    console.log(` \x1b[1mCalificación:\x1b[0m    \x1b[32m${stars} (${rating}/5)\x1b[0m`);
    console.log(` \x1b[1mRendimiento:\x1b[0m     ${Math.round(score)}m alcanzados | Sincronía: ${Math.round(syncRatio * 100)}%`);
    console.log(` \x1b[1mOpinión:\x1b[0m         "${comment ? comment : '(Sin comentario escrito)'}"`);
    console.log(` \x1b[90mGuardado en base de datos SQLite [qa_logs.sqlite]\x1b[0m\n`);
  } catch (err) {
    console.error('[QA Backend Error Feedback]', err.message);
  }
}

export function getQADatabase() {
  return db;
}

export function closeQADatabase() {
  if (db) {
    try {
      db.close();
    } catch {}
    db = null;
  }
}
