# 🏆 Modo Historia (`StageMode`) — Documentación de Diseño e Implementación (v2.1)

El **Modo Historia** (anteriormente *Modo Etapas*) es una modalidad de juego estructurada y ascendente dentro de **QLIZE**, inspirada en la ascensión espiritual del **Tiāndào • Árbol de la Estructura**, recorriendo los **10 Reinos Celestiales** desde la base (*Wángguó*) hasta la cúspide sagrada (*Wángguān*).

---

## 1. 🎯 Grafo de Progresión, Estética y Dificultad Calibrada (10 Reinos)

Cada uno de los 10 Reinos cuenta con **identidad cromática exclusiva**, **rasgo jugable único** y **parámetros de calibración física progresiva suavizada**:

| # | Reino Celestial | Dificultad | Rasgo Mecánico Principal | Ancho (Opt/Sec) | Gap Y | Móviles % | Quebradizas % | Gravedad | Paleta Temática |
| :-: | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | **Wángguó** | ★☆☆☆☆ | *Iniciación • Cimientos Estables* | 78 / 65 px | 65-80 px | 0% | 0% | 1.00x | Oro Imperial & Verde Jade |
| **2** | **Jīchǔ** | ★★☆☆☆ | *Equilibrio • Plataformas Móviles* | 74 / 62 px | 68-84 px | 12% | 0% | 1.01x | Amatista Astral & Índigo |
| **3** | **Guānghuī** | ★★☆☆☆ | *Esplendor • Geometría Estricta* | 70 / 58 px | 70-88 px | 16% | 0% | 1.03x | Ámbar Solar & Naranja Neón |
| **4** | **Shènglì** | ★★★☆☆ | *Victoria • Rutas Aisladas* | 66 / 55 px | 73-92 px | 20% | 8% | 1.05x | Verde Esmeralda & Cian |
| **5** | **Měilì** | ★★★☆☆ | *Armonía • Cadencia Central* | 62 / 52 px | 76-96 px | 24% | 12% | 1.07x | Sol Dorado & Azul Real |
| **6** | **Lìliàng** | ★★★★☆ | *Fuerza • Gravedad Densa* | 59 / 49 px | 79-100 px | 28% | 16% | 1.09x | Rubí Carmesí & Obsidiana |
| **7** | **Réncí** | ★★★★☆ | *Benevolencia • Oscilación Amplia* | 56 / 46 px | 82-104 px | 32% | 20% | 1.11x | Zafiro Celestial & Celeste |
| **8** | **Lǐjiě** | ★★★★★ | *Entendimiento • Plataformas Efímeras* | 53 / 43 px | 85-108 px | 35% | 24% | 1.12x | Índigo Matriz & Violeta |
| **9** | **Zhìhuì** | ★★★★★ | *Sabiduría • Micro-Precisión & Destello* | 50 / 40 px | 88-112 px | 38% | 27% | 1.14x | Diamante Blanco & Plata |
| **10**| **Wángguān**| ★★★★★★| *Corona Suprema • El Vuelo Sagrado* | 48 / 38 px | 90-115 px | 40% | 30% | 1.15x | Cian Trascendente & Luz Pura |

---

## 2. ⚙️ Dinámicas Mecánicas & Rendimiento

1. **Plataformas Móviles:**
   * Movimiento horizontal armónico sinusoidal $x(t) = \text{originX} + \sin(\text{fase}) \cdot \text{amplitud}$.
   * Secciones cinéticas laterales en azul cielo (`#38bdf8`) para fácil identificación visual.
2. **Plataformas Quebradizas / Efímeras:**
   * Borde punteado de alerta (`#fb923c` o `#fb7185`).
   * Al ser pisadas por el jugador, inician una cuenta regresiva con fisuras rojas (`#f43f5e`) y desvanecimiento gradual de opacidad hasta colapsar.
3. **Normalización Gráfica:**
   * Tanto el *Modo Historia* como el *Modo Arcade* renderizan el Hilo Dorado utilizando **doble trazo con transparencia** (emulando glow sin `shadowBlur`) y **culling de viewport** para rendimiento a 60 FPS en móviles.

---

## 3. 🗺️ Tarjeta Flotante del Overworld

* Insignia del Reino con fonética Pinyin (`[REINO 01] WÁNG-GUÓ`).
* **Insignia del Rasgo Mecánico Especial** coloreada según el tema del Reino.
* **Indicador de Dificultad** con estrellas (`★☆☆☆☆` a `★★★★★★`).
* Metadatos de **Distancia (6.000m)**, **Gravedad** y **Mejor Medalla** guardada en `localStorage`.

---

## 4. 🥇 Jerarquía de Medallas (GDD)

| Altura Alcanzada | Porcentaje | Medalla | Título Oficial | Significado |
| :--- | :---: | :---: | :--- | :--- |
| **6.000 m (Cima)** | **100%** | 🥉 | **Medalla de Bronce** | *Cima Sagrada Conquistada* |
| **$\ge$ 4.500 m** | **$\ge$ 75%** | 🥇 | **Medalla de Oro** | *Gran Resistencia (75%+)* |
| **$\ge$ 3.000 m** | **$\ge$ 50%** | 🥈 | **Medalla de Plata** | *Resistencia Media (50%+)* |
| **< 3.000 m** | **< 50%** | 🛡️ | **Sin Medalla** | *Sigue Intentándolo* |
