/**
 * PageSpeed Weekly Audit Script
 * Runs against Google PageSpeed Insights API and generates a Markdown report.
 *
 * Usage:
 *   node audit.js
 *
 * Environment variables:
 *   PAGESPEED_API_KEY  – optional, increases rate limits
 *   STRATEGY           – "mobile" (default) or "desktop"
 */

const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────────────────

const SITES = [
  // ── EU Store ──
  { name: "EU – Homepage",         url: "https://eu.spotlightoralcare.com/" },
  { name: "EU – All Products",     url: "https://eu.spotlightoralcare.com/collections/all-products" },
  { name: "EU – Kids",             url: "https://eu.spotlightoralcare.com/collections/kids" },
  { name: "EU – Enamel Pro Serum", url: "https://eu.spotlightoralcare.com/products/enamel-protect-pro-serum" },
  { name: "EU – Sonic Pro",        url: "https://eu.spotlightoralcare.com/pages/sonic-pro" },

  // ── UK Store ──
  { name: "UK – Homepage",         url: "https://uk.spotlightoralcare.com/" },
  { name: "UK – All Products",     url: "https://uk.spotlightoralcare.com/collections/all-products" },
  { name: "UK – Kids",             url: "https://uk.spotlightoralcare.com/collections/kids" },
  { name: "UK – Enamel Pro Serum", url: "https://uk.spotlightoralcare.com/products/enamel-protect-pro-serum" },
  { name: "UK – Sonic Pro",        url: "https://uk.spotlightoralcare.com/pages/sonic-pro" },
];

const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const API_KEY = process.env.PAGESPEED_API_KEY || "";
const STRATEGY = process.env.STRATEGY || "mobile";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatMs(ms) {
  if (ms == null) return "—";
  return ms >= 1000 ? (ms / 1000).toFixed(1) + "s" : Math.round(ms) + "ms";
}

function scoreEmoji(score) {
  if (score >= 90) return "🟢";
  if (score >= 50) return "🟠";
  return "🔴";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Fetch a single site ─────────────────────────────────────────────────────

async function auditSite(site) {
  const cats = CATEGORIES.map((c) => `&category=${c}`).join("");
  const keyParam = API_KEY ? `&key=${API_KEY}` : "";
  const url = `${API_BASE}?url=${encodeURIComponent(site.url)}&strategy=${STRATEGY}${cats}${keyParam}`;

  console.log(`  ⏳ Testing ${site.name} (${site.url})...`);
  const start = Date.now();

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  ✅ ${site.name} done in ${elapsed}s`);
  return data;
}

// ── Extract metrics from API response ───────────────────────────────────────

function extractMetrics(data) {
  const cats = data.lighthouseResult?.categories || {};
  const audits = data.lighthouseResult?.audits || {};

  const scores = {
    performance: Math.round((cats.performance?.score || 0) * 100),
    accessibility: Math.round((cats.accessibility?.score || 0) * 100),
    bestPractices: Math.round((cats["best-practices"]?.score || 0) * 100),
    seo: Math.round((cats.seo?.score || 0) * 100),
  };

  const vitals = {
    fcp: audits["first-contentful-paint"]?.numericValue,
    lcp: audits["largest-contentful-paint"]?.numericValue,
    tbt: audits["total-blocking-time"]?.numericValue,
    cls: audits["cumulative-layout-shift"]?.numericValue,
    si: audits["speed-index"]?.numericValue,
    tti: audits["interactive"]?.numericValue,
  };

  const opportunities = Object.values(audits)
    .filter((a) => a.details?.type === "opportunity" && a.details?.overallSavingsMs > 0)
    .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
    .slice(0, 5)
    .map((a) => ({
      title: a.title,
      savings: a.details.overallSavingsMs,
    }));

  return { scores, vitals, opportunities, fetchTime: data.lighthouseResult?.fetchTime };
}

// ── Build Markdown report ───────────────────────────────────────────────────

function buildReport(allResults) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let md = "";

  md += `# 🚀 Weekly PageSpeed Report\n\n`;
  md += `**Date:** ${dateStr}  \n`;
  md += `**Strategy:** ${STRATEGY}  \n`;
  md += `**Sites tested:** ${SITES.length}\n\n`;
  md += `---\n\n`;

  // ── Group results by store ──
  const groups = [
    { label: "EU Store", prefix: "EU – ", results: allResults.filter(r => r.site.name.startsWith("EU")) },
    { label: "UK Store", prefix: "UK – ", results: allResults.filter(r => r.site.name.startsWith("UK")) },
  ];

  // ── Full overview table ──
  md += `## Overview – All Pages\n\n`;
  md += `| Page | Perf | A11y | Best Practices | SEO |\n`;
  md += `|------|:----:|:----:|:--------------:|:---:|\n`;

  for (const group of groups) {
    md += `| **${group.label}** | | | | |\n`;
    for (const { site, metrics } of group.results) {
      const s = metrics.scores;
      const shortName = site.name.replace(group.prefix, "");
      md += `| \u00A0\u00A0${shortName} `;
      md += `| ${scoreEmoji(s.performance)} ${s.performance} `;
      md += `| ${scoreEmoji(s.accessibility)} ${s.accessibility} `;
      md += `| ${scoreEmoji(s.bestPractices)} ${s.bestPractices} `;
      md += `| ${scoreEmoji(s.seo)} ${s.seo} |\n`;
    }
  }

  md += `\n`;

  // ── Core Web Vitals per store ──
  for (const group of groups) {
    md += `## ${group.label} – Core Web Vitals\n\n`;
    md += `| Page | FCP | LCP | TBT | CLS | Speed Index | TTI |\n`;
    md += `|------|-----|-----|-----|-----|-------------|-----|\n`;

    for (const { site, metrics } of group.results) {
      const v = metrics.vitals;
      const shortName = site.name.replace(group.prefix, "");
      md += `| ${shortName} `;
      md += `| ${formatMs(v.fcp)} `;
      md += `| ${formatMs(v.lcp)} `;
      md += `| ${formatMs(v.tbt)} `;
      md += `| ${v.cls != null ? v.cls.toFixed(3) : "—"} `;
      md += `| ${formatMs(v.si)} `;
      md += `| ${formatMs(v.tti)} |\n`;
    }

    md += `\n`;
  }

  // ── Per-page detail ──
  for (const group of groups) {
    md += `---\n\n`;
    md += `# ${group.label}\n\n`;

    for (const { site, metrics } of group.results) {
      const shortName = site.name.replace(group.prefix, "");
      md += `## ${shortName}\n\n`;
      md += `**URL:** ${site.url}  \n`;
      md += `**Tested:** ${metrics.fetchTime ? new Date(metrics.fetchTime).toLocaleString() : "—"}\n\n`;

      md += `| Category | Score |\n`;
      md += `|----------|:-----:|\n`;
      md += `| Performance | ${scoreEmoji(metrics.scores.performance)} ${metrics.scores.performance} |\n`;
      md += `| Accessibility | ${scoreEmoji(metrics.scores.accessibility)} ${metrics.scores.accessibility} |\n`;
      md += `| Best Practices | ${scoreEmoji(metrics.scores.bestPractices)} ${metrics.scores.bestPractices} |\n`;
      md += `| SEO | ${scoreEmoji(metrics.scores.seo)} ${metrics.scores.seo} |\n\n`;

      if (metrics.opportunities.length > 0) {
        md += `### Top Opportunities\n\n`;
        md += `| Opportunity | Est. Savings |\n`;
        md += `|-------------|-------------:|\n`;
        for (const opp of metrics.opportunities) {
          md += `| ${opp.title} | ${formatMs(opp.savings)} |\n`;
        }
        md += `\n`;
      }
    }
  }

  md += `---\n\n`;
  md += `*Generated automatically via GitHub Actions using Google PageSpeed Insights API.*\n`;

  return md;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 PageSpeed Weekly Audit`);
  console.log(`   Strategy: ${STRATEGY}`);
  console.log(`   Sites: ${SITES.length}\n`);

  const allResults = [];

  for (let i = 0; i < SITES.length; i++) {
    const site = SITES[i];
    try {
      const data = await auditSite(site);
      const metrics = extractMetrics(data);
      allResults.push({ site, metrics });
    } catch (err) {
      console.error(`  ❌ ${site.name} failed: ${err.message}`);
      allResults.push({
        site,
        metrics: {
          scores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
          vitals: {},
          opportunities: [],
          fetchTime: null,
        },
      });
    }

    // Pause between requests to avoid rate limits
    if (i < SITES.length - 1) {
      console.log(`  ⏸  Waiting 5s before next test...\n`);
      await sleep(5000);
    }
  }

  // Build report
  const report = buildReport(allResults);

  // Write report
  const reportsDir = path.join(__dirname, "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `report-${dateSlug}.md`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, report);
  console.log(`\n📄 Report saved: ${filepath}`);

  // Also write as latest.md for easy access
  fs.writeFileSync(path.join(reportsDir, "latest.md"), report);
  console.log(`📄 Also saved as: reports/latest.md`);

  // Write JSON data for programmatic use
  const jsonPath = path.join(reportsDir, `data-${dateSlug}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2));
  console.log(`📊 Raw data saved: ${jsonPath}\n`);

  // Set GitHub Actions output
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `report_path=${filepath}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `report_filename=${filename}\n`);
  }

  // Print summary to console (also shows in Actions log)
  console.log(`\n${"═".repeat(50)}`);
  console.log(`  SUMMARY`);
  console.log(`${"═".repeat(50)}`);
  for (const { site, metrics } of allResults) {
    const p = metrics.scores.performance;
    console.log(`  ${scoreEmoji(p)} ${site.name.padEnd(20)} Performance: ${p}`);
  }
  console.log(`${"═".repeat(50)}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
