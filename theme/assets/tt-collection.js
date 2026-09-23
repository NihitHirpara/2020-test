(function () {
  var root = document.getElementById('tt-plp');
  if (!root) return;

  var items = Array.from(root.querySelectorAll('[data-tt-item]'));
  var countEl = root.querySelector('[data-tt-count]');
  var emptyEl = root.querySelector('[data-tt-empty]');
  var clearBtn = root.querySelector('[data-tt-clear]');
  var categoryBox = root.querySelector('[data-tt-filter-options="category"]');
  var colorBox = root.querySelector('[data-tt-filter-options="color"]');

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  var categories = uniqueSorted(
    items.map(function (el) {
      return el.getAttribute('data-category');
    })
  );
  var colors = uniqueSorted(
    items.reduce(function (acc, el) {
      var raw = el.getAttribute('data-colors') || '';
      return acc.concat(raw.split('|').map(function (s) {
        return s.trim();
      }));
    }, [])
  );

  function buildOptions(container, values, name) {
    if (!container) return;
    if (!values.length) {
      container.innerHTML = '<p class="tt-plp__filter-empty">No options</p>';
      return;
    }
    container.innerHTML = values
      .map(function (value) {
        var id = name + '-' + value.replace(/\s+/g, '-').toLowerCase();
        return (
          '<label class="tt-plp__filter-option">' +
          '<input type="checkbox" data-tt-filter="' +
          name +
          '" value="' +
          value.replace(/"/g, '&quot;') +
          '" id="' +
          id +
          '">' +
          '<span>' +
          value +
          '</span>' +
          '</label>'
        );
      })
      .join('');
  }

  buildOptions(categoryBox, categories, 'category');
  buildOptions(colorBox, colors, 'color');

  function selected(name) {
    return Array.from(root.querySelectorAll('[data-tt-filter="' + name + '"]:checked')).map(function (input) {
      return input.value;
    });
  }

  function applyFilters() {
    var cats = selected('category');
    var cols = selected('color');
    var visible = 0;

    items.forEach(function (el) {
      var cat = el.getAttribute('data-category') || '';
      var itemColors = (el.getAttribute('data-colors') || '').split('|').map(function (s) {
        return s.trim();
      });
      var catOk = !cats.length || cats.indexOf(cat) !== -1;
      var colorOk =
        !cols.length ||
        cols.some(function (c) {
          return itemColors.indexOf(c) !== -1;
        });
      var show = catOk && colorOk;
      el.hidden = !show;
      if (show) visible += 1;
    });

    if (countEl) countEl.textContent = String(visible);
    if (emptyEl) emptyEl.hidden = visible !== 0;
    if (clearBtn) clearBtn.hidden = !(cats.length || cols.length);
  }

  root.addEventListener('change', function (e) {
    if (e.target && e.target.matches('[data-tt-filter]')) applyFilters();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      root.querySelectorAll('[data-tt-filter]').forEach(function (input) {
        input.checked = false;
      });
      applyFilters();
    });
  }

  applyFilters();
})();
