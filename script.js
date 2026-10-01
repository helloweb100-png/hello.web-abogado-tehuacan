/* ==========================================================================
   Lic. Juan Manuel Vicente Escobar · Despacho jurídico · Tehuacán, Puebla
   JS vanilla + GSAP/ScrollTrigger (CDN) solo para los efectos ligados al
   scroll. Si GSAP no carga o el usuario prefiere menos movimiento, la página
   funciona igual (reveals con IntersectionObserver y galería nativa).
   ========================================================================== */
(() => {
  'use strict';

  /* ----- Configuración (único lugar para cambiar datos de contacto) ----- */
  const CONFIG = {
    phone: '522361141122', // 52 + lada 236 + 114 11 22
    lawyer: 'Lic. Juan Manuel Vicente Escobar',
    defaultMessage: 'Hola, Lic. Juan Manuel Vicente Escobar. Me gustaría solicitar asesoría legal.'
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const waUrl = (text) => `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(text)}`;
  const hasGsap = () => Boolean(window.gsap && window.ScrollTrigger);
  let fx = false; // true cuando los efectos de scroll con GSAP están activos

  /* ======================================================================
     0. Texto por palabras (títulos con máscara y cita con brillo progresivo)
     ====================================================================== */
  function initSplit() {
    $$('[data-split]').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach((word, i) => {
        const outer = document.createElement('span');
        outer.className = 'w';
        const inner = document.createElement('span');
        inner.className = 'w-in';
        inner.style.setProperty('--wi', i);
        inner.textContent = word;
        outer.appendChild(inner);
        el.appendChild(outer);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });

    $$('[data-words]').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'sw';
        span.textContent = word;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });
  }

  /* ======================================================================
     1. Preloader de marca
     ====================================================================== */
  function initPreloader() {
    const preloader = $('#preloader');
    const minShow = reduceMotion.matches ? 500 : 1800;
    const maxShow = 5000;
    const startedAt = performance.now();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, minShow - (performance.now() - startedAt));
      setTimeout(() => {
        document.body.classList.remove('is-loading');
        root.classList.add('is-ready');
        if (hasGsap()) setTimeout(() => window.ScrollTrigger.refresh(), 80);
        if (!preloader) return;
        preloader.classList.add('is-done');
        setTimeout(() => preloader.classList.add('is-gone'), 1300);
        setTimeout(() => preloader.remove(), 1600);
        startWhatsAppTip();
      }, wait);
    };

    const pageLoaded = new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.all([pageLoaded, fontsReady]).then(finish);
    setTimeout(finish, maxShow);
  }

  /* ======================================================================
     2. WhatsApp: enlaces (una sola fuente de verdad) y globo de ayuda
     ====================================================================== */
  function initWhatsAppLinks() {
    $$('[data-wa]').forEach((a) => {
      a.href = waUrl(a.dataset.waMsg || CONFIG.defaultMessage);
    });
  }

  function startWhatsAppTip() {
    const btn = $('.wa-float');
    if (!btn || reduceMotion.matches) return;
    try { if (sessionStorage.getItem('waTipShown')) return; } catch (e) { /* almacenamiento bloqueado */ }
    setTimeout(() => {
      btn.classList.add('is-tip');
      try { sessionStorage.setItem('waTipShown', '1'); } catch (e) { /* ignorar */ }
      setTimeout(() => btn.classList.remove('is-tip'), 6500);
    }, 9000);
  }

  /* ======================================================================
     3. Header: estado "stuck", enlace activo y menú móvil
     ====================================================================== */
  function initHeader() {
    const header = $('#header');
    const toggle = $('#menu-toggle');
    const nav = $('#nav');
    if (!header) return;

    // Centinela en la parte superior: evita escuchar el scroll de window
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none;';
    document.body.prepend(sentinel);
    new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-stuck', !entry.isIntersecting);
    }).observe(sentinel);

    // Enlace activo según la sección visible en el centro del viewport
    const links = $$('.nav__link');
    const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.removeAttribute('aria-current'));
        const link = map.get(entry.target.id);
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => sectionObserver.observe(s));

    // Menú móvil
    const setMenu = (open) => {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      if (open) {
        header.classList.remove('is-hidden');
        const first = $('.nav__link', nav);
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 350);
      }
    };
    toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1120px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ======================================================================
     4. Reveals al entrar en pantalla
     ====================================================================== */
  function initReveals() {
    const items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));

    // Línea de tiempo: respaldo cuando GSAP no está activo
    const timeline = $('#timeline');
    if (timeline) {
      new IntersectionObserver(([entry], obs) => {
        if (entry.isIntersecting) { timeline.classList.add('is-in'); obs.disconnect(); }
      }, { threshold: 0.2 }).observe(timeline);
      $$('.step', timeline).forEach((step) => {
        new IntersectionObserver(([entry], obs) => {
          if (entry.isIntersecting && !fx) { step.classList.add('is-active'); obs.disconnect(); }
        }, { threshold: 0.6 }).observe(step);
      });
    }
  }

  /* ======================================================================
     5. Contadores
     ====================================================================== */
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const fmt = new Intl.NumberFormat('es-MX');
    const write = (el, value) => { el.textContent = fmt.format(Math.round(value)) + (el.dataset.suffix || ''); };

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      els.forEach((el) => write(el, Number(el.dataset.count)));
      return;
    }
    els.forEach((el) => write(el, 0));
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        const duration = 2200;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / duration, 1);
          write(el, target * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ======================================================================
     6. Polvo dorado en canvas: capas con profundidad, bokeh y destellos
     ====================================================================== */
  function makeSprite(size, inner, outer) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${inner},1)`);
    grad.addColorStop(0.3, `rgba(${outer},0.55)`);
    grad.addColorStop(1, `rgba(${outer},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function createDust(canvas, rich) {
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    const dot = makeSprite(48, '255,240,200', '226,186,106');
    const soft = makeSprite(160, '255,226,160', '212,173,99');
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let w = 0, h = 0, parts = [], raf = 0, visible = true, last = 0;

    const rand = (a, b) => a + Math.random() * (b - a);
    const make = (type) => {
      const z = rand(0.25, 1);
      return {
        type, z,
        x: rand(0, w), y: rand(0, h),
        size: type === 0 ? rand(3, 11) * z + 2 : type === 1 ? rand(50, 170) * z : rand(7, 15),
        vx: rand(-0.12, 0.12) * z,
        vy: -rand(0.1, 0.55) * z,
        ph: rand(0, Math.PI * 2),
        sp: rand(0.5, 1.7),
        a: type === 0 ? rand(0.35, 0.95) : type === 1 ? rand(0.05, 0.16) : rand(0.5, 0.95)
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dustN = Math.round(Math.min(rich ? 150 : 55, Math.max(rich ? 48 : 20, w / (rich ? 9 : 22))));
      const bokehN = rich ? Math.round(Math.min(12, Math.max(5, w / 130))) : 3;
      const glintN = rich ? 9 : 0;
      parts = [
        ...Array.from({ length: dustN }, () => make(0)),
        ...Array.from({ length: bokehN }, () => make(1)),
        ...Array.from({ length: glintN }, () => make(2))
      ];
      if (reduceMotion.matches) render(1200);
    };

    const render = (t) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        const tw = 0.5 + 0.5 * Math.sin(t * 0.001 * p.sp + p.ph);
        const x = p.x + pointer.x * 34 * p.z;
        const y = p.y + pointer.y * 22 * p.z;
        if (p.type === 0) {
          ctx.globalAlpha = p.a * (0.3 + 0.7 * tw);
          ctx.drawImage(dot, x - p.size / 2, y - p.size / 2, p.size, p.size);
        } else if (p.type === 1) {
          ctx.globalAlpha = p.a * (0.55 + 0.45 * tw);
          ctx.drawImage(soft, x - p.size / 2, y - p.size / 2, p.size, p.size);
        } else {
          const a = Math.max(0, tw - 0.5) * 2 * p.a;
          if (a < 0.02) continue;
          ctx.globalAlpha = a;
          ctx.strokeStyle = 'rgba(255,238,190,1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - p.size, y); ctx.lineTo(x + p.size, y);
          ctx.moveTo(x, y - p.size); ctx.lineTo(x, y + p.size);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const frame = (t) => {
      const dt = Math.min((t - last) / 16.7 || 1, 3);
      last = t;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      for (const p of parts) {
        p.x += (p.vx + Math.sin(t * 0.0003 * p.sp + p.ph) * 0.1 * p.z) * dt;
        p.y += p.vy * dt;
        if (p.y < -p.size) { p.y = h + p.size; p.x = rand(0, w); }
        if (p.x < -p.size) p.x = w + p.size;
        if (p.x > w + p.size) p.x = -p.size;
      }
      render(t);
      raf = requestAnimationFrame(frame);
    };

    const start = () => { if (!raf && !reduceMotion.matches && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    resize();
    let resizeTimer = 0;
    new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); }).observe(canvas);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? start() : stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    if (rich && finePointer.matches) {
      const host = canvas.parentElement;
      host.addEventListener('pointermove', (e) => {
        const r = host.getBoundingClientRect();
        pointer.tx = (e.clientX - r.left) / r.width - 0.5;
        pointer.ty = (e.clientY - r.top) / r.height - 0.5;
      });
    }
    start();
  }

  function initDust() { $$('canvas.dust').forEach((c) => createDust(c, c.dataset.dust === 'hero')); }

  /* ======================================================================
     7. Áreas de práctica: pestañas accesibles con avance automático
     ====================================================================== */
  function initAreas() {
    const wrap = $('[data-areas]');
    if (!wrap) return;
    const tablist = $('[role="tablist"]', wrap);
    const tabs = $$('[role="tab"]', wrap);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const DURATION = 7500;
    tablist.style.setProperty('--autoplay', `${DURATION}ms`);

    let index = 0;
    let timer = 0;
    let visible = false;
    let stopped = reduceMotion.matches; // el avance automático se detiene en la primera interacción

    const restart = () => {
      clearTimeout(timer);
      tablist.classList.remove('is-playing');
      if (stopped || !visible) return;
      void tablist.offsetWidth; // reinicia la animación de la barra de progreso
      tablist.classList.add('is-playing');
      timer = setTimeout(() => select((index + 1) % tabs.length), DURATION);
    };

    const select = (i, focus = false) => {
      index = i;
      tabs.forEach((tab, k) => {
        const on = k === i;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[k].classList.toggle('is-active', on);
        if (on && focus) tab.focus();
      });
      restart();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => { stopped = true; select(i); });
      tab.addEventListener('keydown', (e) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        let next = null;
        if (e.key in keys) next = (i + keys[e.key] + tabs.length) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        stopped = true;
        select(next, true);
      });
    });
    wrap.addEventListener('focusin', () => { if (!stopped) { stopped = true; restart(); } });

    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); }, { threshold: 0.35 }).observe(wrap);
  }

  /* ======================================================================
     8. Bento: foco dorado que sigue al cursor
     ====================================================================== */
  function initSpotlight() {
    if (!finePointer.matches || reduceMotion.matches) return;
    $$('[data-spot]').forEach((cell) => {
      cell.addEventListener('pointermove', (e) => {
        const r = cell.getBoundingClientRect();
        cell.style.setProperty('--mx', `${e.clientX - r.left}px`);
        cell.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ======================================================================
     9. Botones magnéticos
     ====================================================================== */
  function initMagnetic() {
    if (!finePointer.matches || reduceMotion.matches) return;
    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.32;
        btn.style.setProperty('--tx', `${Math.max(-8, Math.min(8, dx))}px`);
        btn.style.setProperty('--ty', `${Math.max(-6, Math.min(6, dy))}px`);
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.setProperty('--tx', '0px');
        btn.style.setProperty('--ty', '0px');
      });
    });
  }

  /* ======================================================================
     10. Galería: arrastre, botones y visor (modo nativo) + visor siempre
     ====================================================================== */
  function initGallery() {
    const track = $('#g-track');
    if (!track) return;
    const prev = $('#g-prev');
    const next = $('#g-next');
    const items = $$('.g-item', track);

    const step = () => (items[0] ? items[0].getBoundingClientRect().width + 20 : 320);
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' }));

    // Botones deshabilitados en los extremos (sin listeners de scroll)
    const edge = (el, btn) => new IntersectionObserver(([entry]) => { btn.disabled = entry.isIntersecting; }, { root: track, threshold: 0.95 }).observe(el);
    edge(items[0], prev);
    edge(items[items.length - 1], next);

    // Arrastre con mouse
    let startX = 0, startLeft = 0, down = false, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || root.classList.contains('fx-gallery')) return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    const release = () => {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

    // Visor
    const dialog = $('#lightbox');
    const img = $('#lb-img');
    const cap = $('#lb-cap');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    $$('.g-item__btn', track).forEach((btn) => {
      btn.addEventListener('click', () => {
        img.src = btn.dataset.full;
        img.alt = $('img', btn).alt;
        cap.textContent = btn.dataset.cap || '';
        dialog.showModal();
      });
    });
    $('#lb-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }

  /* ======================================================================
     11. FAQ: acordeón exclusivo (respaldo para navegadores sin details[name])
     ====================================================================== */
  function initFaq() {
    const items = $$('.faq__item');
    items.forEach((d) => d.addEventListener('toggle', () => {
      if (d.open) items.forEach((o) => { if (o !== d) o.open = false; });
    }));
  }

  /* ======================================================================
     12. Formulario: validación y envío a WhatsApp
     ====================================================================== */
  function initForm() {
    const form = $('#contact-form');
    if (!form) return;
    const status = $('#form-status');
    const submit = $('button[type="submit"]', form);

    const normalizePhone = (v) => {
      let d = v.replace(/\D/g, '');
      if (d.length === 13 && d.startsWith('521')) d = d.slice(3);
      else if (d.length === 12 && d.startsWith('52')) d = d.slice(2);
      return d;
    };

    const fields = {
      nombre: {
        el: $('#f-nombre'), err: $('#e-nombre'),
        check: (v) => (v.trim().length >= 3 && /\p{L}{2,}/u.test(v) ? '' : 'Escribe tu nombre completo.')
      },
      telefono: {
        el: $('#f-tel'), err: $('#e-tel'),
        check: (v) => (!v.trim() || normalizePhone(v).length === 10 ? '' : 'Ingresa 10 dígitos o deja este campo en blanco.')
      },
      materia: {
        el: $('#f-materia'), err: $('#e-materia'),
        check: (v) => (v ? '' : 'Selecciona la materia de tu caso.')
      },
      mensaje: {
        el: $('#f-mensaje'), err: $('#e-mensaje'),
        check: (v) => (v.trim().length >= 15 ? '' : 'Cuéntame un poco más (mínimo 15 caracteres).')
      }
    };

    const validate = (f) => {
      const message = f.check(f.el.value);
      f.err.textContent = message;
      f.el.setAttribute('aria-invalid', message ? 'true' : 'false');
      return !message;
    };

    Object.values(fields).forEach((f) => {
      f.el.addEventListener('blur', () => validate(f));
      f.el.addEventListener('input', () => { if (f.el.getAttribute('aria-invalid') === 'true') validate(f); });
    });

    const materiaLabel = { penal: 'penal', civil: 'civil', familiar: 'familiar' };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.classList.remove('is-visible');

      const results = Object.values(fields).map((f) => ({ f, ok: validate(f) }));
      const firstBad = results.find((r) => !r.ok);
      if (firstBad) {
        firstBad.f.el.focus();
        return;
      }

      const name = fields.nombre.el.value.trim();
      const materia = fields.materia.el.value;
      const phone = normalizePhone(fields.telefono.el.value);
      const detail = fields.mensaje.el.value.trim();
      const subject = materiaLabel[materia]
        ? `Necesito asesoría en materia ${materiaLabel[materia]}.`
        : 'Necesito asesoría legal y aún no sé a qué materia corresponde mi caso.';
      const text = [
        `Hola, ${CONFIG.lawyer}.`,
        `Soy ${name}. ${subject}`,
        '',
        detail,
        phone ? `\nMi teléfono: ${phone}` : ''
      ].join('\n').trim();
      const url = waUrl(text);

      submit.setAttribute('aria-busy', 'true');
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        submit.removeAttribute('aria-busy');
        const link = document.createElement('a');
        link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'toca aquí';
        status.replaceChildren(`Listo, ${name.split(' ')[0]}. Abrimos WhatsApp con tu mensaje. Si no se abrió, `, link, '.');
        status.classList.add('is-visible');
      }, 450);
    });
  }

  /* ======================================================================
     13. Efectos de scroll con GSAP + ScrollTrigger (todos con scrub)
     ====================================================================== */
  function initScrollFX() {
    if (!hasGsap() || reduceMotion.matches) return;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    fx = true;
    root.classList.add('fx');
    ScrollTrigger.config({ ignoreMobileResize: true });
    const header = $('#header');

    // Progreso de lectura
    gsap.to('.progress__bar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });

    // Header: se oculta al bajar y reaparece al subir
    let hidden = false;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const shouldHide = self.direction === 1 && self.scroll() > 700 && !document.body.classList.contains('menu-open');
        if (shouldHide !== hidden) { hidden = shouldHide; header.classList.toggle('is-hidden', hidden); }
      }
    });

    // Hero: la foto de fondo se aleja y el contenido se desvanece al salir
    gsap.to('.hero__bg', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__grid', { y: -90, opacity: 0.05, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '75% top', scrub: true } });
    gsap.to('.arch__parallax', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.seal', { y: -70, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Listón: la velocidad y el sentido siguen al scroll
    const track = $('.marquee__track');
    if (track) {
      const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 52, repeat: -1 });
      ScrollTrigger.create({
        trigger: '.ribbon',
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const boost = Math.min(Math.abs(self.getVelocity()) / 380, 5);
          gsap.to(loop, { timeScale: self.direction * (1 + boost), duration: 0.25, overwrite: true, onComplete: () => gsap.to(loop, { timeScale: self.direction, duration: 1.2 }) });
        }
      });
    }

    // Parallax de imágenes dentro de sus marcos
    $$('.stage__media').forEach((m) => gsap.fromTo(m, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.stage', start: 'top bottom', end: 'bottom top', scrub: true } }));
    gsap.fromTo('.cell__media', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.cell--a', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.commit__bg', { yPercent: -9 }, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: '.commit', start: 'top bottom', end: 'bottom top', scrub: true } });

    // Ornamentos: cada uno se mueve a su propia velocidad
    $$('[data-parallax]').forEach((el) => {
      const k = parseFloat(el.dataset.parallax) || 0.15;
      gsap.fromTo(el, { y: -k * 380 }, { y: k * 380, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Proceso: la línea dorada se llena y cada paso se enciende al alcanzarlo
    const timeline = $('#timeline');
    if (timeline) {
      gsap.fromTo('.timeline__fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: timeline, start: 'top 62%', end: 'bottom 62%', scrub: 0.5 } });
      $$('.step', timeline).forEach((step) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 64%',
          onEnter: () => step.classList.add('is-active'),
          onLeaveBack: () => step.classList.remove('is-active')
        });
      });
    }

    // Cita: las palabras se iluminan a medida que se avanza
    const words = $$('.quote .sw');
    if (words.length) {
      gsap.fromTo(words, { opacity: 0.15 }, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top 82%', end: 'bottom 55%', scrub: 0.4 } });
    }

    // CTA y footer
    gsap.fromTo('.cta__ghost', { scale: 0.8 }, { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.footer__mark', { yPercent: 55, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top 92%', end: 'bottom bottom', scrub: true } });

    initPinnedGallery();
  }

  /* Galería: el scroll vertical la recorre en horizontal (sección anclada) */
  function initPinnedGallery() {
    const { gsap, ScrollTrigger } = window;
    const section = $('#galeria');
    const pin = $('.gallery__pin', section);
    const track = $('#g-track');
    const bar = $('.gallery__progress span');
    if (!section || !pin || !track) return;

    section.classList.add('is-pinned');
    root.classList.add('fx-gallery');
    track.scrollLeft = 0;

    const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${Math.round(distance() * 1.2)}`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set(bar, { scaleX: self.progress })
      }
    });

    // Parallax horizontal de cada foto
    $$('.g-item__btn img', track).forEach((img) => {
      gsap.fromTo(img, { xPercent: -7 }, {
        xPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: img.closest('.g-item'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
    });

    // Teclado: si una foto recibe foco, se lleva el scroll hasta ella
    pin.addEventListener('scroll', () => { pin.scrollLeft = 0; });
    track.addEventListener('focusin', (e) => {
      const item = e.target.closest('.g-item');
      if (!item) return;
      const st = tween.scrollTrigger;
      const x = Number(gsap.getProperty(track, 'x')) || 0;
      const rect = item.getBoundingClientRect();
      const center = rect.left - x + rect.width / 2;
      const target = Math.min(Math.max(center - window.innerWidth / 2, 0), distance());
      window.scrollTo({ top: st.start + (target / (distance() || 1)) * (st.end - st.start), behavior: 'auto' });
    });
  }

  /* ======================================================================
     Arranque
     ====================================================================== */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  initSplit();
  initPreloader();
  initWhatsAppLinks();
  initHeader();
  initReveals();
  initCounters();
  initDust();
  initAreas();
  initSpotlight();
  initMagnetic();
  initGallery();
  initFaq();
  initForm();
  try { initScrollFX(); } catch (err) { console.warn('Efectos de scroll desactivados:', err); }
})();
