/* =========================================
   The Blue House Tackleway — main.js
   Nav toggle + Gallery lightbox
   ========================================= */

// ---- Mobile Nav Toggle ----
(function () {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', function () {
    const isOpen = navLinks.classList.contains('open');
    if (isOpen) {
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    } else {
      navLinks.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
    }
  });

  // Close on link click
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
})();


// ---- Gallery Lightbox ----
(function () {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn  = document.getElementById('lightboxPrev');
  const nextBtn  = document.getElementById('lightboxNext');
  const imgWrap  = document.getElementById('lightboxImgWrap');
  const counter  = document.getElementById('lightboxCounter');
  const items    = Array.from(document.querySelectorAll('.gallery-item'));

  let currentIndex = 0;

  function renderSlide(index) {
    const item = items[index];
    imgWrap.innerHTML = '';

    const realImg = item.querySelector('img');
    if (realImg) {
      const img = document.createElement('img');
      img.src = realImg.src;
      img.alt = realImg.alt || 'Gallery image';
      imgWrap.appendChild(img);
    } else {
      // Clone placeholder for lightbox
      const ph = item.querySelector('.gallery-placeholder');
      const div = document.createElement('div');
      div.className = 'lightbox__placeholder';
      div.style.background = ph ? window.getComputedStyle(ph).background : 'linear-gradient(135deg,#3a8eaa,#1a5f7a)';
      // Clone the icon inside
      const icon = ph ? ph.querySelector('[data-lucide]') : null;
      if (icon) {
        const cloned = icon.cloneNode(true);
        cloned.style.width  = '5rem';
        cloned.style.height = '5rem';
        cloned.style.color  = 'rgba(255,255,255,0.5)';
        div.appendChild(cloned);
      }
      imgWrap.appendChild(div);
      // Re-render Lucide icons inside lightbox if available
      if (window.lucide) window.lucide.createIcons({ nodes: [div] });
    }

    if (counter) counter.textContent = (index + 1) + ' / ' + items.length;
  }

  function openLightbox(index) {
    currentIndex = index;
    renderSlide(currentIndex);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    renderSlide(currentIndex);
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % items.length;
    renderSlide(currentIndex);
  }

  items.forEach(function (item, i) {
    item.addEventListener('click', function () { openLightbox(i); });
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', 'Open image ' + (i + 1));
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn)  prevBtn.addEventListener('click', showPrev);
  if (nextBtn)  nextBtn.addEventListener('click', showNext);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  showPrev();
    if (e.key === 'ArrowRight') showNext();
  });
})();
