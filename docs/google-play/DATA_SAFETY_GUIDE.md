# Guía de Seguridad de los Datos (Data Safety) para Google Play Console

En Google Play Console, dirígete a:  
**Contenido de la app (App Content) > Seguridad de los datos (Data safety)**.

A continuación tienes las respuestas exactas requeridas para **QLIZE**:

---

## 1. Información General (Data Collection & Sharing)

| Pregunta en Play Console | Respuesta Requerida | Justificación |
| :--- | :---: | :--- |
| **¿Tu app recopila o comparte alguno de los tipos de datos de usuario obligatorios?** | **NO** | QLIZE funciona de forma autónoma offline y solo guarda datos en el dispositivo (localStorage). |
| **¿Todos los datos de usuario que recopila tu app se cifran en tránsito?** | **SÍ** | Todo el tráfico HTTPS nativo va cifrado. |
| **¿Proporcionas una forma para que los usuarios soliciten la eliminación de sus datos?** | **SÍ** | El usuario puede borrar sus datos desinstalando la app o desde el menú de Ajustes locales. |

---

## 2. Tipos de Datos Específicos

Cuando Google Play te pregunte si recopilas:
- **Ubicación (Location):** NO
- **Información personal (Name, Email, etc.):** NO
- **Información financiera:** NO
- **Salud y actividad física:** NO
- **Mensajes / Fotos / Videos / Audio:** NO
- **Archivos y documentos:** NO
- **Contactos:** NO
- **Actividad de la app (Interacciones, historial):** NO
- **Navegación web:** NO
- **Información de rendimiento / Diagnóstico:** NO
- **Identificadores del dispositivo (Device IDs):** NO

---

## 3. Declaraciones Adicionales de Contenido

| Sección | Pregunta | Respuesta |
| :--- | :--- | :--- |
| **Público objetivo y contenido** | ¿Qué edad tienen los usuarios a los que se dirige tu app? | Seleccionar **13 años o más** (o todas las edades según tu preferencia, recomendación: 13-17 y 18+ para simplificar el proceso sin requerir el programa familiar 'Diseñado para familias'). |
| **Anuncios (Ads)** | ¿Tu aplicación contiene anuncios? | **NO** |
| **Acceso a aplicaciones** | ¿Alguna parte de tu app está restringida? | **Todo el contenido está disponible sin restricciones especiales.** |
| **Aplicaciones de noticias** | ¿Es una app de noticias? | **NO** |
| **Funciones financieras** | ¿Proporciona servicios financieros? | **NO** |
| **Aplicaciones de COVID-19 / Salud** | ¿Es una app de rastreo de contactos o salud? | **NO** |
| **Aplicaciones gubernamentales** | ¿Está afiliada a un gobierno? | **NO** |
| **Cuestionario de clasificación IARC** | Categoría: Juego. Violencia: No. Lenguaje ofensivo: No. | Generará automáticamente clasificación **PEGI 3 / ESRB Everyone**. |
