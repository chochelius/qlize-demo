# 🏆 Modo Etapas (`StageMode`) — Documentación de Diseño e Implementación (v2.0)

El **Modo Etapas** es una modalidad de juego estructurada y ascendente dentro de **QLIZE**, inspirada en la ascensión espiritual del **Tiāndào • Árbol de la Estructura**, recorriendo los **10 Reinos Celestiales** desde la base (*Wángguó*) hasta la cúspide sagrada (*Wángguān*).

---

## 1. 🎯 Grafo de Progresión, Estética y Dificultad Progresiva (10 Reinos)

Cada uno de los 10 Reinos cuenta con **identidad cromática exclusiva**, **rasgo jugable único** y **parámetros de calibración física progresiva**:

| # | Reino Celestial | Dificultad | Rasgo Mecánico Principal | Ancho (Opt/Sec) | Gap Y | Móviles % | Quebradizas % | Gravedad | Paleta Temática |
| :-: | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | **Wángguó** | ★☆☆☆☆ | *Iniciación • Cimientos Estables* | 78 / 65 px | 65-80 px | 0% | 0% | 1.00x | Oro Imperial & Verde Jade |
| **2** | **Jīchǔ** | ★★☆☆☆ | *Equilibrio • Plataformas Móviles* | 72 / 60 px | 70-88 px | 20% | 0% | 1.03x | Amatista Astral & Índigo |
| **3** | **Guānghuī** | ★★☆☆☆ | *Esplendor • Geometría Estricta* | 65 / 52 px | 75-95 px | 25% | 0% | 1.06x | Ámbar Solar & Naranja Neón |
| **4** | **Shènglì** | ★★★☆☆ | *Victoria • Rutas Aisladas* | 62 / 48 px | 80-105 px | 30% | 12% | 1.08x | Verde Esmeralda & Cian |
| **5** | **Měilì** | ★★★☆☆ | *Armonía • Cadencia Central* | 58 / 45 px | 85-110 px | 35% | 15% | 1.10x | Sol Dorado & Azul Real |
| **6** | **Lìliàng** | ★★★★☆ | *Fuerza • Gravedad Densa* | 55 / 42 px | 80-100 px | 35% | 20% | 1.14x | Rubí Carmesí & Obsidiana |
| **7** | **Réncí** | ★★★★☆ | *Benevolencia • Oscilación Amplia* | 52 / 40 px | 90-115 px | 40% | 22% | 1.14x | Zafiro Celestial & Celeste |
| **8** | **Lǐjiě** | ★★★★★ | *Entendimiento • Plataformas Efímeras* | 48 / 38 px | 95-120 px | 45% | 35% | 1.16x | Índigo Matriz & Violeta |
| **9** | **Zhìhuì** | ★★★★★ | *Sabiduría • Micro-Precisión & Destello* | 44 / 35 px | 100-125 px | 50% | 40% | 1.18x | Diamante Blanco & Plata |
| **10**| **Wángguān**| ★★★★★★| *Corona Suprema • El Vuelo Sagrado* | 40 / 32 px | 105-130 px | 55% | 45% | 1.20x | Cian Trascendente & Luz Pura |

---

## 2. ⚙️ Nuevas Dinámicas Mecánicas

1. **Plataformas Móviles:**
   * Movimiento horizontal armónico sinusoidal $x(t) = \text{originX} + \sin(\text{fase}) \cdot \text{amplitud}$.
   * Secciones cinéticas laterales en azul cielo (`#38bdf8`) para fácil identificación visual.
2. **Plataformas Quebradizas / Efímeras:**
   * Borde punteado de alerta (`#fb923c` o `#fb7185`).
   * Al ser pisadas por el jugador, inician una cuenta regresiva con fisuras rojas (`#f43f5e`) y desvanecimiento gradual de opacidad hasta desaparecer por completo.
3. **Curva de Dificultad:**
   * Reducción progresiva de la anchura (de 78px a 40px).
   * Aumento del espaciado vertical entre plataformas (de 65px a 130px).
   * Aumento de la gravedad (de 1.00x a 1.20x).

---

## 3. 🗺️ Tarjeta Flotante del Overworld

* Insignia del Reino con fonética Pinyin (`[REINO 01] WÁNG-GUÓ`).
* **Insignia del Rasgo Mecánico Especial** coloreada según el tema del Reino.
* **Indicador de Dificultad** con estrellas (`★☆☆☆☆` a `★★★★★★`).
* Metadatos de **Distancia (18.000m)**, **Gravedad** y **Mejor Medalla** guardada en `localStorage`.

---

## 4. 🥇 Jerarquía de Medallas (GDD)

| Altura Alcanzada | Porcentaje | Medalla | Título Oficial | Significado |
| :--- | :---: | :---: | :--- | :--- |
| **18.000 m (Cima)** | **100%** | 🥉 | **Medalla de Bronce** | *Cima Sagrada Conquistada* |
| **$\ge$ 13.500 m** | **$\ge$ 75%** | 🥇 | **Medalla de Oro** | *Gran Resistencia (75%+)* |
| **$\ge$ 9.000 m** | **$\ge$ 50%** | 🥈 | **Medalla de Plata** | *Resistencia Media (50%+)* |
| **< 9.000 m** | **< 50%** | 🛡️ | **Sin Medalla** | *Sigue Intentándolo* |
