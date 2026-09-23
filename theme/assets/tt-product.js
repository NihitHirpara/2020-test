(function () {
  var root = document.getElementById('tt-product');
  if (!root) return;

  var jsonEl = document.querySelector('[data-tt-product-json]');
  var variants = [];
  try {
    variants = JSON.parse(jsonEl.textContent);
  } catch (e) {}

  var variantInput = root.querySelector('[data-tt-variant-id]');
  var priceEl = root.querySelector('[data-tt-price]');
  var atc = root.querySelector('[data-tt-atc]');
  var atcLabel = root.querySelector('[data-tt-atc-label]');
  var optionInputs = root.querySelectorAll('[data-tt-option-input]');
  var currency = root.getAttribute('data-currency') || 'USD';

  function formatMoney(cents) {
    try {
      return (Number(cents) / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: currency,
      });
    } catch (e) {
      return '$' + (Number(cents) / 100).toFixed(2);
    }
  }

  function selectedOptions() {
    var opts = [];
    root.querySelectorAll('[data-tt-option]').forEach(function (fs) {
      var checked = fs.querySelector('input:checked');
      opts.push(checked ? checked.value : null);
    });
    return opts;
  }

  function findVariant(opts) {
    return variants.find(function (v) {
      return opts.every(function (val, i) {
        return !val || v['option' + (i + 1)] === val;
      });
    });
  }

  function updateUI(variant) {
    if (!variant) return;
    variantInput.value = variant.id;
    var html = formatMoney(variant.price);
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      html += ' <s class="tt-product__compare">' + formatMoney(variant.compare_at_price) + '</s>';
    }
    priceEl.innerHTML = html;
    atc.disabled = !variant.available;
    atcLabel.textContent = variant.available ? 'Add to cart' : 'Sold out';

    root.querySelectorAll('[data-tt-option]').forEach(function (fs, i) {
      var valEl = fs.querySelector('[data-tt-option-value]');
      if (valEl) valEl.textContent = variant['option' + (i + 1)] || '';
    });

    var url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url.toString());
  }

  optionInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      root.querySelectorAll('[data-tt-option]').forEach(function (fs) {
        fs.querySelectorAll('.tt-product__swatch').forEach(function (sw) {
          sw.classList.toggle('is-selected', sw.querySelector('input').checked);
        });
      });
      updateUI(findVariant(selectedOptions()));
    });
  });

  var qtyInput = root.querySelector('[data-tt-qty-input]');
  var minus = root.querySelector('[data-tt-qty-minus]');
  var plus = root.querySelector('[data-tt-qty-plus]');
  if (minus && plus && qtyInput) {
    minus.addEventListener('click', function () {
      qtyInput.value = Math.max(1, Number(qtyInput.value || 1) - 1);
    });
    plus.addEventListener('click', function () {
      qtyInput.value = Math.max(1, Number(qtyInput.value || 1) + 1);
    });
  }

  var thumbs = root.querySelectorAll('[data-tt-thumb]');
  var frames = root.querySelectorAll('[data-tt-frame]');
  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      var id = thumb.getAttribute('data-media-id');
      thumbs.forEach(function (t) {
        t.classList.toggle('is-active', t === thumb);
      });
      frames.forEach(function (f) {
        f.classList.toggle('is-active', f.getAttribute('data-media-id') === id);
      });
    });
  });
})();
