# PageSpeed Weekly Audit

Automated weekly performance monitoring for Spotlight Oral Care sites using Google PageSpeed Insights.

## Pages Monitored

### EU Store (eu.spotlightoralcare.com)
- Homepage
- All Products collection
- Kids collection
- Enamel Protect Pro Serum (PDP)
- Sonic Pro (landing page)

### UK Store (uk.spotlightoralcare.com)
- Homepage
- All Products collection
- Kids collection
- Enamel Protect Pro Serum (PDP)
- Sonic Pro (landing page)

## How It Works

Every Monday at 8:00 AM UTC, a GitHub Actions workflow:

1. Runs each site through Google's PageSpeed Insights API
2. Collects Performance, Accessibility, Best Practices, and SEO scores
3. Captures Core Web Vitals (FCP, LCP, TBT, CLS, Speed Index, TTI)
4. Identifies top optimisation opportunities
5. Generates a Markdown report and commits it to `reports/`

## Setup

1. **Create a new GitHub repo** and push this project to it:

   ```bash
   git init
   git add .
   git commit -m "Initial setup"
   git remote add origin https://github.com/YOUR_USER/pagespeed-reports.git
   git push -u origin main
   ```

2. **(Optional) Add a PageSpeed API key** for higher rate limits:
   - Get a free key at https://developers.google.com/speed/docs/insights/v5/get-started
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add a secret called `PAGESPEED_API_KEY` with your key

3. **Enable Actions** — go to the Actions tab in your repo and enable workflows.

4. **Test it** — click "Run workflow" on the Actions tab to trigger a manual run.

That's it. Reports will auto-generate every Monday.

## Reading Reports

Reports are saved in the `reports/` directory:

- `reports/latest.md` — always the most recent report
- `reports/report-YYYY-MM-DD.md` — dated archives
- `reports/data-YYYY-MM-DD.json` — raw data for further analysis

## Configuration

Edit `audit.js` to:

- **Add/remove sites** — update the `SITES` array at the top
- **Change strategy** — set `STRATEGY` to `"desktop"` or `"mobile"`
- **Adjust timing** — edit the cron in `.github/workflows/pagespeed.yml`

## Running Locally

```bash
node audit.js
```

Optionally set environment variables:

```bash
PAGESPEED_API_KEY=your_key STRATEGY=desktop node audit.js
```
