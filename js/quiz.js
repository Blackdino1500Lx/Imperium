// Cuestionario olfativo: siete pasos y un perfil recomendado.
import { escapeHtml } from './utils.js';

let config = {};
let quizIndex = 0;
let quizAnswers = {};

const FAMILY_LABELS = { citricos: 'Cítricos', florales: 'Florales', dulces: 'Dulces', amaderados: 'Amaderados', frescos: 'Frescos / acuáticos', herbales: 'Herbales', especiados: 'Especiados', frutales: 'Frutales' };

const QUIZ_STEPS = [
  { key: 'families', title: '¿Qué familias te gustan?', help: 'Elige de una a tres. Puedes combinar aromas distintos.', multiple: true, options: Object.entries(FAMILY_LABELS).map(([value, label]) => ({ value, label, weights: {} })) },
  { key: 'sensation', title: '¿Qué sensación buscas?', options: [
    { value: 'ligera', label: 'Ligera y limpia', weights: { frescos: 2, citricos: 1 } },
    { value: 'calida', label: 'Cálida y envolvente', weights: { dulces: 2, amaderados: 1 } },
    { value: 'suave', label: 'Suave y delicada', weights: { florales: 2, herbales: 1 } },
    { value: 'intensa', label: 'Intensa y profunda', weights: { especiados: 2, amaderados: 1 } },
    { value: 'vibrante', label: 'Vibrante y luminosa', weights: { frutales: 2, citricos: 1 } }
  ] },
  { key: 'personality', title: '¿Con qué personalidad te identificas?', options: [
    { value: 'serena', label: 'Serena', weights: { herbales: 2, frescos: 1 } },
    { value: 'romantica', label: 'Romántica', weights: { florales: 2, dulces: 1 } },
    { value: 'segura', label: 'Segura', weights: { amaderados: 2, especiados: 1 } },
    { value: 'espontanea', label: 'Espontánea', weights: { frutales: 2, citricos: 1 } },
    { value: 'reservada', label: 'Reservada', weights: { amaderados: 1, herbales: 1 } }
  ] },
  { key: 'style', title: '¿Cuál es tu estilo?', options: [
    { value: 'minimalista', label: 'Minimalista', weights: { frescos: 2, herbales: 1 } },
    { value: 'clasico', label: 'Clásico', weights: { amaderados: 2, florales: 1 } },
    { value: 'natural', label: 'Natural', weights: { herbales: 2, citricos: 1 } },
    { value: 'contemporaneo', label: 'Contemporáneo', weights: { frutales: 2, frescos: 1 } },
    { value: 'llamativo', label: 'Con presencia', weights: { especiados: 2, dulces: 1 } }
  ] },
  { key: 'occasion', title: '¿Cuándo lo usarías más?', options: [
    { value: 'diario', label: 'Todos los días', weights: { frescos: 2, citricos: 1 } },
    { value: 'trabajo', label: 'Trabajo o estudio', weights: { herbales: 1, frescos: 1 } },
    { value: 'noche', label: 'Salidas de noche', weights: { especiados: 2, dulces: 1 } },
    { value: 'especial', label: 'Una ocasión especial', weights: { amaderados: 1, florales: 1 } },
    { value: 'airelibre', label: 'Al aire libre', weights: { citricos: 2, herbales: 1 } },
    { value: 'versatil', label: 'Distintas ocasiones', weights: { frescos: 1, amaderados: 1 } }
  ] },
  { key: 'presentation', title: '¿Qué presentación prefieres?', help: 'Es una preferencia; el tamaño disponible se confirma para cada perfume.', options: [
    { value: 'pequena', label: 'Pequeña, hasta 50 ml', weights: {} },
    { value: 'mediana', label: 'Media, de 50 a 100 ml', weights: {} },
    { value: 'grande', label: 'Grande, más de 100 ml', weights: {} },
    { value: 'indiferente', label: 'Sin preferencia', weights: {} }
  ] },
  { key: 'intensity', title: '¿Cuánta presencia quieres?', options: [
    { value: 'discreta', label: 'Discreta, cerca de la piel', weights: {} },
    { value: 'equilibrada', label: 'Equilibrada', weights: {} },
    { value: 'marcada', label: 'Marcada', weights: {} }
  ] }
];

// Etiqueta legible de una opción del cuestionario.
function quizLabel(key, value) {
  return QUIZ_STEPS.find(s => s.key === key)?.options.find(o => o.value === value)?.label || '';
}

// Calcula el perfil a partir de las respuestas y devuelve textos listos.
function recommendProfile(answers) {
  const chosen = [...new Set(answers.families || [])].filter(f => Object.prototype.hasOwnProperty.call(FAMILY_LABELS, f));
  if (!chosen.length) throw new Error('Elige al menos una familia olfativa.');
  const scores = Object.fromEntries(Object.keys(FAMILY_LABELS).map(f => [f, 0]));
  chosen.forEach(f => scores[f] += 12);
  for (const step of QUIZ_STEPS.slice(1)) {
    const option = step.options.find(o => o.value === answers[step.key]);
    if (!option) throw new Error('Completa todas las respuestas.');
    for (const [family, weight] of Object.entries(option.weights)) scores[family] += weight;
  }
  const order = Object.keys(scores).sort((a, b) => scores[b] - scores[a] || chosen.indexOf(a) - chosen.indexOf(b));
  const primary = order[0], secondary = order[1];
  const descriptions = {
    citricos: 'Un perfil luminoso, con una apertura cítrica.',
    florales: 'Un perfil floral, con un carácter suave y expresivo.',
    dulces: 'Un perfil dulce, de carácter cálido y envolvente.',
    amaderados: 'Un perfil amaderado, con profundidad y una base definida.',
    frescos: 'Un perfil fresco o acuático, de sensación limpia y ligera.',
    herbales: 'Un perfil herbal, con matices verdes y naturales.',
    especiados: 'Un perfil especiado, de carácter cálido y con presencia.',
    frutales: 'Un perfil frutal, con un carácter vivo y jugoso.'
  };
  return {
    primary, secondary,
    title: FAMILY_LABELS[primary] + ' con matices ' + FAMILY_LABELS[secondary].toLowerCase(),
    description: descriptions[primary],
    chosen: chosen.map(f => FAMILY_LABELS[f]).join(', '),
    intensity: quizLabel('intensity', answers.intensity),
    occasion: quizLabel('occasion', answers.occasion),
    presentation: quizLabel('presentation', answers.presentation)
  };
}

// Pinta el paso actual del cuestionario y mueve el foco si se pide.
function renderQuiz(focus = false) {
  const step = QUIZ_STEPS[quizIndex];
  const value = quizAnswers[step.key] || (step.multiple ? [] : '');
  document.getElementById('profile-quiz').hidden = false;
  document.getElementById('quiz-result').hidden = true;
  document.getElementById('quiz-error').hidden = true;
  document.getElementById('quiz-progress').textContent = 'Paso ' + (quizIndex + 1) + ' de ' + QUIZ_STEPS.length;
  document.getElementById('quiz-step').innerHTML = '<fieldset class="quiz-fieldset"><legend id="quiz-question" tabindex="-1">' + step.title + '</legend><p id="quiz-help" class="quiz-help">' + (step.help || 'Elige la opción que mejor te represente.') + '</p><div class="quiz-options">' +
    step.options.map(o => '<label class="quiz-option"><input type="' + (step.multiple ? 'checkbox' : 'radio') + '" name="quiz-' + step.key + '" value="' + o.value + '" aria-describedby="quiz-help"' + ((step.multiple ? value.includes(o.value) : value === o.value) ? ' checked' : '') + '><span>' + o.label + '</span></label>').join('') +
    '</div></fieldset>';
  document.getElementById('quiz-back').hidden = quizIndex === 0;
  document.getElementById('quiz-next').textContent = quizIndex === QUIZ_STEPS.length - 1 ? 'Ver mi perfil' : 'Continuar';
  if (focus) document.getElementById('quiz-question').focus({ preventScroll: true });
}

// Valida la respuesta del paso actual y la guarda.
function captureQuizAnswer() {
  const step = QUIZ_STEPS[quizIndex];
  const selected = [...document.getElementById('quiz-step').querySelectorAll('input:checked')].map(input => input.value);
  if (!selected.length || (step.multiple && selected.length > 3)) {
    document.getElementById('quiz-error').textContent = step.multiple ? 'Elige de una a tres familias para continuar.' : 'Elige una opción para continuar.';
    document.getElementById('quiz-error').hidden = false;
    return false;
  }
  quizAnswers[step.key] = step.multiple ? selected : selected[0];
  return true;
}

// Muestra el resultado final con enlaces a WhatsApp y al catálogo.
function renderProfileResult() {
  const profile = recommendProfile(quizAnswers);
  const message = 'Hola, Imperium. Mi perfil recomendado es ' + profile.title + '. Familias: ' + profile.chosen + '. Sensación: ' + quizLabel('sensation', quizAnswers.sensation) + '. Personalidad: ' + quizLabel('personality', quizAnswers.personality) + '. Estilo: ' + quizLabel('style', quizAnswers.style) + '. Ocasión: ' + profile.occasion + '. Presentación: ' + profile.presentation + '. Presencia: ' + profile.intensity + '. ¿Qué perfumes me recomiendan?';
  document.getElementById('profile-quiz').hidden = true;
  document.getElementById('quiz-result').hidden = false;
  document.getElementById('quiz-result').innerHTML =
    '<h3 id="quiz-result-title" tabindex="-1">' + escapeHtml(profile.title) + '</h3>' +
    '<p>' + escapeHtml(profile.description) + ' La familia principal sigue tus preferencias; los matices consideran la sensación, personalidad, estilo y ocasión que elegiste.</p>' +
    '<dl class="product-facts">' + [['Tus familias', profile.chosen], ['Presencia', profile.intensity], ['Ocasión', profile.occasion], ['Presentación', profile.presentation]].map(([label, value]) => '<div class="fact-row"><dt>' + label + '</dt><dd>' + escapeHtml(value) + '</dd></div>').join('') + '</dl>' +
    '<p>Este perfil orienta tu elección. Confirmamos contigo las notas, el tamaño y la disponibilidad de cada perfume.</p>' +
    '<div class="quiz-result-actions"><a class="button ink" href="https://wa.me/' + String(config.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(message) + '" target="_blank" rel="noopener noreferrer">Consultar mi perfil</a><a class="button" href="#catalogo">Ver catálogo</a><button id="quiz-restart" class="text-button" type="button">Volver a responder</button></div>';
  document.getElementById('quiz-result-title').focus({ preventScroll: true });
}

// Inicializa el cuestionario y conecta submit, volver y reinicio.
export function initQuiz(settings) {
  config = settings;
  document.getElementById('profile-quiz').addEventListener('submit', event => {
    event.preventDefault();
    if (!captureQuizAnswer()) return;
    if (quizIndex < QUIZ_STEPS.length - 1) { quizIndex++; renderQuiz(true); }
    else renderProfileResult();
  });
  document.getElementById('quiz-back').addEventListener('click', () => {
    const step = QUIZ_STEPS[quizIndex];
    const selected = [...document.getElementById('quiz-step').querySelectorAll('input:checked')].map(i => i.value);
    quizAnswers[step.key] = step.multiple ? selected : (selected[0] || '');
    quizIndex = Math.max(0, quizIndex - 1);
    renderQuiz(true);
  });
  document.getElementById('quiz-result').addEventListener('click', event => {
    if (event.target.closest('#quiz-restart')) { quizAnswers = {}; quizIndex = 0; renderQuiz(true); }
  });
  renderQuiz();
}