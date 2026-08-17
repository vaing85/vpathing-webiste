/**
 * VPathing Enterprise LLC — contact endpoint.
 *
 * The site is otherwise static; this Worker exists only for POST /api/contact.
 *
 * Why it exists: Turnstile's widget proves nothing on its own. The token it
 * mints has to be posted to siteverify from somewhere holding the secret key,
 * and a static page has nowhere to keep one. Before this, contact.html rendered
 * the widget and the token was simply discarded — the form advertised spam
 * protection it did not have.
 *
 * Routing: [assets] not_found_handling = "404-page" answers any unmatched path
 * with 404.html *without* invoking this Worker, so /api/contact would never
 * arrive here on its own. assets.run_worker_first = ["/api/*"] is what routes
 * it in; every other path still hits the asset worker first and is unaffected.
 *
 * Config (see README):
 *   TURNSTILE_SECRET_KEY  secret · Turnstile widget's secret key
 *   FORMSUBMIT_CODE       secret · FormSubmit hash from their dashboard.
 *                                  The destination email also works, but the
 *                                  hash is what keeps bots from posting to
 *                                  FormSubmit directly and skipping this Worker.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const FORMSUBMIT_URL = 'https://formsubmit.co/ajax/';

/* A name, email, subject and message have no business exceeding this. The cap
   is what lets us read the body as text without risking the 128 MB limit. */
const MAX_BODY_BYTES = 16 * 1024;

const FIELD_LIMITS = { name: 200, email: 320, subject: 300, message: 5000 };

const GENERIC_FAILURE =
  'Something went wrong sending your message. Please try again, or email us directly.';

const GENERIC_CHECKOUT_FAILURE =
  'Something went wrong starting checkout. Please try again in a moment.';

// The Call Assistant backend that mints Stripe Checkout Sessions. Overridable
// via the CALL_ASSISTANT_API binding; defaults to the production host.
const DEFAULT_API_BASE = 'https://call-assistant.217.77.0.211.sslip.io';
const CHECKOUT_PLANS = ['basic', 'pro', 'secretary'];
const CHECKOUT_TERMS = ['monthly', 'six_month', 'yearly'];

// civic-platform deploys separately (Coolify Docker containers, not this
// Worker) at its own subdomain. This just redirects the branded path there —
// see wrangler.toml's run_worker_first for why the Worker sees this path at
// all.
const CIVIC_PLATFORM_ORIGIN = 'https://civicplatform.vpathingenterprisellc.site';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/civicplatform' || url.pathname.startsWith('/civicplatform/')) {
      const rest = url.pathname.slice('/civicplatform'.length);
      return Response.redirect(CIVIC_PLATFORM_ORIGIN + rest + url.search, 301);
    }

    if (url.pathname === '/api/contact') {
      try {
        return await handleForm(request, env, env.FORMSUBMIT_CODE, 'contact');
      } catch (err) {
        // Never let an exception surface as a Workers 1101 page: this endpoint
        // is only ever read as JSON by the client.
        console.error('contact: unhandled', err && err.stack ? err.stack : String(err));
        return json({ ok: false, error: GENERIC_FAILURE }, 500);
      }
    }

    if (url.pathname === '/api/checkout') {
      try {
        return await handleCheckout(request, env);
      } catch (err) {
        console.error('checkout: unhandled', err && err.stack ? err.stack : String(err));
        return json({ ok: false, error: GENERIC_CHECKOUT_FAILURE }, 500);
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ ok: false, error: 'Not found.' }, 404);
    }

    // run_worker_first only routes /api/*, so this is a safety net rather than
    // a normal path — hand anything else back to the asset worker.
    return env.ASSETS.fetch(request);
  },
};

/**
 * Contact form handler. Verifies Turnstile, then forwards to FormSubmit at
 * `target` (the FormSubmit hash). `label` is only used for log lines. (The
 * waitlist form posts directly to FormSubmit.cloud, so it doesn't use this.)
 */
async function handleForm(request, env, target, label) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  }

  // Fail loudly in the log but blandly to the caller: which binding is missing
  // is operator information, not visitor information.
  if (!env.TURNSTILE_SECRET_KEY || !target) {
    console.error(label + ': missing binding', {
      turnstileSecret: Boolean(env.TURNSTILE_SECRET_KEY),
      target: Boolean(target),
    });
    return json({ ok: false, error: GENERIC_FAILURE }, 500);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return json({ ok: false, error: err.message }, 400);
  }

  const fields = {
    name: str(body.name),
    email: str(body.email),
    subject: str(body.subject),
    message: str(body.message),
  };

  const invalid = validate(fields);
  if (invalid) return json({ ok: false, error: invalid }, 400);

  const token = str(body.turnstileToken);
  if (!token) {
    return json({ ok: false, error: 'Please complete the spam check and try again.' }, 400);
  }

  const verdict = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'));
  if (!verdict.success) return turnstileRejection(verdict, label);

  return await forwardToFormSubmit(fields, target);
}

/**
 * Web checkout handler. Verifies Turnstile, then calls the Call Assistant
 * backend's POST /billing/web-checkout (authenticated with the shared
 * WEB_CHECKOUT_TOKEN) to mint a Stripe Checkout Session, and returns its URL
 * for the browser to redirect to. The token never reaches the browser.
 */
async function handleCheckout(request, env) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  }
  if (!env.TURNSTILE_SECRET_KEY || !env.WEB_CHECKOUT_TOKEN) {
    console.error('checkout: missing binding', {
      turnstileSecret: Boolean(env.TURNSTILE_SECRET_KEY),
      webCheckoutToken: Boolean(env.WEB_CHECKOUT_TOKEN),
    });
    return json({ ok: false, error: GENERIC_CHECKOUT_FAILURE }, 500);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return json({ ok: false, error: err.message }, 400);
  }

  const email = str(body.email);
  const plan = str(body.plan);
  const term = str(body.term);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Please enter a valid email address.' }, 400);
  }
  if (CHECKOUT_PLANS.indexOf(plan) === -1 || CHECKOUT_TERMS.indexOf(term) === -1) {
    return json({ ok: false, error: 'Please choose a plan and billing term.' }, 400);
  }

  // Comp/beta checkout (set by the ?comp=1 beta link on the page). Tells the
  // backend to show the manual promo-code field and skip the auto-applied
  // launch coupon, so a comp code can be redeemed on ANY term — including
  // monthly, where the launch coupon would otherwise hide the promo field.
  const comp = body.comp === true;

  const token = str(body.turnstileToken);
  if (!token) {
    return json({ ok: false, error: 'Please complete the spam check and try again.' }, 400);
  }
  const verdict = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'));
  if (!verdict.success) return turnstileRejection(verdict, 'checkout');

  const apiBase = (env.CALL_ASSISTANT_API || DEFAULT_API_BASE).replace(/\/$/, '');
  let res;
  try {
    res = await fetch(apiBase + '/billing/web-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-web-checkout-token': env.WEB_CHECKOUT_TOKEN,
      },
      body: JSON.stringify(comp ? { email: email, plan: plan, term: term, comp: true } : { email: email, plan: plan, term: term }),
    });
  } catch (err) {
    console.error('checkout: backend unreachable', String(err));
    return json({ ok: false, error: GENERIC_CHECKOUT_FAILURE }, 502);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    console.error('checkout: backend non-JSON response, http ' + res.status);
    return json({ ok: false, error: GENERIC_CHECKOUT_FAILURE }, 502);
  }
  if (!res.ok || !data || !data.url) {
    console.error('checkout: backend rejected http ' + res.status, data ? JSON.stringify(data) : '');
    return json({ ok: false, error: GENERIC_CHECKOUT_FAILURE }, 502);
  }
  return json({ ok: true, url: data.url });
}

/** Shared Turnstile-failure response for the form + checkout handlers. */
function turnstileRejection(verdict, label) {
  const codes = verdict['error-codes'] || [];
  console.warn(label + ': turnstile rejected', codes.join(',') || 'unknown');
  // A stale token is the one failure a visitor can actually act on — the widget
  // expires them after 300s, which a slowly-filled form will hit.
  const expired = codes.indexOf('timeout-or-duplicate') !== -1;
  return json(
    {
      ok: false,
      error: expired
        ? 'Your spam check expired. Please complete it again and resend.'
        : 'We could not verify you are human. Please complete the spam check and try again.',
    },
    403
  );
}

/**
 * Bounded read. Requiring content-length is safe here because the only client
 * is our own fetch(), and it means an oversized body is refused before it is
 * ever buffered.
 */
async function readJsonBody(request) {
  const declared = request.headers.get('content-length');
  if (declared === null) throw new Error('Malformed request.');
  if (Number(declared) > MAX_BODY_BYTES) throw new Error('Your message is too long to send.');

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new Error('Your message is too long to send.');

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error();
    return parsed;
  } catch (_) {
    throw new Error('Malformed request.');
  }
}

function validate(fields) {
  if (!fields.name) return 'Please enter your name.';
  if (!fields.email) return 'Please enter your email address.';
  if (!fields.message) return 'Please enter a message.';
  // Deliberately loose: the browser already ran type="email", and this only
  // needs to catch obvious junk without rejecting valid addresses.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return 'Please enter a valid email address.';
  }
  for (const key of Object.keys(FIELD_LIMITS)) {
    if (fields[key].length > FIELD_LIMITS[key]) {
      return 'Your ' + key + ' is too long.';
    }
  }
  return null;
}

async function verifyTurnstile(token, secret, remoteip) {
  const payload = { secret: secret, response: token };
  if (remoteip) payload.remoteip = remoteip;

  let res;
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('contact: siteverify unreachable', String(err));
    return { success: false, 'error-codes': ['siteverify-unreachable'] };
  }

  if (!res.ok) {
    console.error('contact: siteverify http ' + res.status);
    return { success: false, 'error-codes': ['siteverify-http-' + res.status] };
  }
  return await res.json();
}

async function forwardToFormSubmit(fields, code) {
  let res;
  try {
    res = await fetch(FORMSUBMIT_URL + encodeURIComponent(code), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: fields.name,
        email: fields.email,
        subject: fields.subject || '(no subject)',
        message: fields.message,
        // Use the submitted subject as the email Subject so helpdesk tickets get
        // a meaningful title (e.g. "Call Assistant — Waitlist signup").
        _subject: fields.subject || 'New message from VPathing Enterprise LLC website',
        _template: 'box',
        // FormSubmit's own captcha renders an HTML challenge page, which cannot
        // work over AJAX. Turnstile above is the real check.
        _captcha: 'false',
      }),
    });
  } catch (err) {
    console.error('contact: formsubmit unreachable', String(err));
    return json({ ok: false, error: GENERIC_FAILURE }, 502);
  }

  // FormSubmit answers 200 with a JSON body whose success field is the string
  // "true" (not a boolean), so status alone says nothing about delivery. That
  // conflation is what made the old client report every response as sent.
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    console.error('contact: formsubmit non-JSON response, http ' + res.status);
    return json({ ok: false, error: GENERIC_FAILURE }, 502);
  }

  const delivered = data && (data.success === true || data.success === 'true');
  if (!delivered) {
    console.error('contact: formsubmit rejected', JSON.stringify(data));
    return json({ ok: false, error: GENERIC_FAILURE }, 502);
  }

  return json({ ok: true });
}

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function json(payload, status, extraHeaders) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  if (extraHeaders) {
    for (const key of Object.keys(extraHeaders)) headers[key] = extraHeaders[key];
  }
  return new Response(JSON.stringify(payload), { status: status || 200, headers });
}
