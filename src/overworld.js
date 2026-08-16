// =========================================================
// QLIZE OVERWORLD: TIĀNDÀO • EL ÁRBOL DE LA ESTRUCTURA (10 REINOS)
// Misticismo Vectorial, Alfabeto Fonético Chino (Pinyin),
// Diferenciación Estética y Dificultad Progresiva (v2.0)
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
    trait: 'Iniciación • Cimientos Estables',
    difficultyRating: 'Iniciación',
    difficultyStars: '★☆☆☆☆',
    x: 0.50,
    y: 0.88,
    stageLength: 6000,
    gravityMultiplier: 1.00,
    connections: ['stage_2'],
    theme: {
      primaryColor: '#ca8a04',
      glowColor: 'rgba(202, 138, 4, 0.4)',
      bgGrad: ['rgba(43, 179, 130, 0.18)', 'rgba(5, 8, 20, 0.88)', '#02040a'],
      particleColor: '#e2b13c'
    },
    tuning: {
      widthOpt: 78,
      widthSec: 65,
      gapMin: 65,
      gapMax: 80,
      optimalRatio: 0.70,
      movingRatio: 0.0,
      moveSpeed: [0, 0],
      decayRatio: 0.0,
      decayTime: 0.0
    }
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
    trait: 'Equilibrio • Plataformas Móviles',
    difficultyRating: 'Equilibrio',
    difficultyStars: '★★☆☆☆',
    x: 0.50,
    y: 0.76,
    stageLength: 6000,
    gravityMultiplier: 1.01,
    connections: ['stage_3', 'stage_4'],
    theme: {
      primaryColor: '#9333ea',
      glowColor: 'rgba(147, 51, 234, 0.4)',
      bgGrad: ['rgba(147, 51, 234, 0.20)', 'rgba(10, 8, 24, 0.90)', '#03020a'],
      particleColor: '#c084fc'
    },
    tuning: {
      widthOpt: 74,
      widthSec: 62,
      gapMin: 68,
      gapMax: 84,
      optimalRatio: 0.65,
      movingRatio: 0.12,
      moveSpeed: [40, 70],
      decayRatio: 0.0,
      decayTime: 0.0
    }
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
    trait: 'Esplendor • Geometría Estricta',
    difficultyRating: 'Precisión',
    difficultyStars: '★★☆☆☆',
    x: 0.28,
    y: 0.64,
    stageLength: 6000,
    gravityMultiplier: 1.03,
    connections: ['stage_5'],
    theme: {
      primaryColor: '#ea580c',
      glowColor: 'rgba(234, 88, 12, 0.4)',
      bgGrad: ['rgba(234, 88, 12, 0.22)', 'rgba(20, 10, 8, 0.90)', '#080302'],
      particleColor: '#fb923c'
    },
    tuning: {
      widthOpt: 70,
      widthSec: 58,
      gapMin: 70,
      gapMax: 88,
      optimalRatio: 0.62,
      movingRatio: 0.16,
      moveSpeed: [45, 75],
      decayRatio: 0.0,
      decayTime: 0.0
    }
  },
  stage_4: {
    id: 4,
    key: 'stage_4',
    name: 'Shènglì',
    code: 'SHENGLI',
    phonetic: 'SHÈNG-LÌ',
    shortName: 'SHE',
    title: 'La Victoria (La Perseverancia)',
    desc: 'La energía viva y la perseverancia. Trayectos con cadencia dinámica.',
    trait: 'Victoria • Rutas Aisladas',
    difficultyRating: 'Resistencia',
    difficultyStars: '★★★☆☆',
    x: 0.72,
    y: 0.64,
    stageLength: 6000,
    gravityMultiplier: 1.05,
    connections: ['stage_5'],
    theme: {
      primaryColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      bgGrad: ['rgba(16, 185, 129, 0.22)', 'rgba(4, 20, 15, 0.90)', '#020806'],
      particleColor: '#34d399'
    },
    tuning: {
      widthOpt: 66,
      widthSec: 55,
      gapMin: 73,
      gapMax: 92,
      optimalRatio: 0.60,
      movingRatio: 0.20,
      moveSpeed: [50, 85],
      decayRatio: 0.08,
      decayTime: 1.3
    }
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
    trait: 'Armonía • Cadencia Central',
    difficultyRating: 'Armonía',
    difficultyStars: '★★★☆☆',
    x: 0.50,
    y: 0.52,
    stageLength: 6000,
    gravityMultiplier: 1.07,
    connections: ['stage_6', 'stage_7'],
    theme: {
      primaryColor: '#fbbf24',
      glowColor: 'rgba(251, 191, 36, 0.45)',
      bgGrad: ['rgba(251, 191, 36, 0.25)', 'rgba(15, 18, 30, 0.90)', '#03050c'],
      particleColor: '#fde047'
    },
    tuning: {
      widthOpt: 62,
      widthSec: 52,
      gapMin: 76,
      gapMax: 96,
      optimalRatio: 0.58,
      movingRatio: 0.24,
      moveSpeed: [55, 95],
      decayRatio: 0.12,
      decayTime: 1.2
    }
  },
  stage_6: {
    id: 6,
    key: 'stage_6',
    name: 'Lìliàng',
    code: 'LILIANG',
    phonetic: 'LÌ-LIÀNG',
    shortName: 'LIL',
    title: 'La Fuerza (El Rigor)',
    desc: 'La templanza inquebrantable y el enfoque total. Gravitación notablemente aumentada.',
    trait: 'Fuerza • Gravedad Densa',
    difficultyRating: 'Rigor',
    difficultyStars: '★★★★☆',
    x: 0.28,
    y: 0.40,
    stageLength: 6000,
    gravityMultiplier: 1.09,
    connections: ['stage_8', 'stage_9'],
    theme: {
      primaryColor: '#e11d48',
      glowColor: 'rgba(225, 29, 72, 0.45)',
      bgGrad: ['rgba(225, 29, 72, 0.25)', 'rgba(24, 6, 12, 0.92)', '#0a0204'],
      particleColor: '#f43f5e'
    },
    tuning: {
      widthOpt: 59,
      widthSec: 49,
      gapMin: 79,
      gapMax: 100,
      optimalRatio: 0.55,
      movingRatio: 0.28,
      moveSpeed: [60, 105],
      decayRatio: 0.16,
      decayTime: 1.1
    }
  },
  stage_7: {
    id: 7,
    key: 'stage_7',
    name: 'Réncí',
    code: 'RENCI',
    phonetic: 'RÉN-CÍ',
    shortName: 'REN',
    title: 'La Benevolencia (La Gracia)',
    desc: 'La expansión luminosa y la serenidad cósmica. Plataformas móviles de buen alcance.',
    trait: 'Benevolencia • Oscilación Amplia',
    difficultyRating: 'Gracia',
    difficultyStars: '★★★★☆',
    x: 0.72,
    y: 0.40,
    stageLength: 6000,
    gravityMultiplier: 1.11,
    connections: ['stage_8', 'stage_9'],
    theme: {
      primaryColor: '#2563eb',
      glowColor: 'rgba(37, 99, 235, 0.45)',
      bgGrad: ['rgba(37, 99, 235, 0.25)', 'rgba(6, 15, 30, 0.92)', '#02050f'],
      particleColor: '#60a5fa'
    },
    tuning: {
      widthOpt: 56,
      widthSec: 46,
      gapMin: 82,
      gapMax: 104,
      optimalRatio: 0.52,
      movingRatio: 0.32,
      moveSpeed: [65, 115],
      decayRatio: 0.20,
      decayTime: 1.0
    }
  },
  stage_8: {
    id: 8,
    key: 'stage_8',
    name: 'Lǐjiě',
    code: 'LIJIE',
    phonetic: 'LǏ-JIĚ',
    shortName: 'LIJ',
    title: 'El Entendimiento (La Estructura)',
    desc: 'La matriz primordial de la forma. Plataformas efímeras que colapsan velozmente.',
    trait: 'Entendimiento • Plataformas Efímeras',
    difficultyRating: 'Maestría',
    difficultyStars: '★★★★★',
    x: 0.28,
    y: 0.28,
    stageLength: 6000,
    gravityMultiplier: 1.12,
    connections: ['stage_10'],
    theme: {
      primaryColor: '#6366f1',
      glowColor: 'rgba(99, 102, 241, 0.45)',
      bgGrad: ['rgba(99, 102, 241, 0.25)', 'rgba(10, 8, 30, 0.92)', '#03020e'],
      particleColor: '#818cf8'
    },
    tuning: {
      widthOpt: 53,
      widthSec: 43,
      gapMin: 85,
      gapMax: 108,
      optimalRatio: 0.50,
      movingRatio: 0.35,
      moveSpeed: [70, 125],
      decayRatio: 0.24,
      decayTime: 0.95
    }
  },
  stage_9: {
    id: 9,
    key: 'stage_9',
    name: 'Zhìhuì',
    code: 'ZHIHUI',
    phonetic: 'ZHÌ-HUÌ',
    shortName: 'ZHI',
    title: 'La Sabiduría (El Destello)',
    desc: 'La chispa original de la iluminación cósmica. Micro-plataformas de alta precisión.',
    trait: 'Sabiduría • Micro-Precisión & Destello',
    difficultyRating: 'Iluminación',
    difficultyStars: '★★★★★',
    x: 0.72,
    y: 0.28,
    stageLength: 6000,
    gravityMultiplier: 1.14,
    connections: ['stage_10'],
    theme: {
      primaryColor: '#e2e8f0',
      glowColor: 'rgba(226, 232, 240, 0.5)',
      bgGrad: ['rgba(226, 232, 240, 0.28)', 'rgba(15, 20, 30, 0.92)', '#04060c'],
      particleColor: '#ffffff'
    },
    tuning: {
      widthOpt: 50,
      widthSec: 40,
      gapMin: 88,
      gapMax: 112,
      optimalRatio: 0.48,
      movingRatio: 0.38,
      moveSpeed: [75, 135],
      decayRatio: 0.27,
      decayTime: 0.90
    }
  },
  stage_10: {
    id: 10,
    key: 'stage_10',
    name: 'Wángguān',
    code: 'WANGGUAN',
    phonetic: 'WÁNG-GUĀN',
    shortName: 'WAG',
    title: 'La Corona Suprema (El Vuelo Sagrado)',
    desc: 'La cúspide suprema de la conciencia. La culminación total del ascenso y el desafío absoluto.',
    trait: 'Corona Suprema • El Vuelo Sagrado',
    difficultyStars: '★★★★★★',
    x: 0.50,
    y: 0.14,
    stageLength: 6000,
    gravityMultiplier: 1.15,
    connections: [],
    theme: {
      primaryColor: '#00e5ff',
      glowColor: 'rgba(0, 229, 255, 0.55)',
      bgGrad: ['rgba(0, 229, 255, 0.35)', 'rgba(5, 20, 35, 0.94)', '#010810'],
      particleColor: '#67e8f9'
    },
    tuning: {
      widthOpt: 48,
      widthSec: 38,
      gapMin: 90,
      gapMax: 115,
      optimalRatio: 0.45,
      movingRatio: 0.40,
      moveSpeed: [80, 145],
      decayRatio: 0.30,
      decayTime: 0.85
    }
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
