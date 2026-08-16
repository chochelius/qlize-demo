import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { initQADatabase, recordSession, recordEvent, recordFeedback, closeQADatabase } from '../server/qa-backend.js';

const TEST_DB_PATH = path.resolve(process.cwd(), 'test_qa_logs.sqlite');

test('QA Backend: inicializa esquema SQLite y registra sesiones, eventos y feedback', (t) => {
  // Limpiar base de prueba previa
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  const db = initQADatabase(TEST_DB_PATH);
  assert.ok(db, 'debe inicializar conexión con SQLite nativo');

  // 1. Registro de sesión
  recordSession('test_session_123', 'Mozilla/5.0 (Test Browser)');
  const sessions = db.prepare('SELECT * FROM qa_sessions WHERE session_id = ?').all('test_session_123');
  assert.equal(sessions.length, 1, 'debe haber insertado exactamente 1 sesión');
  assert.equal(sessions[0].session_id, 'test_session_123');

  // 2. Registro de evento de telemetría
  recordEvent({
    sessionId: 'test_session_123',
    eventType: 'stage_complete',
    mode: 'Modo Historia',
    stage: 'Wángguó',
    score: 6000,
    syncRatio: 0.95,
    lives: 3,
    durationSec: 45.2,
    details: { medal: 'Bronce' }
  });

  const events = db.prepare('SELECT * FROM qa_events WHERE session_id = ?').all('test_session_123');
  assert.equal(events.length, 1, 'debe haber insertado exactamente 1 evento');
  assert.equal(events[0].event_type, 'stage_complete');
  assert.equal(events[0].score, 6000);
  assert.equal(events[0].sync_ratio, 95.0);

  // 3. Registro de encuesta de satisfacción (Rating 1 al 5)
  recordFeedback({
    sessionId: 'test_session_123',
    mode: 'Modo Historia',
    stage: 'Wángguó',
    rating: 5,
    comment: '¡Excelente calibración y fluidez!',
    score: 6000,
    syncRatio: 0.95
  });

  const feedback = db.prepare('SELECT * FROM qa_feedback WHERE session_id = ?').all('test_session_123');
  assert.equal(feedback.length, 1, 'debe haber insertado feedback');
  assert.equal(feedback[0].rating, 5);
  assert.equal(feedback[0].comment, '¡Excelente calibración y fluidez!');

  // Cleanup limpio
  closeQADatabase();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});
