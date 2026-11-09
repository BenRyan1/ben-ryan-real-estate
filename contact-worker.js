/**
 * Ben Ryan Real Estate Services - Contact form handler
 * Route: benryanrealestate.com/api/contact   (deploy: wrangler deploy -c contact-wrangler.toml)
 *
 * What it does for each form submission:
 *   1. Adds the person to the MailerLite real estate group (MAILERLITE_API_KEY, MAILERLITE_GROUP_ID).
 *   2. Emails a notification to NOTIFY_EMAIL through Resend (RESEND_API_KEY secret).
 *      MailerLite has no endpoint for sending a notification email, so Resend does that job.
 * If BOTH steps fail the form reports an error, so a lead is never silently lost.
 *
 * Variables live in the Cloudflare dashboard (kept on deploy): MAILERLITE_API_KEY, MAILERLITE_GROUP_ID,
 * NOTIFY_EMAIL, RESEND_API_KEY (secret), optional RESEND_FROM.
 */

const FALLBACK_EMAIL = 'BenRyanRealEstate@gmail.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Read a dashboard variable even if its name was saved with a stray space or its value has stray whitespace.
function getVar(env, name) {
  for (const k of Object.keys(env)) {
    if (k.trim() === name && typeof env[k] === 'string') return env[k].trim();
  }
  return '';
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    let data;
    try { data = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { email, name, service, message, source, phone } = data;
    if (!email || !name) return json({ error: 'Email and name required' }, 400);

    const mlKey = getVar(env, 'MAILERLITE_API_KEY');
    const mlGroup = getVar(env, 'MAILERLITE_GROUP_ID');
    const notifyTo = getVar(env, 'NOTIFY_EMAIL') || FALLBACK_EMAIL;
    const resendKey = getVar(env, 'RESEND_API_KEY');
    const resendFrom = getVar(env, 'RESEND_FROM') || 'Ben Ryan RE Site <onboarding@resend.dev>';

    const nameParts = String(name).trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // 1. MailerLite subscriber
    let mlOk = false;
    try {
      const payload = {
        email,
        fields: { name: firstName, last_name: lastName, service_requested: service || 'General Inquiry', lead_source: source || 'website-contact' },
        status: 'active'
      };
      if (mlGroup) payload.groups = [mlGroup];
      const r = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${mlKey}` },
        body: JSON.stringify(payload)
      });
      mlOk = r.ok;
      console.log('MailerLite subscriber:', r.status, (await r.text()).slice(0, 300));
    } catch (err) { console.error('MailerLite error:', String(err)); }

    // 2. Notification email (Resend)
    let mailOk = false;
    try {
      const body = [
        'NEW REAL ESTATE INQUIRY - Ben Ryan Real Estate Services',
        '========================================================',
        '',
        `Name:     ${name}`,
        `Email:    ${email}`,
        `Phone:    ${phone || 'not given'}`,
        `Service:  ${service || 'Not specified'}`,
        `Source:   ${source || 'website'}`,
        '',
        'Message:',
        message || '(no message provided)',
        '',
        '========================================================',
        'Reply directly to this email to respond to the lead.'
      ].join('\n');
      if (resendKey) {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify({ from: resendFrom, to: [notifyTo], subject: `New Inquiry: ${service || 'General'} - ${name}`, text: body, reply_to: email })
        });
        mailOk = r.ok;
        console.log('Resend email:', r.status, (await r.text()).slice(0, 300));
      } else {
        console.error('RESEND_API_KEY is not set: no notification email can be sent.');
      }
    } catch (err) { console.error('Email notification error:', String(err)); }

    // Never tell a visitor "received" if nothing was saved or sent.
    console.log('Result: subscriber', mlOk, 'email', mailOk, 'source', source || 'website');
    if (!mlOk && !mailOk) return json({ error: 'Could not record your message' }, 502);
    return json({ success: true }, 200);
  }
};
