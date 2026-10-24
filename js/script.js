document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.mobile-toggle');
  const menu = document.querySelector('.mobile-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('is-open', !open);
      menu.setAttribute('aria-hidden', String(open));
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        menu.setAttribute('aria-hidden', 'true');
      });
    });
  }

  document.querySelectorAll('.taste-card').forEach(card => {
    card.addEventListener('click', () => {
      const taste = card.dataset.taste || '';
      document.querySelectorAll('.taste-card').forEach(item => item.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('.taste-image')?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }],
        { duration: 320, easing: 'ease-out' }
      );
      console.log(`Выбран вкус: ${taste}`);
    });
  });
});
/* ====== Галерея десертов: infinite loop + autoplay + drag ====== */
(function initGallery() {
  const shell = document.querySelector('[data-carousel]');
  const track = document.querySelector('[data-track]');
  if (!shell || !track) return;

  // 1. Разметка оригиналов ДО клонирования
  const originals = Array.from(track.querySelectorAll('.dessert-card'));
  if (!originals.length) return;

  const patterns = [
    '',
    'translateY(12px) rotate(-1deg)',
    'translateY(-8px) rotate(.8deg)',
    '',
    'translateY(16px) rotate(-1.5deg)',
  ];
  originals.forEach((el, i) => {
    const t = patterns[i % patterns.length];
    if (t) el.style.transform = t;
    if (i % 2 === 1) el.classList.add('dessert-card--circle');
  });

  // 2. Клоны
  const CLONES = 3;
  originals.slice(-CLONES).reverse().forEach((n) => {
    track.insertBefore(n.cloneNode(true), track.firstChild);
  });
  originals.slice(0, CLONES).forEach((n) => {
    track.appendChild(n.cloneNode(true));
  });

  // 3. ТЕПЕРЬ грузим картинки во все карточки — и в оригиналы, и в клоны
  track.querySelectorAll('.image-placeholder').forEach((el) => {
    const src = el.dataset.src;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      el.style.backgroundImage = `url("${src}")`;
      el.classList.add('has-image');
    };
    img.src = src;
  });

  const cards = track.querySelectorAll('.dessert-card');
  const realStart = CLONES;
  const realEnd = CLONES + originals.length - 1;
  let currentIndex = realStart;

  const stepWidth = () => {
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    return cards[0].getBoundingClientRect().width + gap;
  };

  const setTransform = (animate) => {
    if (!animate) track.style.transition = 'none';
    track.style.transform = `translateX(${-currentIndex * stepWidth()}px)`;
    if (!animate) {
      void track.offsetWidth;
      track.style.transition = '';
    }
  };

  const goNext = () => {
    currentIndex++;
    setTransform(true);
    if (currentIndex > realEnd) {
      track.addEventListener('transitionend', function onEnd() {
        track.removeEventListener('transitionend', onEnd);
        currentIndex = realStart;
        setTransform(false);
      });
    }
  };

  const goPrev = () => {
    currentIndex--;
    setTransform(true);
    if (currentIndex < realStart) {
      track.addEventListener('transitionend', function onEnd() {
        track.removeEventListener('transitionend', onEnd);
        currentIndex = realEnd;
        setTransform(false);
      });
    }
  };

  // 4. Стрелки
  document.querySelector('[data-prev]')?.addEventListener('click', () => {
    goPrev(); restartAutoplay();
  });
  document.querySelector('[data-next]')?.addEventListener('click', () => {
    goNext(); restartAutoplay();
  });

  // 5. Drag
  let isDown = false, startX = 0, startTranslate = 0, moved = false;
  track.addEventListener('pointerdown', (e) => {
    isDown = true;
    moved = false;
    startX = e.clientX;
    startTranslate = -currentIndex * stepWidth();
    track.classList.add('is-dragging');
    track.style.transition = 'none';
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    track.style.transform = `translateX(${startTranslate + dx}px)`;
  });
  const endDrag = (e) => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('is-dragging');
    track.style.transition = '';
    const dx = e.clientX - startX;
    if (Math.abs(dx) > stepWidth() / 3) {
      dx < 0 ? goNext() : goPrev();
    } else {
      setTransform(true);
    }
    if (moved) restartAutoplay();
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  // 6. Автопрокрутка
  let timer;
  const startAutoplay = () => { timer = setInterval(goNext, 3500); };
  const stopAutoplay  = () => clearInterval(timer);
  const restartAutoplay = () => { stopAutoplay(); startAutoplay(); };

  startAutoplay();
  shell.addEventListener('mouseenter', stopAutoplay);
  shell.addEventListener('mouseleave', startAutoplay);

  window.addEventListener('resize', () => setTransform(false));

  setTransform(false);
})();
/* ====== Слайдер кондитеров ====== */
(function initChefs() {
  const slides = document.querySelectorAll('[data-chef-slide]');
  const dots = document.querySelectorAll('[data-chef-to]');
  if (!slides.length || !dots.length) return;

  const go = (i) => {
    slides.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
    dots.forEach((d, idx) => {
      d.classList.toggle('is-active', idx === i);
      d.setAttribute('aria-selected', idx === i ? 'true' : 'false');
    });
  };

  dots.forEach((d) => d.addEventListener('click', () => go(+d.dataset.chefTo)));
})();

/* ====== Слайдер товаров ====== */
/* ====== Слайдер товаров: бесконечный цикл + автопрокрутка ====== */
(function initProducts() {
  const track = document.querySelector('[data-products-track]');
  const viewport = document.querySelector('[data-products-viewport]');
  if (!track || !viewport) return;

  const originals = Array.from(track.querySelectorAll('.product-card'));
  if (!originals.length) return;

  const CLONES = 2;

  // клоны в начало (последние карточки)
  originals.slice(-CLONES).reverse().forEach((node) => {
    track.insertBefore(node.cloneNode(true), track.firstChild);
  });
  // клоны в конец (первые карточки)
  originals.slice(0, CLONES).forEach((node) => {
    track.appendChild(node.cloneNode(true));
  });

  const cards = track.querySelectorAll('.product-card');
  const realStart = CLONES;
  const realEnd = CLONES + originals.length - 1;
  let currentIndex = realStart;

  const stepWidth = () => {
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    return cards[0].getBoundingClientRect().width + gap;
  };

  const setTransform = (animate) => {
    if (!animate) track.style.transition = 'none';
    track.style.transform = `translateX(${-currentIndex * stepWidth()}px)`;
    if (!animate) {
      void track.offsetWidth;            // force reflow
      track.style.transition = '';
    }
  };

  const goNext = () => {
    currentIndex++;
    setTransform(true);
    if (currentIndex > realEnd) {
      track.addEventListener('transitionend', function onEnd() {
        track.removeEventListener('transitionend', onEnd);
        currentIndex = realStart;
        setTransform(false);
      });
    }
  };

  const goPrev = () => {
    currentIndex--;
    setTransform(true);
    if (currentIndex < realStart) {
      track.addEventListener('transitionend', function onEnd() {
        track.removeEventListener('transitionend', onEnd);
        currentIndex = realEnd;
        setTransform(false);
      });
    }
  };

  document.querySelector('[data-product-dir="next"]')?.addEventListener('click', () => {
    goNext();
    restartAutoplay();
  });
  document.querySelector('[data-product-dir="prev"]')?.addEventListener('click', () => {
    goPrev();
    restartAutoplay();
  });

  // ===== Автопрокрутка =====
  let timer;
  const startAutoplay = () => { timer = setInterval(goNext, 4000); };
  const stopAutoplay = () => clearInterval(timer);
  const restartAutoplay = () => { stopAutoplay(); startAutoplay(); };

  startAutoplay();
  viewport.addEventListener('mouseenter', stopAutoplay);
  viewport.addEventListener('mouseleave', startAutoplay);

  window.addEventListener('resize', () => setTransform(false));

  setTransform(false);
})();
// FAQ: two pages + accordion
const faqSection = document.querySelector('#faq');
if (faqSection) {
  const pages = Array.from(faqSection.querySelectorAll('[data-faq-page]'));
  const buttons = Array.from(faqSection.querySelectorAll('[data-faq-to]'));
  let pageIndex = 0;

  const resetPageAccordions = (page) => {
    page.querySelectorAll('.faq-item').forEach((item, itemIndex) => {
      const question = item.querySelector('.faq-question');
      const open = pageIndex === 0 && itemIndex === 0 && page === pages[0];
      item.classList.toggle('is-open', open);
      if (question) question.setAttribute('aria-expanded', String(open));
    });
  };

  const showFaqPage = (nextIndex) => {
    pageIndex = (nextIndex + pages.length) % pages.length;
    pages.forEach((page, index) => {
      const active = index === pageIndex;
      page.hidden = !active;
      page.classList.toggle('is-active', active);
      if (active) resetPageAccordions(page);
    });
    buttons.forEach((button, index) => {
      const active = index === pageIndex;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  };

  faqSection.querySelectorAll('.faq-question').forEach((question) => {
    question.addEventListener('click', () => {
      const item = question.closest('.faq-item');
      if (!item) return;
      const page = item.closest('.faq-page');
      const isOpen = item.classList.contains('is-open');

      // One open answer at a time inside the current FAQ page.
      if (page) {
        page.querySelectorAll('.faq-item.is-open').forEach((openItem) => {
          if (openItem !== item) {
            openItem.classList.remove('is-open');
            const openQuestion = openItem.querySelector('.faq-question');
            if (openQuestion) openQuestion.setAttribute('aria-expanded', 'false');
          }
        });
      }

      item.classList.toggle('is-open', !isOpen);
      question.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  buttons.forEach((button) => {
    button.addEventListener('click', () => showFaqPage(Number(button.dataset.faqTo)));
  });

  showFaqPage(0);
}
/* ====== Медленная плавная прокрутка по кнопке «листать» ====== */
(function initScrollCue() {
  const cue = document.querySelector('.scroll-cue');
  if (!cue) return;

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function slowScrollTo(targetY, duration) {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const startTime = performance.now();
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + diff * easeInOutCubic(t));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        html.style.scrollBehavior = prev;
      }
    }
    requestAnimationFrame(step);
  }

  cue.addEventListener('click', () => {
    // Прокрутка до самого низа страницы
    const targetY = document.documentElement.scrollHeight - window.innerHeight;
    // Длительность зависит от расстояния — чтобы не было слишком быстро на длинной странице
    const distance = Math.abs(targetY - window.scrollY);
    const duration = Math.min(18000, Math.max(4800, distance * 4.2));
    slowScrollTo(targetY, duration);
  });
})();
/* ====== Newsletter: AJAX-отправка в Formspree ====== */
(function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  const button = form.querySelector('button[type="submit"]');
  const originalText = button.textContent;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // простая валидация браузера
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    button.disabled = true;
    button.textContent = 'Отправляем...';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        button.textContent = 'Спасибо! Подписка оформлена';
        button.style.background = 'var(--caramel)';
        button.style.color = 'var(--chocolate)';
        form.reset();

        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '';
          button.style.color = '';
        }, 4000);
      } else {
        const data = await response.json().catch(() => ({}));
        button.textContent = 'Ошибка. Попробуйте ещё раз';
        button.style.background = '#a25a4f';
        console.error('Formspree error:', data);

        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '';
        }, 4000);
      }
    } catch (err) {
      console.error('Network error:', err);
      button.textContent = 'Ошибка сети';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 4000);
    } finally {
      button.disabled = false;
    }
  });
})();