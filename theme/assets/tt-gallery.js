(function () {
  var TILT = 9.55;
  var ARC_DROP = 58;
  var FRICTION = 0.92;
  var SNAP_EASE = 0.14;
  var COPIES = 3;

  class TTGallery extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-tt-track]');
      this.viewport = this.querySelector('.tt-gallery__viewport') || this;
      this.metaEl = this.querySelector('.tt-gallery__meta');
      this.clientEl = this.querySelector('[data-tt-client]');
      this.locationEl = this.querySelector('[data-tt-location]');

      this.x = 0;
      this.vx = 0;
      this.dragging = false;
      this.startX = 0;
      this.startOffset = 0;
      this.lastX = 0;
      this.lastT = 0;
      this.raf = null;
      this.snapTarget = null;
      this._metaKey = '';

      if (!this.track) return;

      this.setupInfiniteSlides();
      if (!this.slides.length) return;

      this.bind();
      this.updateMeta(false);

      requestAnimationFrame(
        function () {
          this.x = this.offsetFor(this.index);
          this.applyX();
          this.updateSlideTransforms(true);
          this.loop();
        }.bind(this)
      );

      window.addEventListener('resize', this._onResize);
    }

    disconnectedCallback() {
      window.removeEventListener('resize', this._onResize);
      this.unbind();
      if (this.raf) cancelAnimationFrame(this.raf);
    }

    
    setupInfiniteSlides() {
      var originals = Array.from(this.track.querySelectorAll('[data-tt-gallery-slide]'));
      this.realCount = originals.length;
      if (!this.realCount) {
        this.slides = [];
        return;
      }

      var start = Math.min(
        Number(this.dataset.start || 0),
        Math.max(0, this.realCount - 1)
      );

      var frag = document.createDocumentFragment();
      for (var c = 0; c < COPIES; c++) {
        originals.forEach(function (slide, i) {
          var node = slide.cloneNode(true);
          node.setAttribute('data-tt-real-index', String(i));
          node.removeAttribute('data-shopify-editor-block');
          frag.appendChild(node);
        });
      }
      this.track.innerHTML = '';
      this.track.appendChild(frag);
      this.slides = Array.from(this.track.querySelectorAll('[data-tt-gallery-slide]'));
      this.index = this.realCount + start;
    }

    bind() {
      this._onPointerDown = this.onPointerDown.bind(this);
      this._onPointerMove = this.onPointerMove.bind(this);
      this._onPointerUp = this.onPointerUp.bind(this);
      this._onResize = this.onResize.bind(this);

      this.addEventListener('pointerdown', this._onPointerDown);
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerup', this._onPointerUp);
      window.addEventListener('pointercancel', this._onPointerUp);
    }

    unbind() {
      this.removeEventListener('pointerdown', this._onPointerDown);
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerup', this._onPointerUp);
      window.removeEventListener('pointercancel', this._onPointerUp);
    }

    onResize() {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(
        function () {
          this.normalizeLoop(true);
          this.vx = 0;
          this.snapTarget = null;
          this.x = this.offsetFor(this.index);
          this.applyX();
          this.updateSlideTransforms(true);
        }.bind(this),
        100
      );
    }

    cardWidth() {
      var slide = this.slides[0];
      return slide ? slide.offsetWidth : 435;
    }

    cardHeight() {
      var slide = this.slides[0];
      return slide ? slide.offsetHeight : 619;
    }

    gap() {
      var styles = window.getComputedStyle(this.track);
      return parseFloat(styles.columnGap || styles.gap || '173') || 173;
    }

    step() {
      return this.cardWidth() + this.gap();
    }

    loopWidth() {
      return this.realCount * this.step();
    }

    viewportWidth() {
      return this.viewport.getBoundingClientRect().width || window.innerWidth;
    }

    offsetFor(index) {
      var step = this.step();
      var card = this.cardWidth();
      return this.viewportWidth() / 2 - card / 2 - index * step;
    }

    wrapReal(i) {
      var n = this.realCount;
      return ((i % n) + n) % n;
    }

    nearestIndex(x) {
      var step = this.step();
      var card = this.cardWidth();
      var centerOrigin = this.viewportWidth() / 2 - card / 2;
      var raw = (centerOrigin - x) / step;
      return Math.round(raw);
    }

    
    normalizeLoop(force) {
      var n = this.realCount;
      if (n < 1) return;
      var min = n;
      var max = n * 2 - 1;
      if (!force && this.index >= min && this.index <= max) return;

      var real = this.wrapReal(this.index);
      var target = n + real;
      if (target === this.index) return;

      var delta = (target - this.index) * this.step();
      this.index = target;
      this.x += delta;
      if (this.snapTarget !== null) this.snapTarget += delta;
      this.applyX();
    }

    applyX() {
      this.track.style.transform = 'translate3d(' + this.x + 'px,0,0)';
    }

    updateSlideTransforms(forceActiveClass) {
      var viewCenter = this.viewportWidth() / 2;
      var step = this.step();
      var dropUnit = ARC_DROP * (this.cardHeight() / 619);
      var closest = 0;
      var closestDist = Infinity;

      this.slides.forEach(
        function (slide, i) {
          var slideCenter = this.x + i * step + this.cardWidth() / 2;
          var dist = (slideCenter - viewCenter) / step;
          var abs = Math.abs(dist);
          var sign = dist < 0 ? -1 : dist > 0 ? 1 : 0;

          var tilt =
            sign *
            Math.min(14, abs * TILT + (abs > 1 ? (abs - 1) * 2.2 : 0));
          var ty = abs * abs * dropUnit;
          var scale = abs <= 1 ? 1 : Math.max(0.92, 1 - (abs - 1) * 0.05);

          slide.style.transform =
            'translate3d(0,' +
            ty.toFixed(2) +
            'px,0) rotate(' +
            tilt.toFixed(3) +
            'deg) scale(' +
            scale.toFixed(4) +
            ')';
          slide.style.opacity = '1';
          slide.style.zIndex = String(Math.round(20 - abs * 10));

          if (abs < closestDist) {
            closestDist = abs;
            closest = i;
          }
        }.bind(this)
      );

      if (forceActiveClass || !this.dragging) {
        this.slides.forEach(
          function (slide, i) {
            slide.classList.toggle('is-active', i === closest);
            slide.classList.toggle('is-prev', i === closest - 1);
            slide.classList.toggle('is-next', i === closest + 1);
          }.bind(this)
        );
      }

      return closest;
    }

    updateMeta(animate) {
      var slide = this.slides[this.index];
      if (!slide) return;
      var client = slide.dataset.client || '';
      var location = slide.dataset.location || '';
      var key = client + '|' + location;
      if (key === this._metaKey && animate) return;
      this._metaKey = key;

      if (!animate || !window.TTSplit) {
        if (this.clientEl) {
          this.clientEl.textContent = client;
          if (window.TTSplit) {
            window.TTSplit.apply(this.clientEl, true);
            window.TTSplit.reset(this.clientEl);
          }
        }
        if (this.locationEl) {
          this.locationEl.textContent = location;
          if (window.TTSplit) {
            window.TTSplit.apply(this.locationEl, true);
            window.TTSplit.reset(this.locationEl);
          }
        }
        return;
      }

      window.TTSplit.swap(this.clientEl, client);
      window.TTSplit.swap(this.locationEl, location, { leaveMs: 520 });
    }

    onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      this.dragging = true;
      this.classList.add('is-dragging');
      this.snapTarget = null;
      this.vx = 0;
      this.startX = e.clientX;
      this.startOffset = this.x;
      this.lastX = e.clientX;
      this.lastT = performance.now();
      try {
        this.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    onPointerMove(e) {
      if (!this.dragging) return;
      var now = performance.now();
      var dx = e.clientX - this.startX;
      this.x = this.startOffset + dx;

      var dt = Math.max(16, now - this.lastT);
      this.vx = ((e.clientX - this.lastX) / dt) * 16;
      this.lastX = e.clientX;
      this.lastT = now;

      this.applyX();
      this.updateSlideTransforms(false);
    }

    onPointerUp() {
      if (!this.dragging) return;
      this.dragging = false;
      this.classList.remove('is-dragging');

      var projected = this.x + this.vx * 12;
      var next = this.nearestIndex(projected);

      if (Math.abs(this.vx) > 8) {
        if (this.vx < 0) next = this.index + 1;
        else next = this.index - 1;
      }

      next = Math.max(0, Math.min(this.slides.length - 1, next));

      if (next !== this.index) {
        this.index = next;
        this.updateMeta(true);
      }
      this.snapTarget = this.offsetFor(this.index);
    }

    loop() {
      if (this.dragging) {
      } else if (this.snapTarget !== null) {
        var diff = this.snapTarget - this.x;
        if (Math.abs(diff) < 0.4 && Math.abs(this.vx) < 0.2) {
          this.x = this.snapTarget;
          this.vx = 0;
          this.snapTarget = null;
          this.normalizeLoop(false);
          this.applyX();
        } else {
          this.x += diff * SNAP_EASE;
          this.vx *= FRICTION;
          this.applyX();
        }
        this.updateSlideTransforms(true);
      } else if (Math.abs(this.vx) > 0.15) {
        this.x += this.vx;
        this.vx *= FRICTION;
        this.applyX();
        var closest = this.updateSlideTransforms(false);
        if (Math.abs(this.vx) < 0.4) {
          this.index = closest;
          this.snapTarget = this.offsetFor(this.index);
          this.updateMeta(true);
        }
      } else {
        this.normalizeLoop(false);
        this.updateSlideTransforms(true);
      }

      this.raf = requestAnimationFrame(this.loop.bind(this));
    }
  }

  if (!customElements.get('tt-gallery')) {
    customElements.define('tt-gallery', TTGallery);
  }
})();
