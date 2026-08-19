# Guía Completa de Pruebas Cerradas (Closed Testing) — 14 Días & 20 Testers

> **Requisito de Google Play (Cuentas Personales):**  
> Para poder publicar en la pista de **Producción**, Google exige que tu aplicación sea probada en una pista de **Prueba Cerrada (Closed Testing)** por un mínimo de **20 evaluadores** registrados y activos durante **14 días continuos**.

---

## 1. Paso a Paso en Google Play Console

### Paso 1: Crear la Pista de Prueba Cerrada
1. Ingresa a [Google Play Console](https://play.google.com/console).
2. Selecciona tu aplicación **QLIZE**.
3. En el menú lateral izquierdo, ve a **Pruebas > Pruebas cerradas (Closed testing)**.
4. Haz clic en **Crear pista (Create track)** o entra en la pista predeterminada de Prueba cerrada.

### Paso 2: Crear la Versión y Subir el AAB
1. Haz clic en **Crear nueva versión (Create new release)**.
2. En **Firma de apps de Play (Play App Signing)**, asegúrate de que esté habilitada la firma administrada por Google (usando los certificados `.der` oficiales).
3. Sube el archivo `release/QLIZE-v1.0.0.aab`.
4. Nombre de la versión: `1.0.0 (1)`.
5. Notas de la versión (Release notes):
   ```
   Lanzamiento inicial de QLIZE: Cyber-Zen Vectorial.
   - Modos Arcade, Etapas (Árbol de la Vida) e Iniciación.
   - Mecánica de Sincronía y salto vectorial.
   - Rendimiento optimizado y banda sonora adaptativa.
   ```
6. Haz clic en **Siguiente** y luego en **Guardar e Iniciar el lanzamiento en la prueba cerrada**.

---

## 2. Configurar la Lista de 20 Evaluadores

En la pestaña **Evaluadores (Testers)** de tu pista cerrada:

### Opción A: Crear una Lista de Correos Electrónicos (Recomendado para empezar)
1. Selecciona **Listas de correo electrónico**.
2. Haz clic en **Crear lista de correo electrónico**.
3. Nombra la lista (ej. `Testers QLIZE`) e introduce los 20+ correos de Gmail / Google Account de tus evaluadores separados por coma.
4. Guarda la lista y márcala como activa para la pista.

### Opción B: Crear un Grupo de Google (Recomendado para comunidades)
1. Crea un grupo público en [Google Groups](https://groups.google.com) (ej. `qlize-testers@googlegroups.com`).
2. En Play Console, ingresa el correo del grupo de Google.
3. Cualquier persona que se una al grupo podrá unirse automáticamente a la prueba mediante el enlace.

---

## 3. Invitar a los Evaluadores a Descargar la App

1. Al final de la pestaña Evaluadores, copia el enlace de invitación:
   - **Enlace web:** `https://play.google.com/apps/testing/com.qlize.jump`
   - O **Enlace en Android:** `https://play.google.com/store/apps/details?id=com.qlize.jump`
2. Envía este enlace a tus evaluadores.
3. **CRÍTICO:** Cada evaluador DEBE abrir el enlace, hacer clic en el botón azul **"Convertirse en evaluador" (Become a tester)** e **instalar la app** en su teléfono Android.
4. Si los evaluadores no aceptan la invitación o no instalan la app, el contador de Google de 14 días no comenzará a correr.

---

## 4. Estrategia para Conseguir los 20 Evaluadores
Si necesitas completar los 20 evaluadores:
- Amigos, familiares y colegas con dispositivos Android.
- Comunidades de testers mutuos en Reddit: `r/AndroidClosedTesting` y `r/playstoretesters`.
- Grupos de desarrolladores de Discord y Telegram (intercambio de pruebas: tú pruebas su app y ellos la tuya).

---

## 5. El Contador de 14 Días y Solicitud de Producción

1. En el **Panel de control (Dashboard)** de Google Play Console verás una tarjeta con el progreso:
   - *"Haz que al menos 20 evaluadores prueben tu app durante 14 días"*.
2. Mantén la app instalada en los dispositivos durante las dos semanas.
3. Cuando el contador llegue a 14 días, aparecerá el botón **"Solicitar acceso a producción" (Apply for production)**.
4. Al hacer clic, Google te pedirá responder un breve cuestionario:
   - *¿Cómo reclutaste a tus evaluadores?* (Ej: Red de contactos, comunidad de jugadores de juegos de plataformas/arcade).
   - *¿Qué feedback recibiste?* (Ej: Comentarios sobre sensibilidad del giroscopio y sugerencias de dificultad, las cuales fueron calibradas).
   - *¿Por qué consideras que tu app está lista?* (Ej: Juego completo, sin fallos reportados, 40 tests unitarios superados y rendimiento fluido).
5. Google revisa la solicitud en 1-3 días hábiles y habilitará la publicación en la pista de **Producción** para todo el mundo.
