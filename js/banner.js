// Carrusel de banners con rotación automática, flechas, puntos y swipe.
import { escapeHtml } from './utils.js';

let slides = [];
let currentIndex = 0;
let intervalId = null;
let intervalSeconds = 6;
let isHovered = false;
let isFocused = false;
let isReducedMotion = false;
let touchStartX = 0;
let touchEndX = 0;

function renderBanners() {
  const section = document.getElementById('banner-section');
  if (!slides.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;

  const track = document.getElementById('banner-track');
  track.innerHTML = slides.map((b, i) => `
    <div class="banner-slide ${i === 0 ? 'active' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} de ${slides.length}">
      <div class="banner-bg">
        <picture>
          ${b.image_mobile_url ? `<source media="(max-width: 800px)" srcset="${escapeHtml(b.image_mobile_url)}">` : ''}
          <img class="banner-img" src="${escapeHtml(b.image_url)}" alt="${escapeHtml(b.title || 'Promoción')}" loading="${i === 0 ? 'eager' : 'lazy'}">
        </picture>
      </div>
      <div class="banner-content">
        ${b.title ? `<h2 class="banner-title">${escapeHtml(b.title)}</h2>` : ''}
        ${b.subtitle ? `<p class="banner-subtitle">${escapeHtml(b.subtitle)}</p>` : ''}
        ${b.cta_text && b.cta_link ? `<a href="${escapeHtml(b.cta_link)}" class="button">${escapeHtml(b.cta_text)}</a>` : ''}
      </div>
    </div>
  `).join('');

  if (slides.length > 1) {
    document.getElementById('banner-prev').hidden = false;
    document.getElementById('banner-next').hidden = false;
    document.getElementById('banner-dots').hidden = false;
    document.getElementById('banner-dots').innerHTML = slides.map((_, i) =>
      `<button class="banner-dot ${i === 0 ? 'active' : ''}" role="tab" aria-selected="${i === 0}" aria-label="Banner ${i + 1}" data-index="${i}"></button>`
    ).join('');
  }
}

function goToSlide(index) {
  if (!slides.length) return;
  if (index >= slides.length) index = 0;
  if (index < 0) index = slides.length - 1;

  const slideElements = document.querySelectorAll('.banner-slide');
  const dots = document.querySelectorAll('.banner-dot');

  slideElements.forEach((el, i) => { el.classList.toggle('active', i === index); });
  dots.forEach((el, i) => {
    el.classList.toggle('active', i === index);
    el.setAttribute('aria-selected', String(i === index));
  });

  currentIndex = index;
  resetInterval();
}

function startInterval() {
  if (intervalId || slides.length <= 1 || isReducedMotion) return;
  intervalId = setInterval(() => {
    if (!isHovered && !isFocused && document.visibilityState === 'visible') goToSlide(currentIndex + 1);
  }, intervalSeconds * 1000);
}

function stopInterval() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

function resetInterval() {
  stopInterval();
  startInterval();
}

// Recibe los slides directamente, sin hacer fetch
export function initBanner(config, bannerData) {
  slides = bannerData;
  if (!slides || !slides.length) return;

  intervalSeconds = Number(config.banner_interval_seconds) || 6;
  isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderBanners();
  
  if (slides.length > 1) {
    document.getElementById('banner-prev').addEventListener('click', () => { goToSlide(currentIndex - 1); document.getElementById('banner-section').setAttribute('aria-live', 'polite'); });
    document.getElementById('banner-next').addEventListener('click', () => { goToSlide(currentIndex + 1); document.getElementById('banner-section').setAttribute('aria-live', 'polite'); });
    document.getElementById('banner-dots').addEventListener('click', (e) => {
      const btn = e.target.closest('.banner-dot');
      if (btn) { goToSlide(Number(btn.dataset.index)); document.getElementById('banner-section').setAttribute('aria-live', 'polite'); }
    });

    document.getElementById('banner-section').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { goToSlide(currentIndex - 1); document.getElementById('banner-section').setAttribute('aria-live', 'polite'); }
      if (e.key === 'ArrowRight') { goToSlide(currentIndex + 1); document.getElementById('banner-section').setAttribute('aria-live', 'polite'); }
    });

    const section = document.getElementById('banner-section');
    section.addEventListener('mouseenter', () => { isHovered = true; });
    section.addEventListener('mouseleave', () => { isHovered = false; });
    section.addEventListener('focusin', () => { isFocused = true; });
    section.addEventListener('focusout', () => { isFocused = false; });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') startInterval();
      else stopInterval();
    });

    section.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    section.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) goToSlide(currentIndex + 1);
      else if (touchEndX - touchStartX > 50) goToSlide(currentIndex - 1);
    }, { passive: true });

    startInterval();
  }
}