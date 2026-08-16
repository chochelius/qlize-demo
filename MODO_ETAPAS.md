# 🏆 Modo Etapas (`StageMode`) — Documentación de Diseño e Implementación

El **Modo Etapas** es una modalidad de juego estructurada y ascendente dentro de **QLIZE**, inspirada en la ascensión mística a través del **Árbol de la Vida** (*Sephiroth*), desde la base (*Malkuth*) hasta la cúspide sagrada (*Kether*).

---

## 1. 🎯 Grafo de Progresión y Nomenclatura Fonética

El Árbol de la Vida se estructura como un grafo celestial de **10 Sefirot** con nombres y pronunciaciones fonéticas en tipografía occidental Cyber-Zen:

| # | Sefirá (Nivel) | Código | Fonética | Etiqueta de Nodo | Título Oficial |
| :-: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Malkuth** | `MALKUTH` | `MAL-KOOTH` | **MAL** | *El Reino (La Iniciación)* |
| **2** | **Yesod** | `YESOD` | `YEH-SOD` | **YES** | *La Fundación (El Equilibrio)* |
| **3** | **Hod** | `HOD` | `HOHD` | **HOD** | *El Esplendor (La Precisión)* |
| **4** | **Netzach** | `NETZACH` | `NET-SAKH` | **NET** | *La Victoria (La Resistencia)* |
| **5** | **Tiphereth** | `TIPHERETH` | `TI-FEH-RET` | **TIP** | *La Belleza (El Eje Central)* |
| **6** | **Gevurah** | `GEVURAH` | `GEH-VOO-RAH` | **GEV** | *La Fuerza (El Rigor)* |
| **7** | **Chesed** | `CHESED` | `KHEH-SED` | **CHE** | *La Misericordia (La Gracia)* |
| **8** | **Binah** | `BINAH` | `BEE-NAH` | **BIN** | *El Entendimiento (La Estructura)* |
| **9** | **Chokhmah** | `CHOKHMAH` | `KHOHKH-MAH` | **CHO** | *La Sabiduría (El Destello)* |
| **10**| **Kether** | `KETHER` | `KEH-THER` | **KET** | *La Corona (El Vuelo Sagrado)* |

---

## 2. 🗺️ Estados Visuales del Overworld

* **🔒 Bloqueado (Piedra Inerte):** Borde gris ceniza (`rgba(148, 163, 184, 0.25)`), fondo opaco oscuro y candado geométrico `🔒`.
* **✨ Activo (Sendero Desbloqueado):** Borde celeste brillante (`var(--color-sky)`), pulso armónico del 5% y partículas en el fondo.
* **🌿 Completado (Purificado):** Borde verde jade (`var(--color-jade)`) con diagonal en oro mate (`var(--color-gold)`), insignia de medalla grabada y resplandor estelar.
* **⚡ Sendas de Luz SVG:** Hilos vectoriales punteados que se iluminan y animan en oro activo (`stroke-dashoffset`) en las conexiones abiertas.

---

## 3. 🎥 Cinemática de Barrido Inicial ("Visualización de la Ruta")

Antes de dar control al jugador, la cámara ejecuta un barrido vertical a alta velocidad para revelar la constelación completa del nivel:
1. **Subida Rápida (`UP`):** Velocidad de `9.000 px/s` (~2.0s para recorrer los 18.000m) con físicas en pausa.
2. **Pausa en la Cima (`PAUSE`):** Pausa de `0.3 s` en $Y = 18.000\text{m}$ para enfocar la meta.
3. **Descenso a la Base (`DOWN`):** Velocidad de retorno a $\sim 17.100\text{ px/s}$.
4. **Reposición Automática (`needsPlayerReposition`):** Reubicación segura sobre `lastSafePlatform` con impulso vertical listo para saltar.

---

## 4. 🥇 Jerarquía de Medallas (GDD)

| Altura Alcanzada | Porcentaje | Medalla | Título Oficial | Significado |
| :--- | :---: | :---: | :--- | :--- |
| **18.000 m (Cima)** | **100%** | 🥉 | **Medalla de Bronce** | *Cima Sagrada Conquistada* |
| **$\ge$ 13.500 m** | **$\ge$ 75%** | 🥇 | **Medalla de Oro** | *Gran Resistencia (75%+)* |
| **$\ge$ 9.000 m** | **$\ge$ 50%** | 🥈 | **Medalla de Plata** | *Resistencia Media (50%+)* |
| **< 9.000 m** | **< 50%** | 🛡️ | **Sin Medalla** | *Sigue Intentándolo* |

---

## 5. 🎧 Audio Ceremonial y Navegación

* **Cuenco Tibetano Sintético (`audio.playTibetanBowl`):** Armónicos a 216Hz, 432Hz y 864Hz con envolvente meditativa al iniciar cada etapa.
* **Resonancia de Navegación (`audio.playNodeHover`):** Sutil ping armónico al explorar los nodos.
* **Navegación Universal:** Teclas de flecha o `WASD` para navegar por el grafo, `Enter`/`Espacio` para iniciar y `Escape` para volver al Menú Principal.
