/**
 * VPathing Enterprise LLC — Main JavaScript
 * No frameworks, no build step. Works with static hosting.
 */

(function () {
  'use strict';

  // ——— Mobile nav toggle ———
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('#main-nav .nav-list');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !expanded);
      nav.classList.toggle('is-open');
    });

    // Close on escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      }
    });
  }

  // ——— Apps data (fetch from data/apps.json) ———
  var APPS_URL = '/data/apps.json';

  function getStatusClass(status) {
    if (!status) return 'badge--dev';
    var s = (status + '').toLowerCase();
    if (s === 'live') return 'badge--live';
    if (s === 'mvp') return 'badge--mvp';
    return 'badge--dev';
  }

  function renderAppCard(app) {
    var links = app.links || {};
    var hasLinks = links.website || links.demo || links.github;
    var statusClass = getStatusClass(app.status);

    var tagsHtml = (app.tags || []).map(function (tag) {
      return '<li>' + escapeHtml(tag) + '</li>';
    }).join('');

    var linksHtml = '';
    if (hasLinks) {
      if (links.website) {
        linksHtml += '<a href="' + escapeAttr(links.website) + '" target="_blank" rel="noopener noreferrer">Website</a>';
      }
      if (links.demo) {
        linksHtml += '<a href="' + escapeAttr(links.demo) + '" target="_blank" rel="noopener noreferrer">Demo</a>';
      }
      if (links.github) {
        linksHtml += '<a href="' + escapeAttr(links.github) + '" target="_blank" rel="noopener noreferrer">GitHub</a>';
      }
    } else {
      linksHtml = '<span class="coming-soon">Coming soon</span>';
    }

    return (
      '<article class="app-card">' +
        '<h3>' + escapeHtml(app.name) + '</h3>' +
        '<p class="app-description">' + escapeHtml(app.description || '') + '</p>' +
        '<div class="app-meta">' +
          '<span class="badge ' + statusClass + '">' + escapeHtml(app.status || 'In development') + '</span>' +
        '</div>' +
        (tagsHtml ? '<ul class="tags">' + tagsHtml + '</ul>' : '') +
        '<div class="app-links">' + linksHtml + '</div>' +
      '</article>'
    );
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Render featured apps on the homepage (top N).
   * @param {HTMLElement} container - Element to append cards to
   * @param {number} limit - Max number of apps (e.g. 4)
   */
  function renderFeaturedApps(container, limit) {
    if (!container) return;
    fetch(APPS_URL)
      .then(function (res) { return res.ok ? res.json() : []; })
      .catch(function () { return []; })
      .then(function (apps) {
        var list = Array.isArray(apps) ? apps.slice(0, limit || 4) : [];
        container.innerHTML = list.map(renderAppCard).join('');
      });
  }

  /**
   * Initialize apps page: load apps, render grid, wire filters.
   */
  function initAppsPage() {
    var grid = document.getElementById('apps-grid');
    var emptyEl = document.getElementById('apps-empty');
    var searchInput = document.getElementById('apps-search');
    var statusSelect = document.getElementById('apps-status');
    if (!grid) return;

    function render(list) {
      grid.innerHTML = list.map(renderAppCard).join('');
      if (emptyEl) {
        emptyEl.style.display = list.length ? 'none' : 'block';
      }
    }

    function applyFilters() {
      var search = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
      var statusFilter = (statusSelect && statusSelect.value) ? statusSelect.value.trim() : '';
      fetch(APPS_URL)
        .then(function (res) { return res.ok ? res.json() : []; })
        .catch(function () { return []; })
        .then(function (apps) {
          var list = Array.isArray(apps) ? apps : [];
          if (search) {
            list = list.filter(function (app) {
              var name = (app.name || '').toLowerCase();
              var desc = (app.description || '').toLowerCase();
              return name.indexOf(search) !== -1 || desc.indexOf(search) !== -1;
            });
          }
          if (statusFilter) {
            list = list.filter(function (app) {
              return (app.status || '').trim() === statusFilter;
            });
          }
          render(list);
        });
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
      searchInput.addEventListener('change', applyFilters);
    }
    if (statusSelect) {
      statusSelect.addEventListener('change', applyFilters);
    }
    applyFilters();
  }

  // ——— Contact form (Formspree + Turnstile) ———
  function initContactForm() {
    var form = document.getElementById('contact-form');
    var messageEl = document.getElementById('form-message');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
      if (messageEl) {
        messageEl.style.display = 'none';
        messageEl.className = 'form-message';
        messageEl.textContent = '';
      }

      var action = form.getAttribute('action');
      if (!action || !action.startsWith('http')) {
        if (messageEl) {
          messageEl.textContent = 'Form is not configured. Please set the form action URL.';
          messageEl.className = 'form-message error';
          messageEl.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send message';
        }
        return;
      }

      var formData = new FormData(form);
      fetch(action, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (res.ok) {
            if (messageEl) {
              messageEl.textContent = 'Thank you. Your message has been sent.';
              messageEl.className = 'form-message success';
              messageEl.style.display = 'block';
            }
            form.reset();
            // Reset Turnstile if present
            if (typeof window.turnstile !== 'undefined' && form.querySelector('.cf-turnstile')) {
              var widget = form.querySelector('[name="cf-turnstile-response"]');
              if (widget && widget.id) {
                try { window.turnstile.reset(widget.id); } catch (_) {}
              }
            }
          } else {
            return res.json().then(function (data) {
              throw new Error(data.error || 'Something went wrong. Please try again.');
            }).catch(function (err) {
              if (err.message) throw err;
              throw new Error('Something went wrong. Please try again.');
            });
          }
        })
        .catch(function (err) {
          if (messageEl) {
            messageEl.textContent = err.message || 'Something went wrong. Please try again or email us directly.';
            messageEl.className = 'form-message error';
            messageEl.style.display = 'block';
          }
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send message';
          }
        });
    });
  }

  // ——— Logo expand (click header logo to show larger) ———
  function initLogoExpand() {
    var logoImg = document.querySelector('.logo-link .logo-img');
    var modal = document.getElementById('logo-modal');
    var closeBtn = modal && modal.querySelector('.logo-modal-close');
    if (!logoImg || !modal) return;

    logoImg.addEventListener('click', function (e) {
      e.preventDefault();
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    });

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  }

  // ——— Init ———
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initLogoExpand();
  });

  window.renderFeaturedApps = renderFeaturedApps;
  window.initAppsPage = initAppsPage;
  window.initContactForm = initContactForm;
})();
