// ═══════════════════════════════════════════════════
//  THÈME CLAIR / SOMBRE
// ═══════════════════════════════════════════════════
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isLight = theme === 'light';
  const icon    = isLight ? '☀️' : '🌙';
  const label   = isLight ? 'Passer au thème sombre' : 'Passer au thème clair';
  const i  = document.getElementById('hmenu-theme-icon');
  const lb = document.getElementById('hmenu-theme-label');
  const l  = document.getElementById('btn-theme-login');
  if (i)  i.textContent  = icon;
  if (lb) lb.textContent = label;
  if (l)  l.textContent  = icon;
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('course_theme', next);
  applyTheme(next);
}
function toggleHamburger() {
  document.getElementById('hamburger-menu').classList.toggle('open');
}
function closeHamburger() {
  document.getElementById('hamburger-menu').classList.remove('open');
}
document.addEventListener('click', function (e) {
  const menu = document.getElementById('hamburger-menu');
  const btn  = document.getElementById('btn-hamburger');
  if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
    menu.classList.remove('open');
  }
});
(function () {
  const saved = localStorage.getItem('course_theme') || 'dark';
  applyTheme(saved);
})();

// ═══════════════════════════════════════════════════
//  CONFIG WEBAPP (à remplacer après déploiement)
// ═══════════════════════════════════════════════════
const WEBAPP = 'https://script.google.com/macros/s/AKfycbygJbioVIG-43frtbxXZTpdnsFEab8PunRGPFN_1lETpeen8Fjvtmgus9NJLagw2Bhd/exec';

// ═══════════════════════════════════════════════════
//  STRUCTURE DES SÉANCES PAR PROJET
// ═══════════════════════════════════════════════════
const SEANCES_PROJETS = {
  1: [
    { num: 1, nbSeq: 4, dureeSec: 7  * 60, recupSec: 2 * 60 },
    { num: 2, nbSeq: 3, dureeSec: 9  * 60, recupSec: 2 * 60 },
    { num: 3, nbSeq: 2, dureeSec: 13 * 60, recupSec: 2 * 60 },
    { num: 4, nbSeq: 1, dureeSec: 25 * 60, recupSec: 0 },
    { num: 5, nbSeq: 1, dureeSec: 28 * 60, recupSec: 0 },
    { num: 6, nbSeq: 1, dureeSec: 30 * 60, recupSec: 0 },
  ],
  2: [
    { num: 1, nbSeq: 6, dureeSec: 2 * 60, recupSec: 90 },
    { num: 2, nbSeq: 5, dureeSec: 3 * 60, recupSec: 90 },
    { num: 3, nbSeq: 4, dureeSec: 4 * 60, recupSec: 90 },
    { num: 4, nbSeq: 4, dureeSec: 4 * 60, recupSec: 60 },
    { num: 5, nbSeq: 3, dureeSec: 6 * 60, recupSec: 60 },
    { num: 6, nbSeq: 4, dureeSec: 5 * 60, recupSec: 60 },
  ],
  3: [
    { num: 1, cycles: [{ type: 'course', duree: 60  }, { type: 'marche', duree: 120 }], nb: 10, libre: false },
    { num: 2, cycles: [{ type: 'course', duree: 90  }, { type: 'marche', duree: 90  }], nb: 10, libre: false },
    { num: 3, cycles: [{ type: 'course', duree: 120 }, { type: 'marche', duree: 60  }], nb: 10, libre: false },
    { num: 4, cycles: [{ type: 'course', duree: 180 }, { type: 'marche', duree: 60  }], nb: 7,  libre: false },
    { num: 5, cycles: [{ type: 'course', duree: 300 }, { type: 'marche', duree: 60  }], nb: 5,  libre: false },
    { num: 6, cycles: [], nb: 0, libre: true },
  ]
};

// ═══════════════════════════════════════════════════
//  INFORMATIONS SUR LES PROJETS
// ═══════════════════════════════════════════════════
const PROJETS_INFO = {
  1: {
    nom:       "J'améliore mon endurance",
    intensite: "70–75 % de la VMA",
    icon:      "🏃",
    couleur:   "blue",
    description: "Vous courez à une allure confortable et soutenue, suffisamment longue pour solliciter votre système cardiovasculaire en profondeur. À cette intensité, votre organisme utilise principalement les graisses et le glucose comme carburant, en présence d'oxygène. C'est la filière aérobie : efficace, économique, et qui s'améliore avec la régularité.",
    benefices: [
      "Meilleure endurance générale",
      "Récupération plus rapide entre les séances",
      "Cœur plus efficace et plus puissant",
      "Sensation de courir plus facilement au fil des séances",
    ],
    structure: [
      "S1 : 4 séquences × 7 min — récupération 2 min",
      "S2 : 3 séquences × 9 min — récupération 2 min",
      "S3 : 2 séquences × 13 min — récupération 2 min",
      "S4 : 1 séquence × 25 min (continu)",
      "S5 : 1 séquence × 28 min (continu)",
      "S6 : 1 séquence × 30 min (continu)",
    ]
  },
  2: {
    nom:       "Je progresse en performance",
    intensite: "90–95 % de la VMA",
    icon:      "⚡",
    couleur:   "accent",
    description: "Vous travaillez par séquences courtes à allure élevée, proches de votre vitesse maximale aérobie. Votre organisme est poussé à sa limite d'utilisation de l'oxygène, ce qui le force à s'adapter et à devenir plus performant. Entre chaque séquence, une récupération courte — insuffisante pour souffler complètement — maintient la sollicitation.",
    benefices: [
      "Augmentation de la VMA",
      "Amélioration de la vitesse en course",
      "Meilleure tolérance à l'effort intense",
    ],
    structure: [
      "S1 : 6 × 2 min — récupération 1'30",
      "S2 : 5 × 3 min — récupération 1'30",
      "S3 : 4 × 4 min — récupération 1'30",
      "S4 : 4 × 4 min — récupération 1'00",
      "S5 : 3 × 6 min — récupération 1'00",
      "S6 : 4 × 5 min — récupération 1'00",
    ]
  },
  3: {
    nom:       "Je cours pour ma santé",
    intensite: "60–65 % de la VMA",
    icon:      "🫀",
    couleur:   "green",
    description: "Vous alternez des phases de course et de marche active, en restant toujours en mouvement pendant 30 minutes. L'intensité est volontairement modérée : vous devez pouvoir parler en courant. La filière aérobie est sollicitée en douceur, sans accumulation de fatigue excessive. L'objectif est de progresser à votre rythme, en augmentant peu à peu la part de course.",
    benefices: [
      "Amélioration de la condition physique générale",
      "Gestion de l'effort dans la durée",
      "Prise de confiance dans la pratique de la course",
    ],
    structure: [
      "S1 : 1' course / 2' marche × 10 (30' total)",
      "S2 : 1'30 course / 1'30 marche × 10 (30' total)",
      "S3 : 2' course / 1' marche × 10 (30' total)",
      "S4 : 3' course / 1' marche × 7 (≈ 30' total)",
      "S5 : 5' course / 1' marche × 5 (30' total)",
      "S6 : 30' libres, le moins de marche possible",
    ]
  }
};

// ═══════════════════════════════════════════════════
//  LEXIQUE
// ═══════════════════════════════════════════════════
const LEXIQUE = [
  {
    terme: "Demi-Cooper",
    def:   "Test consistant à courir le plus loin possible en 6 minutes. La distance parcourue permet d'estimer la VMA."
  },
  {
    terme: "VMA (Vitesse Maximale Aérobie)",
    def:   "La vitesse de course la plus élevée que vous pouvez maintenir en utilisant au maximum vos capacités aérobies. C'est la référence à partir de laquelle toutes vos allures d'entraînement sont calculées."
  },
  {
    terme: "Allure (min/km)",
    def:   "Temps mis pour parcourir un kilomètre. Ex : 5'30\"/km signifie 5 minutes 30 secondes pour faire 1 km."
  },
  {
    terme: "Vitesse (km/h)",
    def:   "Distance parcourue en une heure."
  },
  {
    terme: "Filière aérobie",
    def:   "Système énergétique utilisé lors des efforts longs et modérés. Il utilise l'oxygène pour transformer les graisses et les glucides en énergie."
  },
  {
    terme: "Endurance fondamentale",
    def:   "Capacité à maintenir un effort modéré sur une longue durée sans s'essouffler."
  },
  {
    terme: "Fractionné (interval training)",
    def:   "Méthode d'entraînement alternant des séquences d'effort intense et des phases de récupération."
  },
  {
    terme: "Récupération active",
    def:   "Phase de récupération effectuée en continuant à se déplacer (marche ou trot lent), plutôt qu'en s'arrêtant complètement."
  },
  {
    terme: "Seuil aérobie",
    def:   "Intensité d'effort à partir de laquelle la respiration s'accélère nettement mais reste contrôlée."
  },
  {
    terme: "Fréquence cardiaque (FC)",
    def:   "Nombre de battements du cœur par minute. Indicateur de l'intensité de l'effort."
  },
  {
    terme: "Séquence",
    def:   "Bloc d'effort d'une durée définie au sein d'une séance. Ex : \"4 séquences de 7 minutes\" signifie 4 blocs de course de 7 minutes chacun."
  },
  {
    terme: "Ressenti",
    def:   "Perception subjective de la difficulté de la séance : Facile (F), Difficile (D), Très Difficile (TD)."
  }
];

// ═══════════════════════════════════════════════════
//  FONCTIONS DE CALCUL
// ═══════════════════════════════════════════════════

function calcVMA(distanceMetres) {
  return Math.round(((distanceMetres / 1000) / 6 * 60 * 1.045) * 10) / 10;
}

function suggestProjet(vma) {
  if (vma < 10)  return 3;
  if (vma <= 13) return 1;
  return 2;
}

function calcDistanceCible(projet, vma, dureeMin) {
  const coeff = (projet == 1) ? 0.725 : 0.925;
  return Math.round(vma * coeff * (dureeMin / 60) * 1000 / 10) * 10;
}

function calcDistanceObjectifP3(vma) {
  return Math.round(vma * 0.625 * 0.5 * 1000 / 10) * 10;
}

function calcBadge(pctMoyen) {
  if (pctMoyen >= 0.95) return 'Or';
  if (pctMoyen >= 0.85) return 'Argent';
  if (pctMoyen >= 0.70) return 'Bronze';
  return 'Carton';
}

function calcAllure(vitesseKmh) {
  if (!vitesseKmh || vitesseKmh <= 0) return '—';
  const minKm = 60 / vitesseKmh;
  const min   = Math.floor(minKm);
  const sec   = Math.round((minKm - min) * 60);
  return min + "'" + sec.toString().padStart(2, '0') + '"';
}

function fmtTime(seconds) {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  return m + ':' + s.toString().padStart(2, '0');
}

function fmtDureeLabel(seconds) {
  if (seconds < 60) return seconds + ' s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? m + 'min' + s.toString().padStart(2, '0') : m + ' min';
}

function nextSeanceNum(seances, nbMax) {
  const max = nbMax || 6;
  for (let i = 1; i <= max; i++) {
    if (!seances || !seances['S' + i]) return i;
  }
  return null;
}

function badgeEmoji(badge) {
  return { Or: '🥇', Argent: '🥈', Bronze: '🥉', Carton: '📦' }[badge] || '—';
}

function badgeColor(badge) {
  return {
    Or:     'var(--yellow)',
    Argent: 'var(--muted)',
    Bronze: '#cd7f32',
    Carton: 'var(--red)'
  }[badge] || 'var(--muted)';
}

function buildP3Blocks(def) {
  if (def.libre) return [];
  const blocks = [];
  for (let c = 0; c < def.nb; c++) {
    for (const step of def.cycles) {
      blocks.push({ ...step });
    }
  }
  return blocks;
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}
