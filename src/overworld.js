// =========================================================
// QLIZE OVERWORLD: TIĀNDÀO • EL ÁRBOL DE LA ESTRUCTURA (10 REINOS)
// Misticismo Vectorial, Alfabeto Fonético Chino (Pinyin) y Grafo de Progresión
// =========================================================

export const OVERWORLD_GRAPH = {
  stage_1: {
    id: 1,
    key: 'stage_1',
    name: 'Wángguó',
    code: 'WANGGUO',
    phonetic: 'WÁNG-GUÓ',
    shortName: 'WAN',
    title: 'El Reino (La Iniciación)',
    desc: 'La base física de la creación. Donde comienza todo ascenso de la conciencia.',
    x: 0.50,
    y: 0.88,
    stageLength: 18000,
    gravityMultiplier: 1.0,
    connections: ['stage_2']
  },
  stage_2: {
    id: 2,
    key: 'stage_2',
    name: 'Jīchǔ',
    code: 'JICHU',
    phonetic: 'JĪ-CHǓ',
    shortName: 'JIC',
    title: 'El Fundamento (El Equilibrio)',
    desc: 'Los cimientos del balance interior. Exige saltos de sincronía constante.',
    x: 0.50,
    y: 0.76,
    stageLength: 18000,
    gravityMultiplier: 1.03,
    connections: ['stage_3', 'stage_4']
  },
  stage_3: {
    id: 3,
    key: 'stage_3',
    name: 'Guānghuī',
    code: 'GUANGHUI',
    phonetic: 'GUĀNG-HUĪ',
    shortName: 'GUA',
    title: 'El Esplendor (La Precisión)',
    desc: 'La claridad mental y la geometría estricta. Plataformas más estrechas.',
    x: 0.28,
    y: 0.64,
    stageLength: 18000,
    gravityMultiplier: 1.06,
    connections: ['stage_5']
  },
  stage_4: {
    id: 4,
    key: 'stage_4',
    name: 'Shènglì',
    code: 'SHENGLI',
    phonetic: 'SHÈNG-LÌ',
    shortName: 'SHE',
    title: 'La Victoria (La Perseverancia)',
    desc: 'La energía viva y la perseverancia. Trayectos largos con menor margen de error.',
    x: 0.72,
    y: 0.64,
    stageLength: 18000,
    gravityMultiplier: 1.06,
    connections: ['stage_5']
  },
  stage_5: {
    id: 5,
    key: 'stage_5',
    name: 'Měilì',
    code: 'MEILI',
    phonetic: 'MĚI-LÌ',
    shortName: 'MEI',
    title: 'La Armonía (El Eje Central)',
    desc: 'El corazón radiante del Árbol de la Estructura. Armonía pura entre rigor y gracia.',
    x: 0.50,
    y: 0.52,
    stageLength: 18000,
    gravityMultiplier: 1.08,
    connections: ['stage_6', 'stage_7']
  },
  stage_6: {
    id: 6,
    key: 'stage_6',
    name: 'Lìliàng',
    code: 'LILIANG',
    phonetic: 'LÌ-LIÀNG',
    shortName: 'LIL',
    title: 'La Fuerza (El Rigor)',
    desc: 'La templanza inquebrantable y el enfoque total. Gravitación ligeramente aumentada.',
    x: 0.28,
    y: 0.40,
    stageLength: 18000,
    gravityMultiplier: 1.12,
    connections: ['stage_8', 'stage_9']
  },
  stage_7: {
    id: 7,
    key: 'stage_7',
    name: 'Réncí',
    code: 'RENCI',
    phonetic: 'RÉN-CÍ',
    shortName: 'REN',
    title: 'La Benevolencia (La Gracia)',
    desc: 'La expansión luminosa y la serenidad cósmica. Gran flujo de plataformas sagradas.',
    x: 0.72,
    y: 0.40,
    stageLength: 18000,
    gravityMultiplier: 1.12,
    connections: ['stage_8', 'stage_9']
  },
  stage_8: {
    id: 8,
    key: 'stage_8',
    name: 'Lǐjiě',
    code: 'LIJIE',
    phonetic: 'LǏ-JIĚ',
    shortName: 'LIJ',
    title: 'El Entendimiento (La Estructura)',
    desc: 'La matriz primordial de la forma. Desafío de cálculo y cadencia milimétrica.',
    x: 0.28,
    y: 0.28,
    stageLength: 18000,
    gravityMultiplier: 1.15,
    connections: ['stage_10']
  },
  stage_9: {
    id: 9,
    key: 'stage_9',
    name: 'Zhìhuì',
    code: 'ZHIHUI',
    phonetic: 'ZHÌ-HUÌ',
    shortName: 'ZHI',
    title: 'La Sabiduría (El Destello)',
    desc: 'La chispa original de la iluminación cósmica. Impulso veloz y rutas abiertas.',
    x: 0.72,
    y: 0.28,
    stageLength: 18000,
    gravityMultiplier: 1.15,
    connections: ['stage_10']
  },
  stage_10: {
    id: 10,
    key: 'stage_10',
    name: 'Wángguān',
    code: 'WANGGUAN',
    phonetic: 'WÁNG-GUĀN',
    shortName: 'WAG',
    title: 'La Corona Suprema (El Vuelo Sagrado)',
    desc: 'La cúspide suprema de la conciencia. La culminación total del ascenso.',
    x: 0.50,
    y: 0.14,
    stageLength: 18000,
    gravityMultiplier: 1.18,
    connections: []
  }
};

const STORAGE_KEY = 'qlize_overworld_progress';

export class OverworldManager {
  constructor() {
    this.progress = this.loadProgress();
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.unlocked)) {
          return {
            unlocked: parsed.unlocked.includes('stage_1') ? parsed.unlocked : ['stage_1', ...parsed.unlocked],
            completed: parsed.completed || {},
            bestMedals: parsed.bestMedals || {},
            bestScores: parsed.bestScores || {}
          };
        }
      }
    } catch (e) {
      console.warn('Error cargando progreso de Overworld:', e);
    }
    // Estado inicial por defecto: sólo Wángguó (stage_1) desbloqueado
    return {
      unlocked: ['stage_1'],
      completed: {},
      bestMedals: {},
      bestScores: {}
    };
  }

  saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.warn('Error guardando progreso de Overworld:', e);
    }
  }

  isUnlocked(stageKey) {
    return this.progress.unlocked.includes(stageKey);
  }

  isCompleted(stageKey) {
    return !!this.progress.completed[stageKey];
  }

  getMedal(stageKey) {
    return this.progress.bestMedals[stageKey] || null;
  }

  getBestScore(stageKey) {
    return this.progress.bestScores?.[stageKey] || 0;
  }

  completeStage(stageKey, score = 0, medal = null) {
    const node = OVERWORLD_GRAPH[stageKey];
    if (!node) return [];

    this.progress.completed[stageKey] = true;

    if (score > (this.progress.bestScores?.[stageKey] || 0)) {
      if (!this.progress.bestScores) this.progress.bestScores = {};
      this.progress.bestScores[stageKey] = score;
    }

    if (medal) {
      this.progress.bestMedals[stageKey] = medal;
    }

    const newlyUnlocked = [];
    if (Array.isArray(node.connections)) {
      for (const targetKey of node.connections) {
        if (!this.progress.unlocked.includes(targetKey)) {
          this.progress.unlocked.push(targetKey);
          newlyUnlocked.push(targetKey);
        }
      }
    }

    this.saveProgress();
    return newlyUnlocked;
  }

  getCompletedCount() {
    return Object.keys(this.progress.completed).filter(k => this.progress.completed[k]).length;
  }

  resetProgress() {
    this.progress = {
      unlocked: ['stage_1'],
      completed: {},
      bestMedals: {},
      bestScores: {}
    };
    this.saveProgress();
  }

  getNode(stageKey) {
    return OVERWORLD_GRAPH[stageKey] || null;
  }
}
