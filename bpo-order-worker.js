/**
 * Ben Ryan Real Estate Services
 * Cloudflare Worker — BPO Order Handler
 * Route: /api/bpo-order
 *
 * DEPLOY INSTRUCTIONS:
 * 1. Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. Paste this code, name it: bpo-order-worker
 * 3. Settings → Variables → Add:
 *      MAILERLITE_API_KEY   = your MailerLite API key
 *      MAILERLITE_GROUP_ID  = group ID for BPO leads (create a new group: "BPO Orders")
 *      NOTIFY_EMAIL         = ben@benryanrealestate.com
 * 4. Route: benryanrealestate.com/api/bpo-order
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    let d;
    try { d = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    if (!d.email || !d.firstName) return json({ error: 'Missing required fields' }, 400);

    // ── 1. Add to MailerLite "BPO Orders" group ──
    await addToMailerLite(d, env).catch(err => console.error('ML:', err));

    // ── 2. Send formatted notification email to Ben ──
    await sendNotification(d, env).catch(err => console.error('Email:', err));

    return json({ success: true, ref: d.ref });
  }
};

async function addToMailerLite(d, env) {
  const payload = {
    email: d.email,
    fields: {
      name: d.firstName,
      last_name: d.lastName,
      company: d.company,
      phone: d.phone || '',
      lead_type: 'BPO Order',
      bpo_purpose: d.purpose || '',
      property_city: d.city || '',
      lead_source: 'bpo-order-form'
    },
    groups: [env.MAILERLITE_GROUP_ID],
    status: 'active'
  };

  return fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`
    },
    body: JSON.stringify(payload)
  });
}

async function sendNotification(d, env) {
  const emailText = `
BPO ORDER RECEIVED — Ben Ryan Real Estate Services
====================================================
Order Reference: ${d.ref || 'N/A'}
Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT

PROPERTY INFORMATION
---------------------
Address:     ${d.address}
City / Zip:  ${d.city}, CA  ${d.zip}
Type:        ${d.propType}
Size:        ${d.sqft || 'Not provided'} sq ft
Bedrooms:    ${d.beds || '—'}   Bathrooms: ${d.baths || '—'}
Year Built:  ${d.yearBuilt || 'Unknown'}
Condition:   ${d.condition || 'Unknown'}
Occupied:    ${d.occupied || 'Unknown'}

BPO DETAILS
---------------------
BPO Type:    ${d.bpoType}
Purpose:     ${d.purpose}
Notes:       ${d.notes || '(none)'}

ORDERING PARTY
---------------------
Name:        ${d.firstName} ${d.lastName}
Company:     ${d.company}
Role:        ${d.role || 'Not specified'}
Email:       ${d.email}
Phone:       ${d.phone || 'Not provided'}
Loan Ref #:  ${d.loanNumber || 'Not provided'}

====================================================
ACTION: Reply to this email to confirm the BPO order.
Reply-To is set to the ordering party's email.
`.trim();

  return fetch('https://connect.mailerlite.com/api/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`
    },
    body: JSON.stringify({
      from: { email: 'orders@benryanrealestate.com', name: 'Ben Ryan RE — BPO Orders' },
      to: [{ email: env.NOTIFY_EMAIL, name: 'Ben Ryan' }],
      reply_to: { email: d.email, name: `${d.firstName} ${d.lastName}` },
      subject: `[BPO ORDER] ${d.address}, ${d.city} — ${d.bpoType} — Ref ${d.ref}`,
      text: emailText
    })
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}
