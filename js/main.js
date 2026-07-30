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

    // Mark active page
    var currentHref = window.location.pathname;
    nav.querySelectorAll('a').forEach(function (link) {
      var linkPath = new URL(link.href, window.location.origin).pathname;
      if (linkPath === currentHref || (currentHref === '/' && linkPath === '/')) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ——— Scroll reveal (fade/slide elements in on scroll) ———
  var _revealObserver = null;

  function observeReveal(el) {
    if (!el || !_revealObserver) return;
    el.classList.add('reveal');
    _revealObserver.observe(el);
  }

  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    _revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          _revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });

    var selectors = [
      '.hero', '.studio-section', '.coming-soon-section', '.mission-block',
      '.service-card', '.app-card', '.contact-form-wrap', '.process-list li'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(observeReveal);
  }

  // ——— Apps data (fetch from data/apps.json) ———
  var APPS_URL = '/data/apps.json';
  var _appsCache = null;
  var _appsFetchPromise = null;

  function fetchApps() {
    if (_appsCache !== null) return Promise.resolve(_appsCache);
    if (_appsFetchPromise) return _appsFetchPromise;
    _appsFetchPromise = fetch(APPS_URL)
      .then(function (res) { return res.ok ? res.json() : []; })
      .catch(function () { return []; })
      .then(function (apps) {
        _appsCache = Array.isArray(apps) ? apps : [];
        return _appsCache;
      });
    return _appsFetchPromise;
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  function getStatusClass(status) {
    if (!status) return 'badge--dev';
    var s = (status + '').toLowerCase();
    if (s === 'live') return 'badge--live';
    if (s === 'mvp') return 'badge--mvp';
    if (s === 'deployment') return 'badge--deployment';
    return 'badge--dev';
  }

  function renderAppCard(app) {
    var links = app.links || {};
    var hasLinks = links.signup || links.website || links.demo || links.github;
    var statusClass = getStatusClass(app.status);

    var tagsHtml = (app.tags || []).map(function (tag) {
      return '<li>' + escapeHtml(tag) + '</li>';
    }).join('');

    // Internal links (same site, e.g. /vpathcallassistant) navigate in the same
    // tab; external links open in a new tab.
    function linkAttrs(url) {
      return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    }

    var linksHtml = '';
    if (hasLinks) {
      if (links.signup) {
        linksHtml += '<a href="' + escapeAttr(links.signup) + '"' + linkAttrs(links.signup) + '>Sign up</a>';
      }
      if (links.website) {
        linksHtml += '<a href="' + escapeAttr(links.website) + '"' + linkAttrs(links.website) + '>Website</a>';
      }
      if (links.demo) {
        linksHtml += '<a href="' + escapeAttr(links.demo) + '"' + linkAttrs(links.demo) + '>Demo</a>';
      }
      if (links.github) {
        linksHtml += '<a href="' + escapeAttr(links.github) + '"' + linkAttrs(links.github) + '>GitHub</a>';
      }
    } else {
      linksHtml = '<span class="coming-soon">Coming soon</span>';
    }

    // Wire the whole tile: the title links to the app's primary destination
    // (website preferred), and a stretched ::after over the card makes the
    // entire tile clickable. The explicit links below stay independently
    // clickable (they sit above the stretched overlay).
    var primary = links.signup || links.website || links.demo || links.github;
    var titleHtml = primary
      ? '<h3><a class="app-card-link" href="' + escapeAttr(primary) + '"' + linkAttrs(primary) + '>' + escapeHtml(app.name) + '</a></h3>'
      : '<h3>' + escapeHtml(app.name) + '</h3>';

    var cornerBadge = app.badge
      ? '<span class="app-card-badge">' + escapeHtml(app.badge) + '</span>'
      : '';

    return (
      '<article class="app-card' + (primary ? ' app-card--linked' : '') + '">' +
        cornerBadge +
        titleHtml +
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
    fetchApps().then(function (apps) {
      var list = apps.slice(0, limit || 4);
      container.innerHTML = list.map(renderAppCard).join('');
      container.querySelectorAll('.app-card').forEach(observeReveal);
    });
  }

  /**
   * Render only the apps that link to a real page (links.website), as clickable
   * tiles. Used on the homepage so every tile shown is wired to somewhere.
   * @param {HTMLElement} container - Element to append cards to
   */
  function renderWiredApps(container) {
    if (!container) return;
    fetchApps().then(function (apps) {
      var list = apps.filter(function (app) {
        return app.links && (app.links.website || app.links.signup);
      });
      container.innerHTML = list.map(renderAppCard).join('');
      container.querySelectorAll('.app-card').forEach(observeReveal);
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
      grid.querySelectorAll('.app-card').forEach(observeReveal);
      if (emptyEl) {
        emptyEl.style.display = list.length ? 'none' : 'block';
      }
    }

    function applyFilters() {
      var search = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
      var statusFilter = (statusSelect && statusSelect.value) ? statusSelect.value.trim() : '';
      fetchApps().then(function (apps) {
        var list = apps.slice();
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

    var debouncedApplyFilters = debounce(applyFilters, 200);

    if (searchInput) {
      searchInput.addEventListener('input', debouncedApplyFilters);
      searchInput.addEventListener('change', applyFilters);
    }
    if (statusSelect) {
      statusSelect.addEventListener('change', applyFilters);
    }
    applyFilters();
  }

  // ——— Contact form (Worker /api/contact + Turnstile) ———
  var CONTACT_URL = '/api/contact';

  /**
   * Posts to our own Worker rather than to the form backend directly. The
   * Worker verifies the Turnstile token before forwarding anything, which is
   * what makes the widget on contact.html more than decoration, and it answers
   * with a JSON {ok} the reply below can actually trust.
   *
   * The previous version posted to FormSubmit's non-AJAX endpoint and treated
   * any 200 as delivered. That endpoint answers 200 with an HTML page — the
   * captcha challenge, or the "confirm your address" prompt — so the form
   * reported "your message has been sent" for submissions that were never sent.
   */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    var messageEl = document.getElementById('form-message');
    if (!form) return;

    function say(text, kind) {
      if (!messageEl) return;
      messageEl.textContent = text;
      messageEl.className = 'form-message ' + kind;
      messageEl.style.display = 'block';
    }

    function resetTurnstile() {
      var widget = form.querySelector('.cf-turnstile');
      if (!widget || typeof window.turnstile === 'undefined') return;
      // reset() takes the widget's container element. The old code passed the
      // id of the hidden cf-turnstile-response input, which is not a widget id,
      // so every reset threw and was swallowed — leaving a spent token behind
      // and making a second send fail with timeout-or-duplicate.
      try { window.turnstile.reset(widget); } catch (_) {}
    }

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

      var tokenEl = form.querySelector('[name="cf-turnstile-response"]');
      var payload = {
        name: fieldValue(form, 'name'),
        email: fieldValue(form, 'email'),
        subject: fieldValue(form, 'subject'),
        message: fieldValue(form, 'message'),
        turnstileToken: tokenEl ? tokenEl.value : ''
      };

      fetch(CONTACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          // Read the body regardless of status: the Worker returns its reason
          // in JSON on 4xx and 5xx alike. A non-JSON body means something
          // upstream answered instead, which is not a delivery.
          return res.json().then(
            function (data) { return { ok: res.ok, data: data }; },
            function () { return { ok: false, data: null }; }
          );
        })
        .then(function (result) {
          var data = result.data;
          if (result.ok && data && data.ok === true) {
            say('Thank you. Your message has been sent.', 'success');
            form.reset();
            resetTurnstile();
            return;
          }
          say(
            (data && data.error) || 'Something went wrong. Please try again, or email us directly.',
            'error'
          );
          // The token is spent whether or not delivery succeeded; without this
          // a retry always fails as a duplicate.
          resetTurnstile();
        })
        .catch(function () {
          say('Could not reach the server. Please check your connection, or email us directly.', 'error');
          resetTurnstile();
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send message';
          }
        });
    });
  }

  // ——— Checkout form (Worker /api/checkout + Turnstile -> Stripe) ———
  var CHECKOUT_URL = '/api/checkout';

  /**
   * Posts {email, plan, term, turnstileToken} to our Worker, which verifies
   * Turnstile and asks the backend to create a Stripe Checkout Session, then
   * returns its URL. On success we redirect the browser to Stripe; on any
   * failure we surface the Worker's reason and reset the (now-spent) token.
   */
  function initCheckoutForm() {
    var form = document.getElementById('checkout-form');
    var messageEl = document.getElementById('checkout-message');
    if (!form) return;

    function say(text, kind) {
      if (!messageEl) return;
      messageEl.textContent = text;
      messageEl.className = 'form-message ' + kind;
      messageEl.style.display = 'block';
    }
    function resetTurnstile() {
      var widget = form.querySelector('.cf-turnstile');
      if (!widget || typeof window.turnstile === 'undefined') return;
      try { window.turnstile.reset(widget); } catch (_) {}
    }
    function reenable(btn) {
      if (btn) { btn.disabled = false; btn.textContent = 'Continue to checkout'; }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Starting checkout…'; }
      if (messageEl) { messageEl.style.display = 'none'; messageEl.className = 'form-message'; messageEl.textContent = ''; }

      var tokenEl = form.querySelector('[name="cf-turnstile-response"]');
      // Comp/beta link (?comp=1): ask the Worker to enable the promo-code field
      // on any term so a comp code (e.g. Secretary) can be redeemed on monthly.
      var payload = {
        email: fieldValue(form, 'email'),
        plan: fieldValue(form, 'plan'),
        term: fieldValue(form, 'term'),
        turnstileToken: tokenEl ? tokenEl.value : ''
      };
      if (/[?&]comp=(1|true)\b/i.test(window.location.search)) payload.comp = true;

      fetch(CHECKOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().then(
            function (data) { return { ok: res.ok, data: data }; },
            function () { return { ok: false, data: null }; }
          );
        })
        .then(function (result) {
          var data = result.data;
          if (result.ok && data && data.ok === true && data.url) {
            say('Redirecting to secure checkout…', 'success');
            window.location.href = data.url;
            return; // page navigates away — leave the button disabled
          }
          say((data && data.error) || 'Something went wrong starting checkout. Please try again.', 'error');
          resetTurnstile();
          reenable(submitBtn);
        })
        .catch(function () {
          say('Could not reach the server. Please check your connection and try again.', 'error');
          resetTurnstile();
          reenable(submitBtn);
        });
    });
  }

  function fieldValue(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  }

  // ——— Waitlist form (Worker /api/contact + Turnstile) ———
  /**
   * The Call Assistant waitlist reuses the proven contact path: it POSTs to the
   * same /api/contact Worker (Turnstile-verified, FormSubmit-backed) with a
   * fixed "Waitlist signup" subject, instead of the old direct-to-FormSubmit
   * post that bypassed Turnstile server-side verification and silently failed.
   */
  function initWaitlistForm() {
    var form = document.getElementById('waitlist-form');
    var messageEl = document.getElementById('waitlist-message');
    if (!form) return;

    function say(text, kind) {
      if (!messageEl) return;
      messageEl.textContent = text;
      messageEl.className = 'form-message ' + kind;
      messageEl.style.display = 'block';
    }
    function resetTurnstile() {
      var widget = form.querySelector('.cf-turnstile');
      if (!widget || typeof window.turnstile === 'undefined') return;
      try { window.turnstile.reset(widget); } catch (_) {}
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Joining…'; }
      if (messageEl) { messageEl.style.display = 'none'; messageEl.className = 'form-message'; messageEl.textContent = ''; }

      var plan = fieldValue(form, 'plan');
      var use = fieldValue(form, 'use');
      var lines = ['Call Assistant waitlist signup.'];
      lines.push('Interested plan: ' + (plan || '(none selected)'));
      if (use) lines.push('Would use it for: ' + use);

      var tokenEl = form.querySelector('[name="cf-turnstile-response"]');
      var payload = {
        // Name is optional on the waitlist, but /api/contact requires one, so
        // fall back to a label rather than reject an anonymous signup.
        name: fieldValue(form, 'name') || 'Waitlist signup',
        email: fieldValue(form, 'email'),
        subject: 'Call Assistant — Waitlist signup',
        message: lines.join('\n'),
        turnstileToken: tokenEl ? tokenEl.value : ''
      };

      fetch(CONTACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().then(
            function (data) { return { ok: res.ok, data: data }; },
            function () { return { ok: false, data: null }; }
          );
        })
        .then(function (result) {
          var data = result.data;
          if (result.ok && data && data.ok === true) {
            say("You're on the list — we'll be in touch. Thanks!", 'success');
            form.reset();
            resetTurnstile();
            return;
          }
          say((data && data.error) || 'Something went wrong. Please try again, or email us directly.', 'error');
          resetTurnstile();
        })
        .catch(function () {
          say('Could not reach the server. Please check your connection, or email us directly.', 'error');
          resetTurnstile();
        })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Join the waitlist'; }
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
    initReveal();
  });

  window.observeReveal = observeReveal;
  window.renderFeaturedApps = renderFeaturedApps;
  window.renderWiredApps = renderWiredApps;
  window.initAppsPage = initAppsPage;
  window.initContactForm = initContactForm;
  window.initCheckoutForm = initCheckoutForm;
  window.initWaitlistForm = initWaitlistForm;
})();
