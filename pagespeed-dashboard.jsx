import { useState, useEffect, useCallback, useRef } from "react";

const SITES = [
  // EU Store
  { name: "EU – Homepage", url: "https://eu.spotlightoralcare.com/" },
  { name: "EU – All Products", url: "https://eu.spotlightoralcare.com/collections/all-products" },
  { name: "EU – Kids", url: "https://eu.spotlightoralcare.com/collections/kids" },
  { name: "EU – Enamel Pro Serum", url: "https://eu.spotlightoralcare.com/products/enamel-protect-pro-serum" },
  { name: "EU – Sonic Pro", url: "https://eu.spotlightoralcare.com/pages/sonic-pro" },
  // UK Store
  { name: "UK – Homepage", url: "https://uk.spotlightoralcare.com/" },
  { name: "UK – All Products", url: "https://uk.spotlightoralcare.com/collections/all-products" },
  { name: "UK – Kids", url: "https://uk.spotlightoralcare.com/collections/kids" },
  { name: "UK – Enamel Pro Serum", url: "https://uk.spotlightoralcare.com/products/enamel-protect-pro-serum" },
  { name: "UK – Sonic Pro", url: "https://uk.spotlightoralcare.com/pages/sonic-pro" },
];

const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

const API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function scoreColor(score) {
  if (score === null || score === undefined) return "#555";
  if (score >= 90) return "#0cce6b";
  if (score >= 50) return "#ffa400";
  return "#ff4e42";
}

function scoreLabel(score) {
  if (score >= 90) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function formatMs(ms) {
  if (ms === null || ms === undefined) return "—";
  if (ms >= 1000) return (ms / 1000).toFixed(1) + "s";
  return Math.round(ms) + "ms";
}

function ScoreRing({ score, size = 64, stroke = 5 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={size * 0.28}
        fontWeight="700"
        style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
      >
        {score}
      </text>
    </svg>
  );
}

function MetricCard({ label, value, description }) {
  return (
    <div style={{
      padding: "14px 16px",
      background: "rgba(255,255,255,0.03)",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e8e8", fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}>
        {value}
      </div>
      {description && (
        <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>{description}</div>
      )}
    </div>
  );
}

function SiteReport({ data, siteName }) {
  if (!data) return null;

  const cats = data.lighthouseResult?.categories || {};
  const audits = data.lighthouseResult?.audits || {};

  const scores = {
    performance: Math.round((cats.performance?.score || 0) * 100),
    accessibility: Math.round((cats.accessibility?.score || 0) * 100),
    "best-practices": Math.round((cats["best-practices"]?.score || 0) * 100),
    seo: Math.round((cats.seo?.score || 0) * 100),
  };

  const metrics = {
    fcp: audits["first-contentful-paint"]?.numericValue,
    lcp: audits["largest-contentful-paint"]?.numericValue,
    tbt: audits["total-blocking-time"]?.numericValue,
    cls: audits["cumulative-layout-shift"]?.numericValue,
    si: audits["speed-index"]?.numericValue,
    tti: audits["interactive"]?.numericValue,
  };

  const opportunities = Object.values(audits)
    .filter(a => a.details?.type === "opportunity" && a.details?.overallSavingsMs > 0)
    .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
    .slice(0, 5);

  const catLabels = {
    performance: "Performance",
    accessibility: "Accessibility",
    "best-practices": "Best Practices",
    seo: "SEO",
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "16px",
      padding: "28px",
      marginBottom: "20px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#f0f0f0" }}>{siteName}</h2>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px", fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}>
            {data.id}
          </div>
        </div>
        <div style={{
          fontSize: "11px",
          color: "#555",
          background: "rgba(255,255,255,0.04)",
          padding: "4px 10px",
          borderRadius: "6px",
        }}>
          {data.lighthouseResult?.fetchTime
            ? new Date(data.lighthouseResult.fetchTime).toLocaleString()
            : "—"}
        </div>
      </div>

      {/* Category Scores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {Object.entries(scores).map(([key, score]) => (
          <div key={key} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "16px",
            background: "rgba(255,255,255,0.02)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <ScoreRing score={score} size={56} stroke={4} />
            <div style={{ fontSize: "12px", color: "#aaa", marginTop: "8px", textAlign: "center" }}>
              {catLabels[key]}
            </div>
            <div style={{
              fontSize: "10px",
              color: scoreColor(score),
              marginTop: "2px",
              fontWeight: "600",
            }}>
              {scoreLabel(score)}
            </div>
          </div>
        ))}
      </div>

      {/* Core Web Vitals */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: "600", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Core Web Vitals
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          <MetricCard label="FCP" value={formatMs(metrics.fcp)} description="First Contentful Paint" />
          <MetricCard label="LCP" value={formatMs(metrics.lcp)} description="Largest Contentful Paint" />
          <MetricCard label="TBT" value={formatMs(metrics.tbt)} description="Total Blocking Time" />
          <MetricCard label="CLS" value={metrics.cls?.toFixed(3) || "—"} description="Cumulative Layout Shift" />
          <MetricCard label="SI" value={formatMs(metrics.si)} description="Speed Index" />
          <MetricCard label="TTI" value={formatMs(metrics.tti)} description="Time to Interactive" />
        </div>
      </div>

      {/* Top Opportunities */}
      {opportunities.length > 0 && (
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: "600", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Top Opportunities
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {opportunities.map((opp, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <span style={{ fontSize: "13px", color: "#ccc" }}>{opp.title}</span>
                <span style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#ffa400",
                  fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                  whiteSpace: "nowrap",
                  marginLeft: "12px",
                }}>
                  −{formatMs(opp.details?.overallSavingsMs)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonTable({ results }) {
  const rows = [];
  const metricKeys = [
    { key: "performance", label: "Performance", extract: (d) => Math.round((d.lighthouseResult?.categories?.performance?.score || 0) * 100), format: (v) => v },
    { key: "fcp", label: "FCP", extract: (d) => d.lighthouseResult?.audits?.["first-contentful-paint"]?.numericValue, format: formatMs },
    { key: "lcp", label: "LCP", extract: (d) => d.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue, format: formatMs },
    { key: "tbt", label: "TBT", extract: (d) => d.lighthouseResult?.audits?.["total-blocking-time"]?.numericValue, format: formatMs },
    { key: "cls", label: "CLS", extract: (d) => d.lighthouseResult?.audits?.["cumulative-layout-shift"]?.numericValue, format: (v) => v?.toFixed(3) || "—" },
    { key: "si", label: "Speed Index", extract: (d) => d.lighthouseResult?.audits?.["speed-index"]?.numericValue, format: formatMs },
  ];

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "16px",
      padding: "28px",
      marginBottom: "20px",
      overflowX: "auto",
    }}>
      <h2 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "700", color: "#f0f0f0" }}>
        Cross-Site Comparison
      </h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Metric
            </th>
            {results.map((r, i) => (
              <th key={i} style={{ textAlign: "center", padding: "8px 12px", fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {SITES[i]?.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metricKeys.map((m) => {
            const values = results.map((r) => r ? m.extract(r) : null);
            const bestIdx = m.key === "cls" || m.key !== "performance"
              ? values.reduce((bi, v, i) => (v !== null && (values[bi] === null || v < values[bi]) ? i : bi), 0)
              : values.reduce((bi, v, i) => (v !== null && (values[bi] === null || v > values[bi]) ? i : bi), 0);

            if (m.key === "performance") {
              // For performance, higher is better
              const pBest = values.reduce((bi, v, i) => (v !== null && (values[bi] === null || v > values[bi]) ? i : bi), 0);
              return (
                <tr key={m.key}>
                  <td style={{ padding: "10px 12px", fontSize: "13px", color: "#aaa", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {m.label}
                  </td>
                  {values.map((v, i) => (
                    <td key={i} style={{
                      textAlign: "center",
                      padding: "10px 12px",
                      fontSize: "15px",
                      fontWeight: "700",
                      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                      color: v !== null ? scoreColor(v) : "#555",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: i === pBest ? "rgba(12,206,107,0.06)" : "transparent",
                    }}>
                      {v !== null ? m.format(v) : "—"}
                    </td>
                  ))}
                </tr>
              );
            }

            return (
              <tr key={m.key}>
                <td style={{ padding: "10px 12px", fontSize: "13px", color: "#aaa", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {m.label}
                </td>
                {values.map((v, i) => (
                  <td key={i} style={{
                    textAlign: "center",
                    padding: "10px 12px",
                    fontSize: "15px",
                    fontWeight: "600",
                    fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                    color: "#ddd",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i === bestIdx && v !== null ? "rgba(12,206,107,0.06)" : "transparent",
                  }}>
                    {v !== null ? m.format(v) : "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PageSpeedDashboard() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [started, setStarted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [strategy, setStrategy] = useState("mobile");

  const runAudit = useCallback(async (site) => {
    setLoading((p) => ({ ...p, [site.url]: true }));
    setErrors((p) => ({ ...p, [site.url]: null }));

    try {
      const cats = CATEGORIES.map((c) => `&category=${c}`).join("");
      const keyParam = apiKey ? `&key=${apiKey}` : "";
      const res = await fetch(
        `${API_BASE}?url=${encodeURIComponent(site.url)}&strategy=${strategy}${cats}${keyParam}`
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResults((p) => ({ ...p, [site.url]: data }));
    } catch (e) {
      setErrors((p) => ({ ...p, [site.url]: e.message }));
    } finally {
      setLoading((p) => ({ ...p, [site.url]: false }));
    }
  }, [apiKey, strategy]);

  const runAll = useCallback(async () => {
    setStarted(true);
    setResults({});
    setErrors({});
    // Run sequentially to avoid rate limits
    for (const site of SITES) {
      await runAudit(site);
    }
  }, [runAudit]);

  const allDone = SITES.every((s) => results[s.url] || errors[s.url]);
  const anyLoading = Object.values(loading).some(Boolean);
  const currentlyTesting = SITES.find((s) => loading[s.url]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0b",
      color: "#e8e8e8",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      padding: "32px 24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: anyLoading ? "#ffa400" : "#0cce6b",
              boxShadow: anyLoading ? "0 0 8px rgba(255,164,0,0.5)" : "0 0 8px rgba(12,206,107,0.4)",
              animation: anyLoading ? "pulse 1.5s infinite" : "none",
            }} />
            <span style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "1px" }}>
              {anyLoading ? "Auditing..." : "Ready"}
            </span>
          </div>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
          <h1 style={{
            margin: 0,
            fontSize: "32px",
            fontWeight: "700",
            background: "linear-gradient(135deg, #fff 0%, #888 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.2,
          }}>
            PageSpeed Audit
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#666" }}>
            Spotlight Oral Care — {SITES.length} sites
          </p>
        </div>

        {/* Controls */}
        <div style={{
          display: "flex",
          gap: "12px",
          marginBottom: "28px",
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          <input
            type="text"
            placeholder="API key (optional, increases rate limit)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "10px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#ccc",
              fontSize: "13px",
              fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            {["mobile", "desktop"].map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                style={{
                  padding: "10px 18px",
                  background: strategy === s ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.02)",
                  border: "none",
                  color: strategy === s ? "#fff" : "#666",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.2s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={runAll}
            disabled={anyLoading}
            style={{
              padding: "10px 24px",
              background: anyLoading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #0cce6b, #0aa85a)",
              border: "none",
              borderRadius: "10px",
              color: anyLoading ? "#666" : "#000",
              fontSize: "13px",
              fontWeight: "700",
              cursor: anyLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {anyLoading ? `Testing ${currentlyTesting?.name || ""}...` : "Run Audit"}
          </button>
        </div>

        {/* Progress */}
        {started && !allDone && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              {SITES.map((s) => (
                <div key={s.url} style={{
                  flex: 1,
                  height: "3px",
                  borderRadius: "2px",
                  background: results[s.url]
                    ? "#0cce6b"
                    : errors[s.url]
                    ? "#ff4e42"
                    : loading[s.url]
                    ? "#ffa400"
                    : "rgba(255,255,255,0.06)",
                  transition: "background 0.5s",
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Error messages */}
        {Object.entries(errors).filter(([, e]) => e).map(([url, err]) => (
          <div key={url} style={{
            padding: "12px 16px",
            background: "rgba(255,78,66,0.08)",
            border: "1px solid rgba(255,78,66,0.2)",
            borderRadius: "10px",
            marginBottom: "12px",
            fontSize: "13px",
            color: "#ff6b5e",
          }}>
            <strong>{SITES.find((s) => s.url === url)?.name}:</strong> {err}
          </div>
        ))}

        {/* Comparison Table */}
        {allDone && Object.keys(results).length > 1 && (
          <ComparisonTable results={SITES.map((s) => results[s.url] || null)} />
        )}

        {/* Individual Reports */}
        {SITES.map((site) =>
          results[site.url] ? (
            <SiteReport key={site.url} data={results[site.url]} siteName={site.name} />
          ) : null
        )}

        {/* Empty State */}
        {!started && (
          <div style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "#444",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.4 }}>⚡</div>
            <div style={{ fontSize: "15px", fontWeight: "500" }}>
              Click <strong style={{ color: "#0cce6b" }}>Run Audit</strong> to test all {SITES.length} sites
            </div>
            <div style={{ fontSize: "12px", marginTop: "8px", color: "#333" }}>
              Tests run sequentially to avoid rate limits. Each takes ~15–30 seconds.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: "center",
          padding: "24px",
          fontSize: "11px",
          color: "#333",
          marginTop: "20px",
        }}>
          Powered by Google PageSpeed Insights API · Lighthouse
        </div>
      </div>
    </div>
  );
}
