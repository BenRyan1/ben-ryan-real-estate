# Ben Ryan Real Estate Services
**benryanrealestate.com** · CA DRE # 01005833

California Licensed Real Estate Broker — BPO Specialist, REO Asset Management, Santa Barbara.

---

## Repository Structure

```
ben-ryan-real-estate/
├── index.html              ← Main site (homepage)
├── bpo-order.html          ← BPO Order intake page (bank-bookmarkable)
├── 404.html                ← Custom error page
├── _headers                ← Cloudflare security & cache headers
├── _redirects              ← URL routing & canonical redirects
├── robots.txt              ← SEO crawler control
├── sitemap.xml             ← Google/Bing sitemap
├── manifest.json           ← PWA mobile install config
├── assets/                 ← Icons, OG image (add manually)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── og-image.jpg
└── workers/                ← Cloudflare Worker code (deploy separately)
    ├── contact-worker.js
    └── bpo-order-worker.js
```

---

## Hosting Stack

| Layer | Service | Cost |
|---|---|---|
| Repository | GitHub (BenRyan1/ben-ryan-real-estate) | Free |
| Hosting | Cloudflare Pages | Free |
| CDN + Security | Cloudflare | Free |
| Workers (API) | Cloudflare Workers | Free tier |
| Email/CRM | MailerLite | Free tier |
| SSL | Auto via Cloudflare | Free |

**Total monthly cost: $0** (domain registration ~$10–12/yr only)

---

## Deploy Instructions

### 1. GitHub Setup
```bash
# Clone or create repo at github.com/BenRyan1/ben-ryan-real-estate
# Upload all files — keep index.html at root
```

### 2. Cloudflare Pages
1. Cloudflare Dashboard → **Pages** → Create Project
2. Connect GitHub → Select `ben-ryan-real-estate`
3. Build settings: Framework = **None**, Output = `/` (root)
4. Deploy
5. Custom Domain → `benryanrealestate.com`

### 3. Cloudflare Workers
Deploy each worker file separately:

**Worker 1 — Contact Form**
- Name: `ben-ryan-contact`
- Route: `benryanrealestate.com/api/contact`
- File: `workers/contact-worker.js`
- Variables: `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID`, `NOTIFY_EMAIL`

**Worker 2 — BPO Orders**
- Name: `ben-ryan-bpo-order`
- Route: `benryanrealestate.com/api/bpo-order`
- File: `workers/bpo-order-worker.js`
- Variables: `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID` (BPO group), `NOTIFY_EMAIL`

### 4. MailerLite Groups to Create
| Group Name | Used By |
|---|---|
| `RE General Leads` | contact-worker |
| `BPO Orders` | bpo-order-worker |

### 5. Environment Variables (both workers)
```
MAILERLITE_API_KEY   = [your MailerLite API key — same account as KCM]
MAILERLITE_GROUP_ID  = [group ID — different per worker]
NOTIFY_EMAIL         = ben@benryanrealestate.com
```

### 6. Final Steps
- [ ] Replace `G-XXXXXXXXXX` in both HTML files with your GA4 property ID
- [ ] Add `assets/icon-192.png`, `assets/icon-512.png`, `assets/og-image.jpg`
- [ ] Submit sitemap to Google Search Console: `https://benryanrealestate.com/sitemap.xml`
- [ ] Submit to Bing Webmaster Tools (same process as KCM BingSiteAuth.xml)
- [ ] Complete NABPOP certification → update badge in bpo-order.html sidebar
- [ ] Register with BPO companies (see list in bpo-order.html sidebar)

---

## Updates & Deployment
Every `git push` to `main` branch triggers automatic Cloudflare Pages rebuild. No FTP. No dashboard. Push = live.

---

*CA DRE # 01005833 · Ben Ryan Real Estate Services · Santa Barbara, CA*
