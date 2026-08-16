# 🏆 Modo Etapas (`StageMode`) — Documentación de Diseño e Implementación

El **Modo Etapas** es una modalidad de juego estructurada y ascendente dentro de **QLIZE**, inspirada en la ascensión espiritual del **Tiāndào • Árbol de la Estructura**, recorriendo los **10 Reinos Celestiales** desde la base (*Wángguó*) hasta la cúspide sagrada (*Wángguān*).

---

## 1. 🎯 Grafo de Progresión y Nomenclatura Fonética en Pinyin (Opción A)

El Árbol de la Estructura cuenta con **10 Reinos** nombrados íntegramente en el **alfabeto fonético chino (Pinyin)**, libres de referencias cabalísticas / abrahámicas:

| # | Reino Celestial (Nivel) | Código | Fonética Pinyin | Etiqueta de Nodo | Título y Significado en Español |
| :-: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Wángguó** | `WANGGUO` | `WÁNG-GUÓ` | **WAN** | *El Reino (La Iniciación)* |
| **2** | **Jīchǔ** | `JICHU` | `JĪ-CHǓ` | **JIC** | *El Fundamento (El Equilibrio)* |
| **3** | **Guānghuī** | `GUANGHUI` | `GUĀNG-HUĪ` | **GUA** | *El Esplendor (La Precisión)* |
| **4** | **Shènglì** | `SHENGLI` | `SHÈNG-LÌ` | **SHE** | *La Victoria (La Perseverancia)* |
| **5** | **Měilì** | `MEILI` | `MĚI-LÌ` | **MEI** | *La Armonía (El Eje Central)* |
| **6** | **Lìliàng** | `LILIANG` | `LÌ-LIÀNG` | **LIL** | *La Fuerza (El Rigor)* |
| **7** | **Réncí** | `RENCI` | `RÉN-CÍ` | **REN** | *La Benevolencia (La Gracia)* |
| **8** | **Lǐjiě** | `LIJIE` | `LǏ-JIĚ` | **LIJ** | *El Entendimiento (La Estructura)* |
| **9** | **Zhìhuì** | `ZHIHUI` | `ZHÌ-HUÌ` | **ZHI** | *La Sabiduría (El Destello)* |
| **10**| **Wángguān** | `WANGGUAN` | `WÁNG-GUĀN` | **WAG** | *La Corona Suprema (El Vuelo Sagrado)* |

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
