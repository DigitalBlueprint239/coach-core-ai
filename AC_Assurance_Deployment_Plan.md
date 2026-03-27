# AC Assurance SPA Deployment & Prerender Rollout Plan

**Prepared for:** AC Assurance Web Infrastructure Team
**Date:** March 27, 2026
**Author:** Manus AI, Senior Web Infrastructure Engineer

---

## 1. Executive Summary & Chosen Deployment Path

After a comprehensive audit of the AC Assurance repository and an evaluation of modern prerendering solutions for React SPAs, the recommended deployment path is **Netlify + Netlify Prerender Extension**.

### Why Netlify + Prerender Extension Wins

1. **Lowest Friction:** The application is already hosted on Netlify (`magical-starlight-0c1207.netlify.app`). Migrating to Cloudflare Pages + Workers + Prerender.io would introduce three new vendors, DNS migrations, and complex Worker proxy logic specific to Lovable apps.
2. **Native Architecture:** The Netlify Prerender Extension (GA as of Dec 16, 2025) uses native Edge Functions to intercept bot traffic and Serverless Functions with headless Chromium to render the DOM.
3. **Zero Third-Party Dependencies:** It eliminates the need for a paid Prerender.io subscription and API keys.
4. **AI Crawler Support:** Netlify's updated User-Agent categorization automatically detects AI agents (ChatGPT-User, ClaudeBot, PerplexityBot) alongside traditional SEO crawlers (Googlebot, Bingbot) and social preview bots.
5. **Observability:** Prerender logs and metrics are natively available in the Netlify dashboard.

*Note: The legacy `prerender = true` setting in `netlify.toml` was deprecated and ceased functioning for free plans on January 20, 2026. Moving to the new extension is a mandatory infrastructure upgrade.*

---

## 2. Route Coverage Inventory

The following 16 core routes have been identified from the SPA architecture and must be successfully prerendered by the Edge Function:

| Route Path | Page Type |
| :--- | :--- |
| `/` | Homepage |
| `/services` | Services Hub |
| `/ac-repair-cape-coral` | AC Repair |
| `/ac-installation-replacement` | AC Installation |
| `/heating-services` | Heating Services |
| `/ductless-mini-split` | Mini Split Systems |
| `/ac-maintenance-tune-up` | Maintenance Plans |
| `/duct-cleaning` | Duct Cleaning |
| `/indoor-air-quality` | Indoor Air Quality |
| `/commercial-refrigeration` | Commercial Refrigeration |
| `/emergency-ac-repair` | Emergency AC Repair |
| `/financing` | Financing |
| `/reviews` | Reviews |
| `/about` | About |
| `/contact` | Contact |
| `/blog` | Blog |

---

## 3. Step-by-Step Rollout Checklist

This checklist covers the exact steps required to transition the AC Assurance SPA to a fully prerendered production state.

### Phase 1: Repository Configuration Updates
- [ ] **Fix Build Output Mismatch:** The current `netlify.toml` specifies `publish = "dist"`, but Create React App (`react-scripts`) outputs to `build/`. Update `netlify.toml` to `publish = "build"`.
- [ ] **Enforce Node.js 20+:** The Netlify Prerender Extension requires Node.js 20 or higher to run the Chromium binary. Add `NODE_VERSION = "20"` to the `[build.environment]` section in `netlify.toml`.
- [ ] **Remove Legacy Prerender:** Delete `prerender = true` from the `[post_processing]` block in `netlify.toml`.
- [ ] **Add SPA Routing Fallback:** Ensure `/* /index.html 200` is present in `netlify.toml` `[[redirects]]` and/or a `_redirects` file in the `public/` directory.
- [ ] **Add `robots.txt`:** Commit a `robots.txt` file to `public/` that explicitly allows AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`) and links to the sitemap.
- [ ] **Add `sitemap.xml`:** Commit a static `sitemap.xml` to `public/` containing all 16 routes listed above.

### Phase 2: Netlify Dashboard Configuration
- [ ] **Deploy Code Changes:** Push the updated `netlify.toml`, `robots.txt`, and `sitemap.xml` to the production branch and wait for the Netlify build to succeed.
- [ ] **Install Extension:** Navigate to `https://app.netlify.com/extensions/prerender` as a Team Owner and click **Install**.
- [ ] **Enable for Project:** Go to the AC Assurance project dashboard, locate **Extensions** in the left sidebar, select the Prerender extension, and check **Enable prerendering**.
- [ ] **Trigger Activation Deploy:** Trigger a manual empty deploy (Clear cache and deploy site) to inject the Prerender Edge Function into the CDN edge.

---

## 4. Risk Analysis & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Build Failure (Node Version)** | High | The Chromium binary requires Node 20+. Explicitly setting `NODE_VERSION = "20"` in `netlify.toml` prevents deployment failures. |
| **Stale Cache for Bots** | Medium | Netlify's extension integrates with their fine-grained caching. Deployments automatically purge the prerendered HTML cache. No manual invalidation is required. |
| **Redirect Loops** | High | Using Netlify's native extension avoids the infinite loop risks associated with Cloudflare Workers proxying back to the origin. SPA fallback routing (`/* /index.html 200`) handles human traffic safely. |
| **Cloaking Penalties** | Low | The headless Chromium instance executes the exact same JavaScript bundle as human users. The resulting DOM is identical, ensuring zero risk of SEO cloaking penalties. |
| **Broken Fallback Routing** | High | If `index.html` is cached aggressively, SPA updates fail. Mitigation: Add a `Cache-Control: public, max-age=0, must-revalidate` header specifically for `/index.html` in `netlify.toml`. |

---

## 5. Validation Checklist

Once the rollout is complete, execute the following tests to confirm bots are receiving fully rendered HTML.

- [ ] **cURL Googlebot Test:** 
  Run: `curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://acassurance.lovable.app/ | grep -i "AC Repair"`
  *Success Criteria:* The command returns actual page text, not just `<div id="root"></div>`.
- [ ] **cURL AI Bot Test:**
  Run: `curl -s -A "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot" https://acassurance.lovable.app/`
  *Success Criteria:* The response contains fully rendered HTML.
- [ ] **Google Search Console (GSC):**
  Use the "URL Inspection" tool and click "Test Live URL", then "View Tested Page" -> "HTML".
  *Success Criteria:* The HTML tab shows the fully populated DOM, including meta tags and content.
- [ ] **Rich Results Test:**
  Run the homepage through the [Google Rich Results Test](https://search.google.com/test/rich-results).
  *Success Criteria:* The tool successfully renders the page and detects any implemented Schema markup.
- [ ] **Sitemap & Robots Fetch:**
  Verify `https://acassurance.lovable.app/robots.txt` and `https://acassurance.lovable.app/sitemap.xml` return 200 OK and correct content.

---

## 6. Fallback Plan

If critical issues arise post-deployment (e.g., Chromium launch timeouts, 500 errors for bots):

1. **Immediate Revert:** Navigate to the Netlify Project Dashboard -> Extensions -> Prerender Extension -> **Disable prerendering**.
2. **Redeploy:** Trigger a new deployment to remove the Edge Function from the CDN.
3. **Impact:** The site instantly reverts to standard SPA behavior. Human users will experience zero downtime. Bots will temporarily receive the empty `<div id="root">` shell until the issue is debugged via Netlify Observability logs.
