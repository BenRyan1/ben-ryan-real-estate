/**
 * Ben Ryan Real Estate Services
 * Cloudflare Worker — Contact Form Handler
 * Route: /api/contact
 *
 * DEPLOY INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. Paste this code
 * 3. Add Environment Variables (Settings → Variables):
 *      MAILERLITE_API_KEY  = your MailerLite API key
 *      MAILERLITE_GROUP_ID = your MailerLite group/segment ID for RE leads
 *      NOTIFY_EMAIL        = ben@benryanrealestate.com (your notification address)
 * 4. Add route: benryanrealestate.com/api/contact
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const { email, name, service, message, source } = data;

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Email and name required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // ── 1. Add subscriber to MailerLite ──
    try {
      const mlPayload = {
        email,
        fields: {
          name: firstName,
          last_name: lastName,
          service_requested: service || 'General Inquiry',
          lead_source: source || 'website-contact'
        },
        groups: [env.MAILERLITE_GROUP_ID],
        status: 'active'
      };

      await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`
        },
        body: JSON.stringify(mlPayload)
      });
    } catch (err) {
      console.error('MailerLite error:', err);
      // Non-fatal — continue to email notification
    }

    // ── 2. Send email notification via MailerLite Transactional ──
    // (Or replace with your preferred transactional email service)
    try {
      const emailBody = `
NEW REAL ESTATE INQUIRY — Ben Ryan Real Estate Services
========================================================

Name:     ${name}
Email:    ${email}
Service:  ${service || 'Not specified'}
Source:   ${source || 'website'}

Message:
${message || '(no message provided)'}

========================================================
Reply directly to this email to respond to the lead.
      `.trim();

      await fetch('https://connect.mailerlite.com/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`
        },
        body: JSON.stringify({
          from: { email: 'notifications@benryanrealestate.com', name: 'Ben Ryan RE Site' },
          to: [{ email: env.NOTIFY_EMAIL }],
          subject: `New Inquiry: ${service || 'General'} — ${name}`,
          text: emailBody,
          reply_to: { email }
        })
      });
    } catch (err) {
      console.error('Email notification error:', err);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
};
