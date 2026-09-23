(function () {
  var TRANSITION_MS = 1400;
  var FROM_CLIP = 'inset(46% 0% 46% 0%)';
  var TO_CLIP = 'inset(0% 0% 0% 0%)';
  var EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

  class TTHero extends HTMLElement {
    connectedCallback() {
      this.slides = Array.from(this.querySelectorAll('[data-tt-slide]'));
      this.captionEl = this.querySelector('[data-tt-caption]');
      this.titleEl = this.querySelector('[data-tt-title]');
      this.contentEl = this.querySelector('.tt-hero__content');
      this.currentEl = this.querySelector('[data-tt-current]');
      this.totalEl = this.querySelector('[data-tt-total]');
      this.nextBtn = this.querySelector('[data-tt-next]');
      this.nextImg = this.querySelector('[data-tt-next-img]');
      this.nextImgIn = this.querySelector('[data-tt-next-img-in]');
      this.progressRect = this.querySelector('[data-tt-progress]');
      this.controls = this.querySelector('.tt-hero__controls');
      this.duration = Number(this.dataset.duration || 5000);
      this.index = 0;
      this.busy = false;
      this.perimeter = 520;
      this._textLocked = false;
      this._runId = 0;
      this._heroAnim = null;
      this._thumbAnim = null;

      if (!this.slides.length) return;

      this.style.display = 'block';
      this.style.position = 'relative';

      if (this.controls) this.controls.style.opacity = '1';

      if (this.progressRect) {
        if (this.progressRect.getTotalLength) {
          try {
            this.perimeter = this.progressRect.getTotalLength();
          } catch (e) {}
        }
        this.progressRect.style.strokeDasharray = String(this.perimeter);
        this.progressRect.style.strokeDashoffset = String(this.perimeter);
      }

      if (this.totalEl) {
        this.totalEl.textContent = String(this.slides.length).padStart(2, '0');
      }

      this.preloadAllSlideImages();
      this.updateCounter();
      this.applyThumbSrc(this.getNextSlideSrc(), true);
      this.bind();
      this.startProgress();
      this.playIntroTextOnce();
    }

    disconnectedCallback() {
      this.stopProgress();
      this._runId += 1;
      this.stopAnim(this._heroAnim);
      this.stopAnim(this._thumbAnim);
      if (this.nextBtn) this.nextBtn.removeEventListener('click', this._onNext);
    }

    
    stopAnim(anim) {
      if (!anim) return;
      try {
        anim.onfinish = null;
        anim.oncancel = null;
        anim.cancel();
      } catch (e) {}
    }

    bind() {
      this._onNext = this.goNext.bind(this);
      if (this.nextBtn) this.nextBtn.addEventListener('click', this._onNext);
    }

    preloadAllSlideImages() {
      this.slides.forEach(function (slide) {
        var img = slide.querySelector('img');
        if (!img) return;
        var src = img.currentSrc || img.src;
        if (!src) return;
        var pre = new Image();
        pre.src = src;
      });
    }

    playIntroTextOnce() {
      if (this._textLocked) return;
      if (window.TTSplit && this.captionEl && this.titleEl) {
        window.TTSplit.apply(this.captionEl);
        window.TTSplit.apply(this.titleEl);
        requestAnimationFrame(
          function () {
            window.TTSplit.reset(this.captionEl);
            window.TTSplit.reset(this.titleEl);
          }.bind(this)
        );
      }
      setTimeout(
        function () {
          this.lockText();
        }.bind(this),
        1100
      );
    }

    lockText() {
      this._textLocked = true;
      this.classList.add('tt-text-locked');
      if (this.contentEl) this.contentEl.classList.add('tt-text-locked');
      [this.captionEl, this.titleEl].forEach(function (el) {
        if (!el) return;
        el.classList.remove('is-leaving');
        el.classList.add('is-ready', 'tt-text-locked');
      });
    }

    updateCounter() {
      if (this.currentEl) {
        this.currentEl.textContent = String(this.index + 1).padStart(2, '0');
      }
    }

    getNextSlideSrc() {
      var nextIndex = (this.index + 1) % this.slides.length;
      var nextSlide = this.slides[nextIndex];
      var img = nextSlide && nextSlide.querySelector('img');
      if (!img) return '';
      return img.currentSrc || img.src || '';
    }

    applyThumbSrc(src, instant) {
      if (!src || !this.nextImg) return;
      this.nextImg.setAttribute('src', src);
      this.nextImg.alt = 'Next slide';
      if (this.nextImgIn) {
        this.nextImgIn.hidden = true;
        this.nextImgIn.classList.remove('is-animating');
        this.nextImgIn.style.cssText = '';
      }
    }

    waitForImage(src) {
      return new Promise(function (resolve) {
        if (!src) {
          resolve();
          return;
        }
        var img = new Image();
        img.onload = function () {
          resolve();
        };
        img.onerror = function () {
          resolve();
        };
        img.src = src;
        if (img.complete) resolve();
      });
    }

    runCurtain(el) {
      if (!el || typeof el.animate !== 'function') {
        el.style.clipPath = TO_CLIP;
        return null;
      }
      return el.animate(
        [
          { clipPath: FROM_CLIP, webkitClipPath: FROM_CLIP },
          { clipPath: TO_CLIP, webkitClipPath: TO_CLIP },
        ],
        {
          duration: TRANSITION_MS,
          easing: EASING,
          fill: 'forwards',
        }
      );
    }

    animDone(anim) {
      return new Promise(function (resolve) {
        if (!anim) {
          resolve();
          return;
        }
        anim.onfinish = function () {
          resolve();
        };
        anim.oncancel = function () {
          resolve();
        };
      });
    }

    setProgress(ratio) {
      if (!this.progressRect) return;
      var r = Math.min(1, Math.max(0, ratio));
      this.progressRect.style.strokeDashoffset = String(this.perimeter * (1 - r));
    }

    startProgress() {
      this.stopProgress();
      this.setProgress(0);
      var start = performance.now();
      var tick = function (now) {
        var ratio = (now - start) / this.duration;
        this.setProgress(ratio);
        if (ratio >= 1) {
          this.setProgress(1);
          if (this.busy) {
            this._raf = requestAnimationFrame(tick);
            return;
          }
          this.goNext();
          return;
        }
        this._raf = requestAnimationFrame(tick);
      }.bind(this);
      this._raf = requestAnimationFrame(tick);
    }

    stopProgress() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    clearSlideInline(el) {
      if (!el) return;
      el.style.transition = '';
      el.style.clipPath = '';
      el.style.webkitClipPath = '';
      el.style.zIndex = '';
      el.style.opacity = '';
      el.style.visibility = '';
      el.style.transform = '';
    }

    goNext() {
      if (this.busy || this.slides.length < 2) {
        if (!this.busy) this.startProgress();
        return;
      }

      this.busy = true;
      this.stopProgress();
      this.setProgress(0);
      this.startProgress();
      this.lockText();

      var runId = ++this._runId;
      var current = this.slides[this.index];
      var nextIndex = (this.index + 1) % this.slides.length;
      var next = this.slides[nextIndex];

      this.index = nextIndex;
      var upcomingSrc = this.getNextSlideSrc();
      this.updateCounter();

      this.classList.add('is-animating');
      if (this.controls) this.controls.style.opacity = '1';

      current.classList.add('is-active');
      current.style.zIndex = '2';

      next.classList.add('is-expanding');
      next.style.opacity = '1';
      next.style.visibility = 'visible';
      next.style.zIndex = '4';

      var prefersReduced =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      var finish = function () {
        if (runId !== this._runId) return;

        current.classList.remove('is-active');
        this.clearSlideInline(current);
        next.classList.remove('is-expanding');
        next.classList.add('is-active');
        this.clearSlideInline(next);

        this.applyThumbSrc(upcomingSrc, true);

        this.stopAnim(this._heroAnim);
        this.stopAnim(this._thumbAnim);
        this._heroAnim = null;
        this._thumbAnim = null;

        this.classList.remove('is-animating');
        this.lockText();
        this.busy = false;
      }.bind(this);

      if (prefersReduced) {
        next.style.clipPath = TO_CLIP;
        this.applyThumbSrc(upcomingSrc, true);
        finish();
        return;
      }

      if (upcomingSrc) {
        var pre = new Image();
        pre.src = upcomingSrc;
      }

      if (this.nextImgIn && upcomingSrc) {
        this.nextImgIn.hidden = false;
        this.nextImgIn.classList.add('is-animating');
        this.nextImgIn.setAttribute('src', upcomingSrc);
        this.nextImgIn.style.opacity = '1';
        this.nextImgIn.style.visibility = 'visible';
        this.nextImgIn.style.clipPath = FROM_CLIP;
        this.nextImgIn.style.webkitClipPath = FROM_CLIP;
      }

      next.style.clipPath = FROM_CLIP;
      next.style.webkitClipPath = FROM_CLIP;

      requestAnimationFrame(
        function () {
          if (runId !== this._runId) return;

          this._heroAnim = this.runCurtain(next);
          this._thumbAnim =
            this.nextImgIn && upcomingSrc ? this.runCurtain(this.nextImgIn) : null;

          Promise.all([this.animDone(this._heroAnim), this.animDone(this._thumbAnim)]).then(
            finish
          );
        }.bind(this)
      );
    }
  }

  if (!customElements.get('tt-hero')) {
    customElements.define('tt-hero', TTHero);
  }
})();
