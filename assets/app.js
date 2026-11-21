/* ============================================================
   İlter Kavlak — shared script (no dependencies)

   1. renderCards() — turn a data array into a card grid.
      Listing pages (projects / blog / games) call this with
      their data file, so adding an entry never touches markup.
   2. Fill the current year into any [data-year] element.
   3. Copy buttons on landing-page code blocks ([data-copy]).
   4. Fade sections in as they scroll into view.

   Keeping logic here means the listing pages stay identical
   boilerplate — see /templates and README.md for the pattern.
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Render a list of items as cards, or an empty-state if the list is empty.
   * @param {string} mountId  id of the container element
   * @param {Array}  items    each: { title, href, meta?, tagline?, foot?, icon?, accent? }
   * @param {Object} empty    { emoji, title, body } shown when items is empty
   */
  window.renderCards = function renderCards(mountId, items, empty) {
    var el = document.getElementById(mountId);
    if (!el) return;

    if (!items || !items.length) {
      empty = empty || {};
      el.innerHTML =
        '<div class="empty">' +
          '<span class="empty-emoji" aria-hidden="true">' + esc(empty.emoji || '🚧') + '</span>' +
          '<strong>' + esc(empty.title || 'Under construction') + '</strong>' +
          '<span>' + esc(empty.body || 'Check back soon.') + '</span>' +
        '</div>';
      return;
    }

    el.innerHTML = items.map(function (it) {
      var accent = /^#[0-9a-f]{3,8}$/i.test(it.accent || '') ? ' style="--card-accent:' + it.accent + '"' : '';
      return '' +
        '<a class="card" href="' + esc(it.href) + '"' + accent + '>' +
          (it.icon ? '<span class="card-icon" aria-hidden="true">' + esc(it.icon) + '</span>' : '') +
          '<h3>' + esc(it.title) + '</h3>' +
          (it.meta ? '<div class="card-meta">' + esc(it.meta) + '</div>' : '') +
          (it.tagline ? '<p>' + esc(it.tagline) + '</p>' : '') +
          '<div class="card-foot">' + esc(it.foot || 'Open →') + '</div>' +
        '</a>';
    }).join('');
  };

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-copy]');
    if (!btn || !navigator.clipboard) return;
    var pre = btn.closest('.lp-code').querySelector('pre');
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    navigator.clipboard.writeText(pre.textContent).then(function () {
      btn.textContent = 'Copied';
      clearTimeout(btn._copyTimer);
      btn._copyTimer = setTimeout(function () { btn.textContent = btn.dataset.label; }, 1500);
    }).catch(function () {});
  });

  document.addEventListener('DOMContentLoaded', function () {
    var y = String(new Date().getFullYear());
    var nodes = document.querySelectorAll('[data-year]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = y;

    // Progressive fade-up on scroll. Skipped entirely (nothing hidden) when
    // the browser lacks IntersectionObserver or the user prefers less motion.
    // The hero is never hidden: it is on screen at load and would flash.
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var targets = document.querySelectorAll('.section, .card-grid');
    if (!targets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('reveal-in');
          e.target.classList.remove('reveal-init');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

    for (var j = 0; j < targets.length; j++) {
      targets[j].classList.add('reveal-init');
      io.observe(targets[j]);
    }
  });
})();
