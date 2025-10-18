// js/carousel.js
document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.getElementById('galleryCarousel');
  const prevBtn = document.querySelector('.carousel-control.prev');
  const nextBtn = document.querySelector('.carousel-control.next');

  if (!carousel || !prevBtn || !nextBtn) {
    console.error('Carousel elements not found');
    return;
  }

  const items = Array.from(carousel.querySelectorAll('.netflix-item'));
  if (!items.length) {
    console.warn('Carousel has no items to display.');
    return;
  }

  items.forEach((item) => item.classList.add('reveal-ready'));

  let itemStep = 0;
  let scrollTimeout;

  const srStatus = document.createElement('div');
  srStatus.className = 'visually-hidden carousel-status';
  srStatus.setAttribute('aria-live', 'polite');
  srStatus.setAttribute('aria-atomic', 'true');
  prevBtn.parentElement?.appendChild(srStatus);

  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { root: null, threshold: 0.2 }
    );

    items.forEach((item) => observer.observe(item));
  } else {
    items.forEach((item) => item.classList.add('is-visible'));
  }

  function measureStep() {
    const first = items[0];
    if (!first) return;
    const rect = first.getBoundingClientRect();
    const computed = window.getComputedStyle(carousel);
    const gap = parseFloat(computed.columnGap || computed.gap || 0);
    itemStep = rect.width + gap;
  }

  function updateControls() {
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const atStart = carousel.scrollLeft <= 1;
    const atEnd = carousel.scrollLeft >= maxScroll - 1;
    prevBtn.disabled = atStart;
    prevBtn.setAttribute('aria-disabled', String(atStart));
    nextBtn.disabled = atEnd;
    nextBtn.setAttribute('aria-disabled', String(atEnd));
  }

  function announceCurrent() {
    const midpoint = carousel.scrollLeft + carousel.clientWidth / 2;
    let closest = items[0];
    let minDelta = Infinity;

    items.forEach((item) => {
      const center = item.offsetLeft + item.offsetWidth / 2;
      const delta = Math.abs(midpoint - center);
      if (delta < minDelta) {
        minDelta = delta;
        closest = item;
      }
    });

    const caption = closest.querySelector('figcaption');
    if (caption) {
      srStatus.textContent = `Showing ${caption.textContent.trim()}`;
    }
  }

  function scrollCarousel(direction) {
    if (!itemStep) measureStep();
    if (!itemStep) return;
    carousel.scrollBy({ left: direction * itemStep, behavior: 'smooth' });
  }

  prevBtn.addEventListener('click', () => scrollCarousel(-1));
  nextBtn.addEventListener('click', () => scrollCarousel(1));

  carousel.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        scrollCarousel(1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        scrollCarousel(-1);
        break;
      case 'Home':
        event.preventDefault();
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
        break;
      case 'End':
        event.preventDefault();
        carousel.scrollTo({ left: carousel.scrollWidth, behavior: 'smooth' });
        break;
      default:
        break;
    }
  });

  carousel.addEventListener('scroll', () => {
    window.clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      updateControls();
      announceCurrent();
    }, 120);
  });

  window.addEventListener('resize', () => {
    measureStep();
    updateControls();
    primeInitialItems();
  });

  function primeInitialItems() {
    if (!items.length) return;
    const referenceWidth = items[0].offsetWidth || itemStep || 1;
    const visibleCount = Math.max(1, Math.ceil(carousel.clientWidth / referenceWidth));
    items.forEach((item, index) => {
      if (index < visibleCount + 1) {
        item.classList.add('is-visible');
      }
    });
  }

  measureStep();
  primeInitialItems();
  updateControls();
  announceCurrent();
});
