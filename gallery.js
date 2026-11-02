(function () {
  var gallery = document.getElementById('gallery');
  var photos = (window.PHOTOS || []).slice();
  var usingPlaceholders = photos.length === 0;

  if (usingPlaceholders) {
    var ratios = [1.25, 0.8, 1, 1.4, 0.75, 1.1, 0.9, 1.3, 1];
    ratios.forEach(function (r, i) { photos.push({ placeholder: true, ratio: r, alt: 'Placeholder ' + (i + 1) }); });
  }

  var shades = ['--ph1', '--ph2', '--ph3'];
  photos.forEach(function (p, i) {
    var btn = document.createElement('button');
    btn.className = 'item';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open photo ' + (i + 1));
    if (p.placeholder) {
      var d = document.createElement('div');
      d.className = 'ph';
      d.style.paddingBottom = (p.ratio * 100) + '%';
      d.style.background = 'var(' + shades[i % 3] + ')';
      btn.appendChild(d);
      btn.disabled = true;
      btn.style.cursor = 'default';
    } else {
      var img = document.createElement('img');
      img.src = p.src; img.alt = p.alt || ''; img.loading = 'lazy';
      btn.appendChild(img);
      btn.addEventListener('click', function () { open(i); });
    }
    gallery.appendChild(btn);
  });

  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var current = 0;
  function show(i) {
    current = (i + photos.length) % photos.length;
    lbImg.src = photos[current].src;
    lbImg.alt = photos[current].alt || '';
  }
  function open(i) { if (usingPlaceholders) return; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; }
  function close() { lb.hidden = true; lbImg.src = ''; document.body.style.overflow = ''; }
  document.getElementById('lbClose').addEventListener('click', close);
  document.getElementById('lbPrev').addEventListener('click', function (e) { e.stopPropagation(); show(current - 1); });
  document.getElementById('lbNext').addEventListener('click', function (e) { e.stopPropagation(); show(current + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbImg) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  // Scroll-reveal animation (content stays visible if anything fails)
  document.documentElement.classList.add('js');
  document.querySelectorAll('.gallery img').forEach(function (im) {
    if (im.complete) im.classList.add('loaded'); else im.addEventListener('load', function () { im.classList.add('loaded'); });
  });
  var targets = document.querySelectorAll('.gallery .item, .reveal-block');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
    targets.forEach(function (t, i) { t.style.setProperty('--td', ((i % 3) * 0.09) + 's'); io.observe(t); });
  } else { targets.forEach(function (t) { t.classList.add('in'); }); }
})();
