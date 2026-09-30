/* =====================================================================
   JUMP EVOLUTION — поведение сайта
   Lenis (инерционный скролл) + GSAP ScrollTrigger (скролл-сцены на sticky).
   Всё тяжёлое выключается при prefers-reduced-motion и на тач-устройствах.
   ===================================================================== */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isPhone = matchMedia('(max-width: 720px)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  if (!hasGsap) root.classList.add('no-gsap');

  /* ---------- типографика: короткие слова не висят в конце строки ---------- */
  // без lookbehind — чтобы скрипт разбирался и в старом Safari; второй проход ловит «и в», «а с» подряд
  const SHORT = /(^|[\s\u00A0(«"„—–])(в|во|и|а|с|со|к|ко|у|о|об|на|но|не|ни|по|за|из|от|до|для|что|как|или|без|при|под|над|про)\s+(?=\S)/gi;
  const typograph = el => {
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement.closest('script,style,textarea,select,option,.pill-video') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const t = n.nodeValue;
      const r = t.replace(SHORT, '$1$2\u00A0').replace(SHORT, '$1$2\u00A0').replace(/(\d)\s+(?=[а-яёa-z%+])/gi, '$1\u00A0').replace(/\s+—\s/g, '\u00A0— ');
      if (r !== t) n.nodeValue = r;
    }
  };
  $$('main p, main h1, main h2, main h3, main li, main dd, main dt, main summary, main figcaption, .footer p').forEach(typograph);

  $$('.orb-ring').forEach(svg => { const w = document.createElement('span'); w.className = 'orb-spin'; w.setAttribute('aria-hidden', 'true'); svg.replaceWith(w); w.appendChild(svg); });

  /* ---------- инерционный скролл ---------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const header = $('.header');
  const headerOffset = () => -((header || {}).offsetHeight || 0);
  const focusTarget = t => {
    if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(t.tagName) && !t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (isOrderLink(a)) { e.preventDefault(); closeMenu(false); openOrder(a); return; } // кнопки заявки вне формы — попап
    if (id.length < 2) return;
    const target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    closeMenu(false);
    focusTarget(target); // фокус идёт вместе со скроллом — Tab продолжается от цели
    if (lenis) lenis.scrollTo(target, { offset: headerOffset(), duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  }));

  /* ---------- шапка ---------- */
  let lastY = scrollY;
  const onScrollHeader = () => {
    const y = scrollY;
    if (!header) return;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = root.classList.contains('menu-open');
    const focusedInside = header.contains(document.activeElement);
    header.classList.toggle('is-hidden', !menuOpen && !focusedInside && y > 400 && y > lastY + 2);
    if (y < lastY - 2) header.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();
  header && header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* ---------- фон неактивен, пока открыт слой поверх (меню, видео) ---------- */
  const setInert = (keep, on) => $$('body > *').forEach(el => {
    if (el.tagName === 'SCRIPT' || keep.some(k => k === el || el.contains(k))) return;
    el.inert = on;
  });

  /* ---------- попап заявки: «Заказать / Рассчитать / Обсудить» вне формы ---------- */
  const ROOT = new URL('../../', (document.currentScript && document.currentScript.src) || location.href).href;
  const FORMATS = ['Паркур-шоу', 'Танцевальное шоу', 'Танцевально-акробатическое шоу', 'Воздушная акробатика', 'Световое шоу', 'Интерактив и флешмобы', 'Промо брендов', 'Спортивные события'];
  const SVC_FORMAT = { parkur: 0, tancevalnoe: 1, akrobaticheskoe: 2, vozdushnoe: 3, svetovoe: 4, interaktiv: 5, promo: 6, sport: 7 };
  const PAGE_FORMAT = /parkur-shou/.test(location.pathname) ? 0 : /tancevalnoe-shou/.test(location.pathname) ? 1 : -1;
  const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const order = document.createElement('div');
  order.className = 'fmodal';
  order.id = 'order';
  order.setAttribute('role', 'dialog');
  order.setAttribute('aria-modal', 'true');
  order.setAttribute('aria-labelledby', 'order-title');
  order.setAttribute('aria-hidden', 'true');
  order.innerHTML = `
    <div class="fmodal-box" tabindex="-1" data-lenis-prevent>
      <button class="fmodal-close" type="button" aria-label="Закрыть форму"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="fmodal-aside">
        <div class="vframe" aria-hidden="true"><video data-hover data-src="${ROOT}assets/video/f-light.mp4" data-poster="${ROOT}assets/video/f-light.jpg" muted loop playsinline preload="none"></video></div>
        <span class="label dot">Заявка</span>
        <h2 class="display fmodal-title" id="order-title">Обсудим<br>ваше шоу</h2>
        <p>Расскажите о дате и площадке — вернёмся с идеей и предварительной сметой в течение рабочего дня.</p>
        <div class="fmodal-contacts"><a href="tel:+79266983031">+7 926 698-30-31</a><a href="https://t.me/daniil_spirtus" target="_blank" rel="noopener">Telegram</a><a href="https://wa.me/79266983031" target="_blank" rel="noopener">WhatsApp</a></div>
      </div>
      <div class="fmodal-body">
        <form class="form" method="post">
          <div class="field"><label for="o-name">Имя</label><input id="o-name" name="name" type="text" placeholder="Как к вам обращаться" required autocomplete="name"><span class="err">Укажите имя</span></div>
          <div class="field"><label for="o-phone">Телефон</label><input id="o-phone" name="phone" type="tel" placeholder="+7 ___ ___-__-__" required autocomplete="tel" inputmode="tel"><span class="err">Проверьте номер</span></div>
          <div class="field"><label for="o-date">Дата события</label><input id="o-date" name="date" type="date"></div>
          <div class="field"><label for="o-msg">Комментарий</label><textarea id="o-msg" name="message" placeholder="Площадка, город, количество гостей"></textarea></div>
          <div class="form-foot">
            <button class="btn btn-primary" type="submit">Отправить заявку ${ICON_ARROW}</button>
            <small>Нажимая кнопку, вы соглашаетесь с <a href="#" data-privacy>политикой конфиденциальности</a>.</small>
          </div>
          <div class="form-success" role="status" aria-live="polite"><b>Заявка у нас</b><p>Свяжемся в течение рабочего дня. Если срочно — напишите в Telegram или позвоните.</p><button class="btn btn-ghost btn-sm" type="button" data-close>Закрыть</button></div>
        </form>
      </div>
    </div>`;
  document.body.appendChild(order);
  const orderForm = $('form', order);
  function isOrderLink(a) { return /#zakazat$/.test(a.getAttribute('href') || '') && !a.closest('.finale-sub, .cta-grid, #zakazat, .fmodal'); }
  let orderFrom = null;
  function openOrder(trigger) {
    orderFrom = trigger || document.activeElement;
    if (orderForm.classList.contains('is-sent')) resetForm(orderForm);
    // откуда нажали (страница шоу, блок формата, карточка варианта) — подсказка в комментарии, её можно стереть
    let idx = PAGE_FORMAT;
    const svc = trigger && trigger.closest('.svc');
    if (svc && svc.id in SVC_FORMAT) idx = SVC_FORMAT[svc.id];
    const msg = $('textarea', order), variant = trigger && trigger.closest('.variant'), vh = variant && $('h3', variant);
    if (msg.dataset.auto && msg.value === msg.dataset.auto) msg.value = ''; // свою подсказку убираем, текст человека — нет
    delete msg.dataset.auto;
    const hint = vh ? 'Интересует вариант: ' + vh.textContent.trim() : idx >= 0 ? 'Интересует: ' + FORMATS[idx] : '';
    if (hint && !msg.value) { msg.value = hint + '. '; msg.dataset.auto = msg.value; }
    order.classList.add('is-open');
    order.setAttribute('aria-hidden', 'false');
    root.classList.add('order-open');
    setInert([order], true);
    lenis && lenis.stop();
    const v = $('video', order); v && !reduce && tryPlay(v);
    setTimeout(() => (finePointer ? $('#o-name', order) : $('.fmodal-box', order)).focus({ preventScroll: true }), 80);
  }
  function closeOrder() {
    if (!order.classList.contains('is-open')) return;
    order.classList.remove('is-open');
    order.setAttribute('aria-hidden', 'true');
    root.classList.remove('order-open');
    setInert([order], false);
    lenis && lenis.start();
    const v = $('video', order); v && v.pause();
    orderFrom && orderFrom.focus && orderFrom.focus({ preventScroll: true });
  }
  order.addEventListener('click', e => {
    if (e.target === order || e.target.closest('.fmodal-close, [data-close]')) closeOrder();
    if (e.target.closest('a[data-privacy]')) e.preventDefault(); // документ пришлёт заказчик
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeOrder(); });

  /* ---------- мобильное меню ---------- */
  const burger = $('.burger');
  const menu = $('#mobile-menu');
  function closeMenu(returnFocus = true) {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    root.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    setInert([menu, header], false);
    lenis && lenis.start();
    returnFocus && burger.focus();
  }
  if (burger && menu) {
    burger.addEventListener('click', () => {
      if (menu.classList.contains('is-open')) return closeMenu();
      menu.classList.add('is-open');
      root.classList.add('menu-open');
      header && header.classList.remove('is-hidden');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Закрыть меню');
      setInert([menu, header], true);
      lenis && lenis.stop();
      const first = $('a', menu); first && setTimeout(() => first.focus(), 60);
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => closeMenu(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- появление блоков и строк ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
  let heroDone = false;
  const observeReveals = () => $$('[data-reveal]:not(.is-in), [data-split]:not(.is-in)').forEach(el => {
    if (el.dataset.split === 'manual') return;
    if (!heroDone && el.closest('.hero, .page-hero')) return; // первый экран ждёт прелоадер
    io.observe(el);
  });

  /* ---------- видео: постеры, загрузка и проигрывание — раздельно ---------- */
  // на телефоне тяжёлые ролики заменяются лёгкими вертикальными версиями (*-m.mp4)
  const MOBILE_SRC = new Set(['hero', 'reel', 'p-parkur', 'p-dance', 'g-park', 'g-swings', 'g-skate', 'finale',
    'fw-parkur', 'fw-dance', 'fw-acro', 'fw-aerial', 'fw-light', 'fw-interactive', 'fw-promo', 'fw-sport']);
  const pickSrc = src => {
    const m = isPhone && src.match(/([^/]+)\.mp4$/);
    return m && MOBILE_SRC.has(m[1]) ? src.replace(/\.mp4$/, '-m.mp4') : src;
  };
  const setPoster = v => { if (v.dataset.poster && !v.getAttribute('poster')) v.setAttribute('poster', v.dataset.poster); };
  const loadVideo = v => {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    setPoster(v);
    if (v.dataset.src) { v.preload = 'auto'; v.src = pickSrc(v.dataset.src); v.load(); }
  };
  const tryPlay = v => { if (v.dataset.covered) return; loadVideo(v); const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const allVideos = $$('video');
  allVideos.forEach(v => {
    v.muted = true; v.playsInline = true;
    v.addEventListener('playing', () => v.classList.add('is-playing'));
  });
  // постеры — заранее, за полтора экрана (и в режиме без движения тоже)
  const pio = new IntersectionObserver(en => en.forEach(e => { if (e.isIntersecting) { setPoster(e.target); pio.unobserve(e.target); } }), { rootMargin: '1200px 0px' });
  $$('video[data-poster]:not([data-hover])').forEach(v => pio.observe(v));
  const autoVideos = $$('video[data-src]:not([data-hover])');
  if (!reduce) {
    // грузим чуть заранее…
    const lio = new IntersectionObserver(en => en.forEach(e => { if (e.isIntersecting) { loadVideo(e.target); lio.unobserve(e.target); } }), { rootMargin: '400px 0px' });
    // …а играем только то, что реально на экране
    const vio = new IntersectionObserver(en => en.forEach(e => {
      if (e.isIntersecting) tryPlay(e.target); else if (!e.target.paused) e.target.pause();
    }), { threshold: .01 });
    autoVideos.forEach(v => { lio.observe(v); vio.observe(v); });
  }

  /* ---------- прелоадер + интро первого экрана ---------- */
  const preloader = $('.preloader');
  const heroSplit = $('.hero [data-split], .page-hero [data-split]');
  const heroIntro = () => {
    heroDone = true;
    const first = $('.hero, .page-hero');
    requestAnimationFrame(() => {
      heroSplit && heroSplit.classList.add('is-in');
      first && $$('[data-reveal]', first).forEach(el => el.classList.add('is-in')); // первый экран — сразу, без ожидания скролла
    });
    observeReveals();
  };
  if (preloader && root.classList.contains('is-loading')) {
    const count = $('.count', preloader);
    const bar = $('.bar i', preloader);
    const heroVideo = $('.hero-media video');
    heroVideo && loadVideo(heroVideo);
    const start = performance.now();
    const minT = 1100, maxT = 2600;
    let ready = !heroVideo;
    heroVideo && heroVideo.addEventListener('canplay', () => { ready = true; }, { once: true });
    const tick = now => {
      const el = now - start;
      const target = ready ? Math.min(1, el / minT) : Math.min(.9, el / maxT);
      const p = el > maxT ? 1 : target;
      if (count) count.textContent = String(Math.round(p * 100)).padStart(3, '0');
      if (bar) bar.style.transform = `scaleX(${p})`;
      if (p < 1) return requestAnimationFrame(tick);
      try { sessionStorage.setItem('je-intro', '1'); } catch (e) {}
      if (hasGsap && !reduce) {
        gsap.to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.inOut', onComplete: () => root.classList.remove('is-loading') });
        gsap.delayedCall(.35, heroIntro);
      } else { root.classList.remove('is-loading'); heroIntro(); }
    };
    requestAnimationFrame(tick);
  } else {
    root.classList.remove('is-loading');
    heroIntro();
  }

  /* ---------- манифест: слова загораются по скроллу ---------- */
  const manifest = $('.manifest-text');
  let manifestWords = [];
  if (manifest) {
    const walk = node => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) {
          const parts = ch.textContent.split(/([ \t\n\r]+)/); // неразрывные пробелы не трогаем — слова держатся вместе
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^[ \t\n\r]+$/.test(p)) frag.appendChild(document.createTextNode(p));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); }
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && !ch.classList.contains('pill-video')) walk(ch);
      });
    };
    walk(manifest);
    manifestWords = $$('.w', manifest);
    if (reduce || !hasGsap) manifestWords.forEach(w => w.classList.add('on'));
  }

  /* ---------- счётчики ---------- */
  const cio = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      cio.unobserve(en.target);
      const el = en.target, to = parseFloat(el.dataset.count), dur = reduce ? 0 : 1600, t0 = performance.now();
      const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
      const step = now => {
        const k = dur ? Math.min(1, (now - t0) / dur) : 1;
        el.textContent = fmt(to * (1 - Math.pow(1 - k, 4)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .4 });
  $$('[data-count]').forEach(c => cio.observe(c));

  /* ---------- модальное окно с плеером Rutube ---------- */
  const modal = $('.vmodal');
  let lastFocus = null;
  const openModal = (id, title, sub) => {
    if (!modal) return;
    lastFocus = document.activeElement;
    $('.vmodal-head b', modal).textContent = title || 'Jump Evolution';
    $('.vmodal-head span', modal).textContent = sub || '';
    $('.vmodal-player', modal).innerHTML = `<iframe src="https://rutube.ru/play/embed/${id}?autoplay=1" title="${(title || 'Видео').replace(/"/g, '')}" allow="clipboard-write; autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    setInert([modal], true); // фокус не уходит за окно, даже из iframe
    lenis && lenis.stop();
    setTimeout(() => $('.vmodal-close', modal).focus(), 50);
  };
  const closeModal = () => {
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    setInert([modal], false);
    lenis && lenis.start();
    setTimeout(() => { $('.vmodal-player', modal).innerHTML = ''; }, 450);
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  };
  $$('[data-video-id]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); openModal(el.dataset.videoId, el.dataset.title, el.dataset.sub); });
    // карточки с role="button" открываются и с клавиатуры
    if (el.getAttribute('role') === 'button') el.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openModal(el.dataset.videoId, el.dataset.title, el.dataset.sub);
    });
  });
  if (modal) {
    modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.vmodal-close')) closeModal(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });
  }

  /* ---------- превью форматов за курсором ---------- */
  const fList = $('.formats-list');
  const fWrap = $('.f-preview-wrap');
  if (fList && fWrap && finePointer && !reduce) {
    const box = $('.f-preview', fWrap);
    const media = $$('[data-key]', box);
    let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my, active = false, raf = 0;
    // превью держится между колонкой названий и колонкой стрелок
    const targetX = () => {
      const r = fList.getBoundingClientRect(), bw = box.offsetWidth || 300;
      const minX = r.left + r.width * .46, maxX = r.right - 72 - bw - 40;
      return clamp(mx, minX, Math.max(minX, maxX));
    };
    const targetY = () => { const h = box.offsetHeight || 400; return clamp(my, h / 2 + 16, innerHeight - h / 2 - 16); };
    const loop = () => {
      const tx = targetX();
      x = lerp(x, tx, .14); y = lerp(y, targetY(), .14);
      const rot = clamp((mx - x) * .04, -6, 6);
      fWrap.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
      raf = active || Math.abs(tx - x) > .5 ? requestAnimationFrame(loop) : 0;
    };
    const show = key => media.forEach(m => {
      const on = m.dataset.key === key;
      m.classList.toggle('is-cur', on);
      if (m.tagName === 'VIDEO') { if (on) { m.currentTime = 0; tryPlay(m); } else m.pause(); }
    });
    // постеры превью — когда список рядом; сами ролики — только когда курсор пришёл в список
    const pp = new IntersectionObserver(en => { if (en[0].isIntersecting) { media.forEach(setPoster); pp.disconnect(); } }, { rootMargin: '600px 0px' });
    pp.observe(fList);
    fList.addEventListener('mouseenter', () => media.forEach(m => m.tagName === 'VIDEO' && loadVideo(m)), { once: true });
    $$('.f-row', fList).forEach(row => row.addEventListener('mouseenter', () => {
      active = true; box.classList.add('is-on'); show(row.dataset.key);
      if (!raf) raf = requestAnimationFrame(loop);
    }));
    fList.addEventListener('mouseleave', () => { active = false; box.classList.remove('is-on'); media.forEach(m => m.tagName === 'VIDEO' && m.pause()); });
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; if (active && !raf) raf = requestAnimationFrame(loop); }, { passive: true });
  }

  /* ---------- кастомный курсор ---------- */
  const cursor = $('.cursor');
  if (cursor && finePointer && !reduce) {
    root.classList.add('has-cursor');
    const dot = $('.cursor-dot', cursor), ring = $('.cursor-ring', cursor), label = $('.cursor-ring span', cursor);
    let mx = -100, my = -100, rx = -100, ry = -100;
    let craf = 0;
    const loop = () => {
      rx = lerp(rx, mx, .16); ry = lerp(ry, my, .16);
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      craf = Math.abs(mx - rx) + Math.abs(my - ry) > .2 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      if (!craf) craf = requestAnimationFrame(loop);
    }, { passive: true });
    const states = ['is-link', 'is-play', 'is-view', 'is-drag'];
    document.addEventListener('mouseover', e => {
      cursor.classList.toggle('on-light', !!e.target.closest('.section-paper'));
      const t = e.target.closest('[data-cursor], a, button, summary, label, select, input, textarea');
      cursor.classList.remove(...states);
      if (!t) return;
      const mode = t.dataset.cursor;
      if (mode) { cursor.classList.add('is-' + mode); label.textContent = t.dataset.cursorLabel || (mode === 'play' ? 'Смотреть' : mode === 'drag' ? 'Листать' : 'Открыть'); }
      else cursor.classList.add('is-link');
    });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));
  }

  /* ---------- магнитные элементы ---------- */
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach(el => {
      const k = parseFloat(el.dataset.magnetic) || .3;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transition = 'transform .25s var(--ease)';
        el.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transition = 'transform .9s var(--ease)'; el.style.transform = ''; });
    });
  }

  /* ---------- FAQ: плавное раскрытие ---------- */
  $$('.faq details').forEach(d => {
    const sum = $('summary', d), ans = $('.answer', d);
    if (!sum || !ans) return;
    sum.addEventListener('click', e => {
      if (reduce || !ans.animate) return;
      e.preventDefault();
      if (d.open) {
        const h = ans.offsetHeight;
        ans.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.65,0,.35,1)' }).onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = ans.offsetHeight;
        ans.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  });

  /* ---------- форма (фронт-заглушка) ---------- */
  function resetForm(form) {
    form.classList.remove('is-sent');
    form.reset();
    $$('.field.is-error', form).forEach(f => f.classList.remove('is-error'));
    $$('[aria-invalid]', form).forEach(i => { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); });
    const btn = $('button[type="submit"]', form);
    if (btn && btn.dataset.label) btn.firstChild.textContent = btn.dataset.label;
    $$('select, input[type="date"]', form).forEach(el => el.dispatchEvent(new Event('change')));
  }
  $$('form.form').forEach(form => {
    const sbtn = $('button[type="submit"]', form);
    if (sbtn) sbtn.dataset.label = sbtn.firstChild.textContent;
    form.noValidate = true; // без JS работает нативная проверка обязательных полей
    const phone = $('input[type="tel"]', form);
    if (phone) phone.addEventListener('input', () => {
      let d = phone.value.replace(/\D/g, '');
      if (!d) { phone.value = ''; return; }
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
      phone.value = '+7' + (p[0] ? ' ' + p[0] : '') + (p[1] ? ' ' + p[1] : '') + (p[2] ? '-' + p[2] : '') + (p[3] ? '-' + p[3] : '');
    });
    // пустые дата/селект выглядят как пустые
    $$('select, input[type="date"]', form).forEach(el => {
      const sync = () => el.classList.toggle('is-empty', !el.value);
      sync(); el.addEventListener('change', sync); el.addEventListener('input', sync);
    });
    // ошибки связаны с полями для скринридеров
    $$('.field', form).forEach(f => {
      const inp = $('input, textarea, select', f), err = $('.err', f);
      if (inp && err) { err.id = err.id || inp.id + '-err'; }
    });
    const success = $('.form-success', form);
    success && success.setAttribute('tabindex', '-1');
    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('[required]', form).forEach(inp => {
        const f = inp.closest('.field'), err = f && $('.err', f);
        const bad = inp.type === 'tel' ? inp.value.replace(/\D/g, '').length < 11 : !inp.value.trim();
        f && f.classList.toggle('is-error', bad);
        inp.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (err) bad ? inp.setAttribute('aria-describedby', err.id) : inp.removeAttribute('aria-describedby');
        if (bad && ok) { inp.focus(); ok = false; }
      });
      if (!ok) return;
      const btn = $('button[type="submit"]', form);
      btn.setAttribute('aria-busy', 'true');
      btn.firstChild.textContent = 'Отправляем… ';
      setTimeout(() => {
        form.classList.add('is-sent'); btn.removeAttribute('aria-busy');
        success && setTimeout(() => success.focus({ preventScroll: true }), 60);
      }, 900);
    });
    $$('input, textarea', form).forEach(inp => inp.addEventListener('input', () => {
      const f = inp.closest('.field');
      if (f && f.classList.contains('is-error')) { f.classList.remove('is-error'); inp.setAttribute('aria-invalid', 'false'); inp.removeAttribute('aria-describedby'); }
    }));
  });

  /* =====================================================================
     Скролл-сцены (GSAP)
     ===================================================================== */
  if (!hasGsap) { observeReveals(); return; }
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();

  /* бегущие строки: скорость и направление зависят от скролла; вне экрана стоят */
  const marquees = $$('.marquee-track[data-speed]').map(track => {
    $$('[id]', track).forEach(n => n.removeAttribute('id'));
    return { track, originals: Array.from(track.children), copies: 1, speed: parseFloat(track.dataset.speed) || 1, x: 0, half: 0, on: false };
  });
  // один «набор» = исходные элементы; дублей столько, чтобы лента была шире экрана на набор (без разрыва на широких мониторах)
  const addCopy = m => m.originals.forEach(k => {
    const c = k.cloneNode(true); c.setAttribute('aria-hidden', 'true'); // дубль скрыт от скринридеров
    m.track.appendChild(c);
  });
  const measure = () => marquees.forEach(m => {
    let unit = m.track.scrollWidth / m.copies;
    while (m.copies < 2 || m.track.scrollWidth < innerWidth + unit) { addCopy(m); m.copies++; if (m.copies > 12) break; }
    m.half = m.track.scrollWidth / m.copies; // ширина одного набора — шаг зацикливания
  });
  measure(); addEventListener('resize', measure);
  document.fonts && document.fonts.ready.then(measure);
  if (!reduce && marquees.length) {
    const mio = new IntersectionObserver(en => en.forEach(e => { const m = marquees.find(q => q.track === e.target); if (m) m.on = e.isIntersecting; }), { rootMargin: '100px 0px' });
    marquees.forEach(m => mio.observe(m.track));
    let vel = 0, dirSign = 1;
    lenis && lenis.on('scroll', e => { vel = e.velocity || 0; if (Math.abs(vel) > .5) dirSign = vel > 0 ? 1 : -1; });
    gsap.ticker.add((t, dt) => {
      const boost = 1 + Math.min(6, Math.abs(vel) * .35);
      vel *= .92;
      marquees.forEach(m => {
        if (!m.half || !m.on) return;
        m.x -= m.speed * boost * dirSign * dt * .06;
        if (m.x <= -m.half) m.x += m.half;
        if (m.x > 0) m.x -= m.half;
        m.track.style.transform = `translate3d(${m.x}px,0,0)`;
      });
    });
  } else root.classList.add('no-gsap');

  if (reduce) { observeReveals(); ScrollTrigger.refresh(); return; }

  /* параллакс фона первого экрана */
  $$('.hero-media, .page-hero .hero-media').forEach(m => {
    gsap.fromTo(m, { yPercent: 0, scale: 1.06 }, { yPercent: 14, scale: 1, ease: 'none', scrollTrigger: { trigger: m.parentElement, start: 'top top', end: 'bottom top', scrub: true } });
  });

  /* манифест */
  if (manifestWords.length) {
    ScrollTrigger.create({
      trigger: manifest, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: self => {
        const n = Math.round(self.progress * manifestWords.length);
        manifestWords.forEach((w, i) => w.classList.toggle('on', i < n));
      }
    });
  }

  /* шоурил: кадр раскрывается на весь экран (sticky, без pin — нет сдвигов макета) */
  const reel = $('.reel');
  if (reel && $('.reel-sticky', reel)) {
    mm.add('(min-width: 721px)', () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: reel, start: 'top top', end: 'bottom bottom', scrub: 1 } });
      tl.fromTo($('.reel-frame', reel), { clipPath: 'inset(18% 26% 18% 26%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
        .fromTo($('.reel-title span:first-child', reel), { xPercent: 0 }, { xPercent: -60, ease: 'none' }, 0)
        .fromTo($('.reel-title span:last-child', reel), { xPercent: 0 }, { xPercent: 60, ease: 'none' }, 0)
        .fromTo($('.reel-frame video', reel), { scale: 1.25 }, { scale: 1, ease: 'none' }, 0);
    });
  }

  /* кейсы: вертикальный скролл → горизонтальная лента (sticky) */
  const cases = $('.cases');
  if (cases) {
    mm.add('(min-width: 901px)', () => {
      const track = $('.cases-track', cases), bar = $('.cases-progress i', cases);
      cases.classList.add('is-pinned');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const size = () => { cases.style.height = (dist() + innerHeight) + 'px'; };
      size();
      const tw = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: cases, start: 'top top', end: 'bottom bottom', scrub: .8, invalidateOnRefresh: true, onRefreshInit: size,
          onUpdate: s => { bar && (bar.style.transform = `scaleX(${s.progress})`); } }
      });
      // фокус с клавиатуры на карточке за краем экрана — докручиваем ленту к ней
      const onFocus = e => {
        const card = e.target.closest('.case, .case-end');
        const st = tw.scrollTrigger;
        if (!card || !st || !dist()) return;
        const p = clamp((card.offsetLeft - innerWidth * .08) / dist(), 0, 1);
        const y = st.start + p * (st.end - st.start);
        lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
      };
      track.addEventListener('focusin', onFocus);
      return () => {
        tw.kill(); track.removeEventListener('focusin', onFocus);
        cases.classList.remove('is-pinned'); cases.style.height = ''; gsap.set(track, { clearProps: 'transform' });
      };
    });
  }

  /* площадки: предыдущий экран уходит в глубину, его видео ставится на паузу */
  const panels = $$('.ground-panel');
  panels.forEach((p, i) => {
    const next = panels[i + 1];
    if (!next) return;
    // следующий экран наезжает после паузы (отступ --dwell в CSS); текст сверху гаснет в последней трети
    gsap.timeline({ scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } })
      .to(p.querySelector('.shade'), { opacity: .7, duration: 1, ease: 'none' }, 0)
      .to(p.querySelector('.vframe'), { scale: .92, duration: 1, ease: 'none' }, 0)
      .to(p.querySelector('.ground-inner'), { opacity: 0, y: -40, duration: .32, ease: 'none' }, .68);
    const v = p.querySelector('video');
    if (v) ScrollTrigger.create({ trigger: next, start: 'top top',
      onEnter: () => { v.dataset.covered = '1'; v.pause(); },
      onLeaveBack: () => { delete v.dataset.covered; tryPlay(v); } });
  });

  /* подвал: слово выезжает */
  $$('.footer-word').forEach(w => gsap.fromTo(w, { yPercent: 40 }, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom bottom', scrub: true } }));

  /* видео в буквах: лёгкий зум */
  $$('.vtext video').forEach(v => gsap.fromTo(v, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: v.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

  observeReveals();
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
