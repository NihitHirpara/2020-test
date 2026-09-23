(function () {
  function measureLines(el) {
    var text = el.getAttribute('data-split-text') || el.textContent.trim();
    var words = text.split(/\s+/);
    var style = window.getComputedStyle(el);
    var probe = document.createElement('span');
    probe.style.cssText =
      'position:absolute;visibility:hidden;white-space:nowrap;font:' +
      style.font +
      ';letter-spacing:' +
      style.letterSpacing +
      ';';
    document.body.appendChild(probe);

    var maxWidth = el.clientWidth || (el.parentElement && el.parentElement.clientWidth) || 400;
    var lines = [];
    var current = '';

    words.forEach(function (word) {
      var next = current ? current + ' ' + word : word;
      probe.textContent = next;
      if (probe.offsetWidth > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) lines.push(current);
    document.body.removeChild(probe);

    if (text.indexOf('|') !== -1) {
      return text
        .split('|')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
    }
    return lines.length ? lines : [text];
  }

  function applySplit(el, force) {
    if (!el) return;
    if (el.dataset.splitApplied === 'true' && !force) return;

    var source =
      el.getAttribute('data-split-text') ||
      el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('data-split-text', source);

    var lines = measureLines(el);
    el.innerHTML = lines
      .map(function (line) {
        return (
          '<span class="tt-split__line"><span class="tt-split__inner">' +
          line +
          '</span></span>'
        );
      })
      .join('');
    el.dataset.splitApplied = 'true';
    el.classList.add('tt-split');
  }

  function resetSplit(el) {
    if (!el) return;
    el.classList.remove('is-ready', 'is-leaving', 'is-inview');
    void el.offsetWidth;
    el.classList.add('is-ready');
  }

  function leaveSplit(el) {
    if (!el) return;
    el.classList.add('is-leaving');
    el.classList.remove('is-ready', 'is-inview');
  }

  
  function swapText(el, newText, options) {
    var opts = options || {};
    var leaveMs = opts.leaveMs != null ? opts.leaveMs : 480;
    if (!el) return Promise.resolve();

    var next = (newText || '').trim();
    var prev = (el.getAttribute('data-split-text') || el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (next === prev && el.dataset.splitApplied === 'true') {
      return Promise.resolve();
    }

    applySplit(el);
    leaveSplit(el);

    return new Promise(function (resolve) {
      setTimeout(function () {
        el.classList.remove('is-leaving', 'is-ready', 'is-inview', 'tt-split');
        el.dataset.splitApplied = 'false';
        el.removeAttribute('data-split-text');
        el.textContent = next;
        el.setAttribute('data-split-text', next);
        applySplit(el, true);
        requestAnimationFrame(function () {
          resetSplit(el);
          resolve();
        });
      }, leaveMs);
    });
  }

  window.TTSplit = {
    apply: applySplit,
    reset: resetSplit,
    leave: leaveSplit,
    swap: swapText,
    observeInView: function (el, options) {
      applySplit(el);
      var opts = options || {};
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              el.classList.add('is-inview');
              if (opts.once !== false) observer.unobserve(el);
            }
          });
        },
        { threshold: opts.threshold || 0.35 }
      );
      observer.observe(el);
    },
  };
})();
