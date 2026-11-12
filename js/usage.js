// ─── Perfil olfativo: análisis, etiquetas y texto ───────────────
// Sin DOM. Sin acoplamiento al modal. Todo el diccionario aquí.

// ─── Constantes ajustables ──────────────────────────────────────
// Pesos por posición para los ejes (el fondo define el dry-down)
export const AXIS_WEIGHTS = { top: 1, heart: 2, base: 3 };

// Pesos por posición para el carácter (el fondo pesa menos aquí,
// porque casi todos los fondos llevan ámbar, almizcle o maderas)
export const CHAR_WEIGHTS = { top: 1, heart: 2, base: 2 };

// Las familias "de soporte" (ámbar, almizcle, maderas) aparecen en casi
// todos los perfumes: pesan la mitad en carácter y en ejes.
const SUPPORT_FACTOR = 0.5;

// Eje normalizado va de -2 a +2. Si |valor| < umbral → "versátil".
const AXIS_THRESHOLD = 0.15;

// Una familia entra al texto de carácter solo si llega a esta
// fracción del puntaje de la familia líder.
const CHAR_MIN_RATIO = 0.4;
const CHAR_MAX_FAMILIES = 3;

// Menos de 2 notas reconocidas → no inventamos uso
const MIN_RECOGNIZED = 2;

// ─── Familias olfativas ─────────────────────────────────────────
// momento:    + = día,     - = noche
// clima:      + = calor,   - = frío
// formalidad: + = casual,  - = formal
// support:    true = familia de soporte (pesa la mitad)
export const FAMILIES = {
  citrico:   { label: 'cítrico',    momento: +2, clima: +2, formalidad: +1 },
  acuatico:  { label: 'acuático',   momento: +2, clima: +2, formalidad: +1 },
  fresco:    { label: 'fresco',     momento: +2, clima: +2, formalidad: +1 },
  aromatico: { label: 'aromático',  momento: +1, clima: +1, formalidad: +1 },
  verde:     { label: 'verde',      momento: +1, clima: +1, formalidad: +2 },
  fougere:   { label: 'fougère',    momento: +1, clima: +1, formalidad: +1 },
  floral:    { label: 'floral',     momento:  0, clima:  0, formalidad: +1 },
  frutal:    { label: 'frutal',     momento: +1, clima: +1, formalidad: +1 },
  especiado: { label: 'especiado',  momento: -1, clima: -2, formalidad: -1 },
  dulce:     { label: 'dulce',      momento: -1, clima: -1, formalidad:  0 },
  oriental:  { label: 'oriental',   momento: -2, clima: -2, formalidad: -2 },
  cuero:     { label: 'de cuero',   momento: -2, clima: -2, formalidad: -2 },
  tabaco:    { label: 'de tabaco',  momento: -2, clima: -2, formalidad: -2 },
  chipre:    { label: 'chipre',     momento: -1, clima: -1, formalidad: -1 },
  // De soporte
  amaderado: { label: 'amaderado',  momento:  0, clima:  0, formalidad: -1, support: true },
  ambarado:  { label: 'ámbar',      momento: -2, clima: -2, formalidad: -1, support: true },
  almizcle:  { label: 'almizclado', momento:  0, clima:  0, formalidad: +1, support: true }
};

// ─── Diccionario nota → familia ─────────────────────────────────
// Editable. Las claves van sin tildes y en minúsculas; el singular/plural
// se resuelve solo ("maderas" y "madera" son la misma clave).
// Cuando aparezcan notas nuevas, se agregan aquí.
export const NOTE_FAMILIES = {
  // cítricos
  bergamota: 'citrico', limon: 'citrico', naranja: 'citrico', pomelo: 'citrico',
  mandarina: 'citrico', lima: 'citrico', yuzu: 'citrico', toronja: 'citrico',
  'limon verde': 'citrico', 'naranja sanguina': 'citrico', elemi: 'citrico',
  // acuáticos / marinos
  marina: 'acuatico', acuatica: 'acuatico', 'notas marinas': 'acuatico',
  'notas acuaticas': 'acuatico', ozonica: 'acuatico', 'notas ozonicas': 'acuatico',
  'aire de mar': 'acuatico', 'agua de mar': 'acuatico', calone: 'acuatico',
  sal: 'acuatico', sandia: 'acuatico', 'sandia especiada': 'acuatico', melon: 'acuatico',
  // frescos
  'notas frescas': 'fresco', 'frescura': 'fresco',
  // verdes
  petitgrain: 'verde', 'te verde': 'verde', 'hojas verdes': 'verde',
  'hoja de higuera': 'verde', 'flor de tilo': 'verde', hierba: 'verde',
  galbano: 'verde', 'notas verdes': 'verde',
  // aromáticos / herbales
  romero: 'aromatico', salvia: 'aromatico', lavanda: 'aromatico',
  lavandin: 'aromatico', tomillo: 'aromatico', oregano: 'aromatico',
  menta: 'aromatico', hierbabuena: 'aromatico', cardamomo: 'aromatico',
  anis: 'aromatico', estragon: 'aromatico', albahaca: 'aromatico',
  'menta piperita': 'aromatico',
  // fougère
  cumarina: 'fougere',
  // chipre
  'musgo de roble': 'chipre', musgo: 'chipre',
  // florales
  rosa: 'floral', jazmin: 'floral', lirio: 'floral',
  'lirio de los valles': 'floral', gardenia: 'floral', tuberosa: 'floral',
  magnolia: 'floral', peonia: 'floral', 'ylang-ylang': 'floral',
  geranio: 'floral', violeta: 'floral', iris: 'floral', osmanto: 'floral',
  fresia: 'floral', nardo: 'floral', azahar: 'floral', mimosa: 'floral',
  'flor de naranjo': 'floral', 'flor de cerezo': 'floral', 'flor de loto': 'floral',
  'notas florales': 'floral', heliotropo: 'floral',
  // frutales
  frambuesa: 'frutal', manzana: 'frutal', pera: 'frutal', durazno: 'frutal',
  melocoton: 'frutal', ciruela: 'frutal', fresa: 'frutal', cereza: 'frutal',
  pina: 'frutal', mango: 'frutal', lichi: 'frutal', grosella: 'frutal',
  mora: 'frutal', higo: 'frutal', uva: 'frutal', 'frutos rojos': 'frutal',
  // amaderados (soporte)
  cedro: 'amaderado', sandalo: 'amaderado', vetiver: 'amaderado',
  pachuli: 'amaderado', cipres: 'amaderado', guayaco: 'amaderado',
  'palo de rosa': 'amaderado', cashmere: 'amaderado', cashmeran: 'amaderado',
  abeto: 'amaderado', pino: 'amaderado', 'notas amaderadas': 'amaderado',
  madera: 'amaderado', 'madera de oud': 'amaderado',
  // ámbar / resinas (soporte)
  ambar: 'ambarado', incienso: 'ambarado', mirra: 'ambarado',
  opoponaco: 'ambarado', ladano: 'ambarado', resina: 'ambarado',
  balsamo: 'ambarado', benzoina: 'ambarado', labdano: 'ambarado',
  ambroxan: 'ambarado', 'ambar gris': 'ambarado', jara: 'ambarado',
  // especiados
  pimienta: 'especiado', canela: 'especiado', clavo: 'especiado',
  'nuez moscada': 'especiado', jengibre: 'especiado', comino: 'especiado',
  azafran: 'especiado', pimenton: 'especiado',
  // dulces / gourmand
  vainilla: 'dulce', tonka: 'dulce', caramelo: 'dulce', chocolate: 'dulce',
  cafe: 'dulce', miel: 'dulce', praline: 'dulce', coco: 'dulce',
  leche: 'dulce', benjui: 'dulce', 'haba tonka': 'dulce', azucar: 'dulce',
  capuchino: 'dulce',
  // orientales
  oud: 'oriental', 'oud de oriente': 'oriental', agar: 'oriental',
  // cuero / tabaco
  cuero: 'cuero', tabaco: 'tabaco', humo: 'tabaco', whisky: 'cuero', ron: 'cuero',
  // ── Añadidas tras revisar el catálogo ──
  // cítricos
  neroli: 'citrico', cidra: 'citrico', limonero: 'citrico', calamansi: 'citrico',
  citrico: 'citrico', citrica: 'citrico',
  // acuáticos / marinos
  marino: 'acuatico', acuatico: 'acuatico',
  // aromáticos
  enebro: 'aromatico', 'bayas de enebro': 'aromatico', cilantro: 'aromatico',
  ajenjo: 'aromatico', artemisa: 'aromatico', camomila: 'aromatico',
  eucalipto: 'aromatico',
  // verdes
  tagetes: 'verde', 'hoja de tomate': 'verde', cactus: 'verde', te: 'verde',
  // florales
  jacinto: 'floral', clavel: 'floral', ciclamen: 'floral', 'flores blancas': 'floral',
  orquidea: 'floral', narciso: 'floral', calendula: 'floral', muguete: 'floral',
  azucena: 'floral', madreselva: 'floral', 'flor de peral': 'floral',
  frangipani: 'floral', nenufar: 'floral', 'flor de pasionaria': 'floral',
  'amapola roja': 'floral', 'flor de champaca': 'floral', reseda: 'floral',
  'guisante de olor': 'floral', hibisco: 'floral', floral: 'floral',
  // frutales
  albaricoque: 'frutal', granada: 'frutal', 'frutas tropicales': 'frutal',
  'frutos del bosque': 'frutal', 'tutti frutti': 'frutal', maracuya: 'frutal',
  guayaba: 'frutal', papaya: 'frutal', membrillo: 'frutal', caqui: 'frutal',
  arandano: 'frutal', 'bayas de goji': 'frutal',
  // amaderados (soporte)
  cipriol: 'amaderado', dreamwood: 'amaderado', amaderado: 'amaderado',
  amaderada: 'amaderado', palisandro: 'amaderado', amyris: 'amaderado',
  abedul: 'amaderado', caoba: 'amaderado', terroso: 'amaderado', terrosa: 'amaderado',
  // ámbar / resinas (soporte)
  estoraque: 'ambarado', ambrox: 'ambarado', lentisco: 'ambarado',
  // especiados
  alcaravea: 'especiado', especia: 'especiado', especiado: 'especiado',
  especiada: 'especiado', casia: 'especiado',
  // dulces / gourmand
  malvavisco: 'dulce', gourmand: 'dulce', 'frutos secos': 'dulce', almendra: 'dulce',
  azucarado: 'dulce', azucarada: 'dulce', cacao: 'dulce', lactonica: 'dulce',
  crema: 'dulce', mascarpone: 'dulce', castana: 'dulce', licor: 'dulce',
  // cuero
  gamuza: 'cuero',
  // almizcle (soporte)
  algalia: 'almizcle', atalcada: 'almizcle',
  // almizcle (soporte)
  almizcle: 'almizcle', musk: 'almizcle', 'almizcle blanco': 'almizcle'
};

// ─── Normalización ──────────────────────────────────────────────
function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Minúsculas, sin tildes, sin puntuación (conserva guiones), espacios simples
function normalizeNote(text) {
  return stripAccents(String(text).toLowerCase())
    .replace(/[^a-z0-9\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Variantes de singular/plural de una palabra. Dos palabras "coinciden" si
// comparten alguna variante: almizcles ≈ almizcle, florales ≈ floral, limones ≈ limon.
function variants(t) {
  const v = new Set([t]);
  if (t.length > 3 && t.endsWith('s'))  v.add(t.slice(0, -1));
  if (t.length > 4 && t.endsWith('es')) v.add(t.slice(0, -2));
  return v;
}

function sameWord(a, b) {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

function toTokens(norm) {
  return norm.split(' ').filter(Boolean).map(variants);
}

// ─── Índice del diccionario ────────────────────────────────────
// Se construye una sola vez. Las claves más largas se prueban primero,
// así "palo de rosa" gana sobre "rosa" y "notas acuaticas" sobre "notas".
const INDEX = Object.entries(NOTE_FAMILIES)
  .map(([key, fam]) => ({ key: normalizeNote(key), tokens: toTokens(normalizeNote(key)), fam }))
  .filter(e => e.tokens.length > 0)
  .sort((a, b) =>
    b.tokens.length - a.tokens.length ||
    b.key.length - a.key.length
  );

// ¿Aparece la secuencia `seq` completa y contigua dentro de `tokens`?
function containsSequence(tokens, seq) {
  if (seq.length > tokens.length) return false;
  for (let i = 0; i <= tokens.length - seq.length; i++) {
    let ok = true;
    for (let j = 0; j < seq.length; j++) {
      if (!sameWord(tokens[i + j], seq[j])) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

// ─── Búsqueda en el diccionario ────────────────────────────────
const _unknownNotes = new Set();

function lookupFamily(raw) {
  const tokens = toTokens(normalizeNote(raw));
  if (tokens.length === 0) return null;

  // Solo palabras completas: "sal" no coincide con "salvia"
  for (const entry of INDEX) {
    if (containsSequence(tokens, entry.tokens)) return entry.fam;
  }
  _unknownNotes.add(String(raw).trim());
  return null;
}

// ─── Análisis de un producto ───────────────────────────────────
export function analyzeProduct(p) {
  const levels = [
    { notes: p.top,   position: 'top'   },
    { notes: p.heart, position: 'heart' },
    { notes: p.base,  position: 'base'  }
  ];

  let total = 0, recognized = 0, axisWeightSum = 0;
  const familyScores = {};
  const axisSums = { momento: 0, clima: 0, formalidad: 0 };
  const unknown = [];

  for (const { notes, position } of levels) {
    if (!notes) continue;
    for (const chunk of String(notes).split(/[,;]/)) {
      const note = chunk.trim();
      if (!note) continue;
      total++;

      const fam = lookupFamily(note);
      const famData = fam && FAMILIES[fam];
      if (!famData) { unknown.push(note); continue; }
      recognized++;

      const factor = famData.support ? SUPPORT_FACTOR : 1;

      // Carácter
      familyScores[fam] = (familyScores[fam] || 0) + CHAR_WEIGHTS[position] * factor;

      // Ejes (numerador y denominador usan el mismo peso)
      const w = AXIS_WEIGHTS[position] * factor;
      axisWeightSum += w;
      axisSums.momento    += famData.momento    * w;
      axisSums.clima      += famData.clima      * w;
      axisSums.formalidad += famData.formalidad * w;
    }
  }

  if (total === 0 || recognized < MIN_RECOGNIZED || axisWeightSum === 0) {
    return { confident: false, families: [], momento: null, clima: null, formalidad: null, unknown };
  }

  // Familias dominantes: hasta 3, y solo las que llegan a la fracción mínima del líder
  const ranked = Object.entries(familyScores).sort((a, b) => b[1] - a[1]);
  const topScore = ranked[0][1];
  const families = ranked
    .filter(([, score]) => score >= topScore * CHAR_MIN_RATIO)
    .slice(0, CHAR_MAX_FAMILIES)
    .map(([fam]) => fam);

  const decideAxis = (sum) => {
    const v = sum / axisWeightSum;               // normalizado: -2 … +2
    return Math.abs(v) < AXIS_THRESHOLD ? 'versatil' : (v > 0 ? 'positivo' : 'negativo');
  };

  return {
    confident: true,
    families,
    momento:    decideAxis(axisSums.momento),
    clima:      decideAxis(axisSums.clima),
    formalidad: decideAxis(axisSums.formalidad),
    unknown
  };
}

// ─── Construcción de la frase de carácter ─────────────────────
export function buildCharacterLine(analysis) {
  if (!analysis || !analysis.confident) return '';
  const labels = analysis.families.map(f => FAMILIES[f] && FAMILIES[f].label).filter(Boolean);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} y ${labels[2]}`;
}

// ─── Construcción de la frase de uso ──────────────────────────
const MOMENTO_TEXT    = { positivo: 'de día',             negativo: 'de noche',            versatil: 'de día o de noche' };
const CLIMA_TEXT      = { positivo: 'climas cálidos',     negativo: 'climas fríos',        versatil: 'climas templados' };
const FORMALIDAD_TEXT = { positivo: 'ocasiones casuales', negativo: 'ocasiones formales',  versatil: 'ocasiones variadas' };

export function buildUsagePhrase(analysis) {
  if (!analysis || !analysis.confident) return '';

  const mom  = MOMENTO_TEXT[analysis.momento];
  const cli  = CLIMA_TEXT[analysis.clima];
  const form = FORMALIDAD_TEXT[analysis.formalidad];

  return `Ideal ${mom}, en ${cli}; ${form}.`;
}

// ─── Reporte de notas desconocidas ─────────────────────────────
export function getUnknownNotes() {
  return [..._unknownNotes].sort();
}

export function logUnknownNotes() {
  const list = getUnknownNotes();
  if (list.length) {
    console.warn(`[perfil] ${list.length} notas sin familia. Agréguelas a NOTE_FAMILIES:`);
    console.table(list);
  } else {
    console.info('[perfil] Todas las notas están cubiertas.');
  }
}