(function () {
  var GITHUB_OWNER = 'muzo-sh';
  var GITHUB_REPO = 'muzovisuals';
  var IMAGES_PATH = 'images';

  var gallery = document.getElementById('gallery');
  var photos = (window.PHOTOS || []).slice();

  function renderGallery() {
    gallery.innerHTML = '';
    photos.forEach(function (p, i) {
      var btn = document.createElement('button');
      btn.className = 'item';
      btn.type = 'button';
      btn.setAttribute('aria-label', p.alt || ('View photo ' + (i + 1)));

      var img = document.createElement('img');
      img.src = p.src;
      img.alt = p.alt || '';
      img.loading = 'lazy';
      img.addEventListener('load', function () { img.classList.add('loaded'); });
      if (img.complete) img.classList.add('loaded');

      btn.appendChild(img);
      btn.addEventListener('click', function () { openLightbox(i); });

      // Subtle 3D tilt motion on hover
      if (window.matchMedia('(hover: hover)').matches) {
        btn.addEventListener('mousemove', function (e) {
          var rect = btn.getBoundingClientRect();
          var x = (e.clientX - rect.left) / rect.width - 0.5;
          var y = (e.clientY - rect.top) / rect.height - 0.5;
          btn.style.transform = 'perspective(800px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 4).toFixed(2) + 'deg) translateY(-3px)';
        });
        btn.addEventListener('mouseleave', function () {
          btn.style.transform = '';
        });
      }

      gallery.appendChild(btn);
    });
  }

  // Initial render from photos.js
  renderGallery();

  // ============ AUTOMATIC GITHUB IMAGE DISCOVERY ============
  // Whenever you upload a new .jpg/.png/.webp into the images/ folder on GitHub (muzo-sh/muzovisuals),
  // this script automatically detects it and adds it to the gallery without needing any code changes.
  async function syncNewPhotosFromGitHub() {
    try {
      var apiUrl = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + IMAGES_PATH;
      var res = await fetch(apiUrl);
      if (!res.ok) return;
      var files = await res.json();
      if (!Array.isArray(files)) return;

      var existingMap = {};
      photos.forEach(function (p) {
        var cleanName = p.src.split('/').pop().toLowerCase();
        existingMap[cleanName] = true;
      });

      var added = false;
      files.forEach(function (file) {
        if (!file.name || !/\.(jpe?g|png|webp|avif)$/i.test(file.name)) return;
        var key = file.name.toLowerCase();
        if (!existingMap[key]) {
          // New photo uploaded to GitHub! Prepend to top of gallery
          photos.unshift({
            src: IMAGES_PATH + '/' + file.name,
            download_url: file.download_url,
            alt: 'Muzo Visuals photography'
          });
          existingMap[key] = true;
          added = true;
        }
      });

      if (added) {
        renderGallery();
      }
    } catch (e) {
      // Quietly fall back to photos.js if offline
    }
  }

  syncNewPhotosFromGitHub();

  // ============ 3D Tilt for Hero & Info Cards ============
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = 'perspective(900px) rotateX(' + (-y * 2.8).toFixed(2) + 'deg) rotateY(' + (x * 2.8).toFixed(2) + 'deg) translateY(-2px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  // ============ FULL-RES LIGHTBOX + ZOOM + REAL BINARY EXIF READER ============
  var lb = document.getElementById('lightbox');
  var lbStage = document.getElementById('lbStage');
  var lbImg = document.getElementById('lbImg');
  var lbCounter = document.getElementById('lbCounter');
  var lbZoomToggle = document.getElementById('lbZoomToggle');
  var hudCamera = document.getElementById('hudCamera');
  var hudRes = document.getElementById('hudRes');
  var hudSpecs = document.getElementById('hudSpecs');

  var current = 0;
  var scale = 1;
  var panX = 0, panY = 0;
  var isDragging = false;
  var startX = 0, startY = 0;

  function applyTransform() {
    lbImg.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
    lbZoomToggle.textContent = Math.round(scale * 100) + '%';
    if (scale > 1) {
      lbStage.classList.add('is-zoomed');
    } else {
      lbStage.classList.remove('is-zoomed');
    }
  }

  function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function formatExposure(val) {
    if (!val) return null;
    if (val >= 1) return val + 's';
    var denom = Math.round(1 / val);
    return '1/' + denom + 's';
  }

  async function extractAndShowMetadata(imgEl, srcUrl) {
    hudCamera.textContent = 'Reading metadata…';
    hudRes.textContent = '';
    hudSpecs.innerHTML = '';

    var w = imgEl.naturalWidth || 0;
    var h = imgEl.naturalHeight || 0;
    if (w && h) {
      var mp = ((w * h) / 1000000).toFixed(1);
      hudRes.textContent = w + ' × ' + h + ' (' + mp + ' MP)';
    }

    try {
      if (window.exifr) {
        var exif = await window.exifr.parse(srcUrl, [
          'Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime',
          'ISO', 'FocalLength', 'DateTimeOriginal'
        ]);
        if (exif && (exif.Model || exif.ISO || exif.FNumber || exif.ExposureTime)) {
          var cam = [exif.Make, exif.Model].filter(Boolean).join(' ').replace(/SONY\s+SONY/i, 'Sony');
          hudCamera.textContent = cam || 'Camera EXIF';

          var pills = [];
          if (exif.LensModel) pills.push(exif.LensModel);
          if (exif.FocalLength) pills.push(Math.round(exif.FocalLength) + 'mm');
          if (exif.FNumber) pills.push('ƒ/' + exif.FNumber);
          if (exif.ExposureTime) pills.push(formatExposure(exif.ExposureTime));
          if (exif.ISO) pills.push('ISO ' + exif.ISO);

          hudSpecs.innerHTML = pills.map(function (p) {
            return '<span class="hud__pill">' + p + '</span>';
          }).join('');
          return;
        }
      }
    } catch (err) {
      // EXIF stripped or unavailable
    }

    // When image has no embedded EXIF yet, display real dimensions cleanly
    hudCamera.textContent = 'Muzo Visuals · Original Capture';
    hudSpecs.innerHTML =
      '<span class="hud__pill">Full Resolution</span>' +
      '<span class="hud__pill">EXIF Ready</span>';
  }

  function showPhoto(i) {
    current = (i + photos.length) % photos.length;
    resetZoom();
    var item = photos[current];
    lbCounter.textContent = (current + 1) + ' / ' + photos.length;
    lbImg.src = item.src;
    lbImg.alt = item.alt || '';

    lbImg.onload = function () {
      extractAndShowMetadata(lbImg, item.src);
    };
  }

  function openLightbox(i) {
    showPhoto(i);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.hidden = true;
    lbImg.src = '';
    document.body.style.overflow = '';
  }

  // Click / Wheel Zoom & Drag Pan inside Lightbox
  lbZoomToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    if (scale === 1) { scale = 2.25; } else { scale = 1; panX = 0; panY = 0; }
    applyTransform();
  });

  lbStage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var delta = e.deltaY < 0 ? 0.25 : -0.25;
    scale = Math.min(4, Math.max(1, scale + delta));
    if (scale === 1) { panX = 0; panY = 0; }
    applyTransform();
  }, { passive: false });

  lbStage.addEventListener('mousedown', function (e) {
    if (scale <= 1) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
  });

  window.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    lbImg.style.transition = 'none';
    applyTransform();
  });

  window.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false;
      lbImg.style.transition = '';
    }
  });

  lbStage.addEventListener('dblclick', function (e) {
    e.stopPropagation();
    if (scale === 1) { scale = 2.5; } else { resetZoom(); }
    applyTransform();
  });

  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', function (e) { e.stopPropagation(); showPhoto(current - 1); });
  document.getElementById('lbNext').addEventListener('click', function (e) { e.stopPropagation(); showPhoto(current + 1); });
  lbStage.addEventListener('click', function (e) {
    if (e.target === lbStage && scale === 1) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPhoto(current - 1);
    if (e.key === 'ArrowRight') showPhoto(current + 1);
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
