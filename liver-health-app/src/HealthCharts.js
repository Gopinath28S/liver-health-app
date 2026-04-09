import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine
} from "recharts";

// ── Custom tooltip for line chart ──────────────────────────────────────────
const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <div style={tt.box}>
      <p style={tt.date}>{label}</p>
      <p style={{ ...tt.score, color }}>Score: {score}/100</p>
      <p style={tt.level}>
        {score >= 70 ? "🚨 High Risk" : score >= 40 ? "⚠️ Moderate Risk" : "✅ Low Risk"}
      </p>
    </div>
  );
};

const tt = {
  box:   { background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.75rem 1rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  date:  { fontSize: "0.75rem", color: "#6b7280", margin: "0 0 4px 0" },
  score: { fontSize: "1rem", fontWeight: 700, margin: "0 0 2px 0" },
  level: { fontSize: "0.8rem", color: "#374151", margin: 0 },
};

// ── Bar tooltip ─────────────────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tt.box}>
      <p style={{ ...tt.date, fontWeight: 600, color: "#111827" }}>{label}</p>
      <p style={{ ...tt.score, color: "#3b82f6" }}>Severity: {payload[0].value}/5</p>
    </div>
  );
};

// ── Dot color based on score ─────────────────────────────────────────────────
const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const color = payload.riskScore >= 70 ? "#ef4444" : payload.riskScore >= 40 ? "#f59e0b" : "#22c55e";
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />;
};

// ── Main component ───────────────────────────────────────────────────────────
export default function HealthCharts({ healthHistory, symptoms, analysisResult }) {

  // Prepare line chart data (oldest → newest)
  const lineData = [...healthHistory].reverse().map((r) => ({
    date: r.date.slice(5), // MM-DD
    riskScore: r.riskScore,
    status: r.status,
  }));

  // Prepare bar chart data from symptoms
  const symptomLabels = {
    fatigue:       "Fatigue",
    abdominalPain: "Abd. Pain",
    nausea:        "Nausea",
    appetiteLoss:  "Appetite",
    darkUrine:     "Dark Urine",
    paleStool:     "Pale Stool",
    itching:       "Itching",
    yellowSkin:    "Yellow Skin",
  };

  const barData = Object.entries(symptoms)
    .map(([key, value]) => ({ name: symptomLabels[key], value }))
    .filter((d) => d.value > 0);

  // Stats
  const totalChecks = healthHistory.length;
  const avgScore = totalChecks
    ? Math.round(healthHistory.reduce((s, r) => s + r.riskScore, 0) / totalChecks)
    : 0;
  const highestScore = totalChecks
    ? Math.max(...healthHistory.map((r) => r.riskScore))
    : 0;
  const highRiskCount = healthHistory.filter((r) => r.status === "High Risk").length;

  const statCards = [
    { label: "Total Checks",   value: totalChecks,           color: "#3b82f6", icon: "📋" },
    { label: "Average Score",  value: avgScore + "/100",     color: avgScore >= 70 ? "#ef4444" : avgScore >= 40 ? "#f59e0b" : "#22c55e", icon: "📊" },
    { label: "Highest Score",  value: highestScore + "/100", color: highestScore >= 70 ? "#ef4444" : highestScore >= 40 ? "#f59e0b" : "#22c55e", icon: "📈" },
    { label: "High Risk Days", value: highRiskCount,         color: highRiskCount > 0 ? "#ef4444" : "#22c55e", icon: "🚨" },
  ];

  return (
    <div style={s.wrapper}>

      {/* ── Stats Row ── */}
      <div style={s.statsRow}>
        {statCards.map((card) => (
          <div key={card.label} style={s.statCard}>
            <span style={s.statIcon}>{card.icon}</span>
            <div style={{ ...s.statValue, color: card.color }}>{card.value}</div>
            <div style={s.statLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── Line Chart ── */}
      <div style={s.chartCard}>
        <div style={s.chartHeader}>
          <h3 style={s.chartTitle}>📈 Risk Score Over Time</h3>
          <div style={s.legend}>
            <span style={{ ...s.dot, background: "#22c55e" }} /> Low
            <span style={{ ...s.dot, background: "#f59e0b", marginLeft: 12 }} /> Moderate
            <span style={{ ...s.dot, background: "#ef4444", marginLeft: 12 }} /> High
          </div>
        </div>

        {lineData.length < 2 ? (
          <div style={s.emptyChart}>
            <p>📋 Complete at least 2 symptom checks to see your trend chart</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Tooltip content={<LineTooltip />} />
              <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Line
                type="monotone"
                dataKey="riskScore"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={<CustomDot />}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Bar Chart ── */}
      <div style={s.chartCard}>
        <div style={s.chartHeader}>
          <h3 style={s.chartTitle}>📊 Current Symptom Severity</h3>
          <span style={s.chartSub}>Scale: 0–5</span>
        </div>

        {barData.length === 0 ? (
          <div style={s.emptyChart}>
            <p>🩺 No active symptoms recorded — go to Symptom Checker to rate your symptoms</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis domain={[0, 5]} ticks={[0,1,2,3,4,5]} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.value >= 4 ? "#ef4444" : entry.value >= 2 ? "#f59e0b" : "#22c55e"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── History Table ── */}
      <div style={s.chartCard}>
        <h3 style={{ ...s.chartTitle, marginBottom: "1rem" }}>🗂️ Full Health History</h3>
        {healthHistory.length === 0 ? (
          <div style={s.emptyChart}><p>No history yet — complete a symptom check first!</p></div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Date", "Risk Level", "Score", "Status"].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {healthHistory.map((r, i) => {
                const color = r.status === "High Risk" ? "#ef4444" : r.status === "Moderate Risk" ? "#f59e0b" : "#22c55e";
                const bg    = r.status === "High Risk" ? "#fee2e2" : r.status === "Moderate Risk" ? "#fef3c7" : "#dcfce7";
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#f9fafb" }}>
                    <td style={s.td}>{r.date}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: bg, color }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontWeight: 600, color }}>{r.riskScore}/100</td>
                    <td style={s.td}>
                      {r.riskScore >= 70 ? "🚨 Urgent" : r.riskScore >= 40 ? "⚠️ Monitor" : "✅ Healthy"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  wrapper:     { display: "flex", flexDirection: "column", gap: "1.5rem" },
  statsRow:    { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" },
  statCard:    { background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", textAlign: "center" },
  statIcon:    { fontSize: "1.5rem" },
  statValue:   { fontSize: "1.6rem", fontWeight: 700 },
  statLabel:   { fontSize: "0.8rem", color: "#6b7280", fontWeight: 500 },
  chartCard:   { background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" },
  chartTitle:  { fontSize: "1rem", fontWeight: 700, color: "#111827", margin: 0 },
  chartSub:    { fontSize: "0.8rem", color: "#9ca3af" },
  legend:      { display: "flex", alignItems: "center", fontSize: "0.8rem", color: "#6b7280" },
  dot:         { display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", marginRight: "4px" },
  emptyChart:  { textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.9rem", background: "#f9fafb", borderRadius: "8px" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th:          { textAlign: "left", padding: "0.75rem 1rem", color: "#6b7280", fontWeight: 600, fontSize: "0.8rem", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  td:          { padding: "0.75rem 1rem", color: "#374151", borderBottom: "1px solid #f3f4f6" },
  badge:       { padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 600 },
};

