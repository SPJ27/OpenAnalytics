"use client";
import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import {
  FaChrome,
  FaFacebook,
  FaGoogle,
  FaLink,
  FaTwitter,
  FaGithub,
  FaYoutube,
  FaLinkedin,
  FaReddit,
  FaInstagram,
  FaFirefox,
  FaSafari,
  FaEdge,
  FaMobile,
  FaTablet,
  FaDesktop,
  FaWindows,
  FaApple,
  FaLinux,
} from "react-icons/fa";
Chart.register(...registerables);

// ── Config ────────────────────────────────────────────────────────────────
const API_BASE = "/api/stats";
const TRACKER_ID = "a0b13b39-797f-4009-96bf-82f2c09e2704";

// ── Date range presets ────────────────────────────────────────────────────
function getDateRange(period) {
  const today = new Date().toISOString().split("T")[0];
  const daysAgo = (n) =>
    new Date(Date.now() - n * 86400000).toISOString().split("T")[0];

  switch (period) {
    case "Today":
      return { fromDate: today, toDate: today };
    case "Yesterday":
      return { fromDate: daysAgo(1), toDate: daysAgo(1) };
    case "Last 7 days":
      return { fromDate: daysAgo(7), toDate: today };
    case "Last 30 days":
      return { fromDate: daysAgo(30), toDate: today };
    case "All time":
      return { fromDate: null, toDate: null };
    default:
      return { fromDate: daysAgo(7), toDate: today };
  }
}

const PERIODS = [
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
  "All time",
];

// ── Format seconds → "2m 34s" ─────────────────────────────────────────────
function fmtTime(secs) {
  const s = Math.round(Number(secs) || 0);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Sort object entries by value descending ───────────────────────────────
function topEntries(obj = {}) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

const COUNTRY_FLAGS = {
  "United States": "🇺🇸",
  India: "🇮🇳",
  Canada: "🇨🇦",
  "United Kingdom": "🇬🇧",
  Germany: "🇩🇪",
  France: "🇫🇷",
  Australia: "🇦🇺",
  Brazil: "🇧🇷",
  Japan: "🇯🇵",
  Morocco: "🇲🇦",
  Portugal: "🇵🇹",
  Italy: "🇮🇹",
  Indonesia: "🇮🇩",
  Pakistan: "🇵🇰",
  Spain: "🇪🇸",
};

function getFlag(country) {
  return COUNTRY_FLAGS[country] ?? "🌐";
}
function getReferrerIcon(r) {
  if (!r || r === "Direct") return <FaLink className="text-gray-400" />;
  if (/google/i.test(r)) return <FaGoogle className="text-gray-400" />;
  if (/twitter|x\.com/i.test(r)) return <FaTwitter className="text-gray-400" />;
  if (/facebook/i.test(r)) return <FaFacebook className="text-blue-400" />;
  if (/github/i.test(r)) return <FaGithub className="text-gray-400" />;
  if (/youtube/i.test(r)) return <FaYoutube className="text-red-400" />;
  if (/linkedin/i.test(r)) return <FaLinkedin className="text-gray-400" />;
  if (/reddit/i.test(r)) return <FaReddit className="text-orange-400" />;
  if (/instagram/i.test(r)) return <FaInstagram className="text-pink-400" />;
  return <FaLink className="text-gray-400" />;
}
function getDeviceIcon(d) {
  return d === "Mobile" ? <FaMobile className="text-gray-400" /> : d === "Tablet" ? <FaTablet className="text-gray-400" /> : <FaDesktop className="text-gray-400" />;
}
function getBrowserIcon(b) {
  if (/chrome/i.test(b)) return <FaChrome className="text-gray-400" />;
  if (/firefox/i.test(b)) return <FaFirefox className="text-orange-400" />;
  if (/safari/i.test(b)) return <FaSafari className="text-blue-400" />;
  if (/edge/i.test(b)) return <FaEdge className="text-blue-400" />;
  return <FaLink className="text-gray-400" />;
}
function getOSIcon(o) {
  if (/windows/i.test(o)) return <FaWindows className="text-gray-400" />;
  if (/macos/i.test(o)) return <FaApple className="text-gray-400" />;
  if (/linux/i.test(o)) return <FaLinux className="text-gray-400" />;
  return <FaLink className="text-gray-400" />;
}

// ── Build rows for each tab ────────────────────────────────────────────────
function getLeftRows(data, tab) {
  if (!data) return [];
  const maps = {
    Referrer: [data.referrers, getReferrerIcon],
    Device: [data.devices, getDeviceIcon],
    Browser: [data.browsers, getBrowserIcon],
    OS: [data.oses, getOSIcon],
  };
  const [obj, iconFn] = maps[tab] || [];
  if (!obj) return [];
  return topEntries(obj).map(([k, v]) => ({
    label: k,
    value: v,
    icon: iconFn(k),
  }));
}

function getRightRows(data, tab) {
  if (!data) return [];
  const maps = {
    Country: [data.countries, getFlag],
    City: [data.cities, () => "📍"],
    Page: [data.visitedPages, () => "📄"],
  };
  const [obj, iconFn] = maps[tab] || [];
  if (!obj) return [];
  return topEntries(obj).map(([k, v]) => ({
    label: k,
    value: v,
    icon: iconFn(k),
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// Small UI components
// ════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1 min-w-25">
      <div className="flex items-center gap-1.5">
        {accent && (
          <span
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ background: accent }}
          />
        )}
        <span className="text-xs text-[#101010] font-light tracking-wide">
          {label}
        </span>
      </div>
      <span className="text-2xl font-bold text-[#454545] tabular-nums leading-tight">
        {value ?? "–"}
      </span>
    </div>
  );
}

function VDivider() {
  return <div className="w-px h-12 bg-slate-700/50 self-center shrink-0" />;
}

function TabBar({ options, active, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            active === o
              ? "bg-blue-500 text-white"
              : "text-slate-600 hover:text-slate-500"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function BarRow({ label, value, max, icon }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2 group">
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600 truncate transition-colors">
            {label}
          </span>
          <span className="text-sm font-semibold text-slate-600 ml-2 tabular-nums">
            {value}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg,#3b82f6,#60a5fa)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PeriodDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-light text-[#191919] hover:border-slate-300 transition-colors"
      >
        {value} <span className="text-[#191919] ml-1">▾</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-xl min-w-[140px]">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                p === value
                  ? "text-[#454545] bg-blue-600/10"
                  : "text-[#303030] hover:bg-blue-600/5 hover:text-slate-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-gray-100 p-4 flex items-center justify-between">
      <span className="text-sm text-red-400">{message}</span>
      <button
        onClick={onRetry}
        className="text-xs text-red-400 hover:text-red-300 underline ml-4"
      >
        Retry
      </button>
    </div>
  );
}

function buildChartGradient(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, 260);
  grad.addColorStop(0, "rgba(59,130,246,0.35)");
  grad.addColorStop(0.6, "rgba(59,130,246,0.08)");
  grad.addColorStop(1, "rgba(59,130,246,0.0)");
  return grad;
}

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b",
      borderColor: "#334155",
      borderWidth: 1,
      titleColor: "#94a3b8",
      bodyColor: "#f1f5f9",
      padding: 10,
      callbacks: { label: (c) => ` ${c.parsed.y} visitors` },
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
      ticks: {
        color: "#475569",
        font: { size: 11 },
        maxRotation: 0,
        maxTicksLimit: 10,
      },
      border: { display: false },
    },
    y: {
      min: 0,
      grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
      ticks: { color: "#475569", font: { size: 11 }, stepSize: 1 },
      border: { display: false },
    },
  },
};

export default function Page() {
  const chartRef = useRef(null);
  const chartInst = useRef(null);

  const [period, setPeriod] = useState("Last 7 days");
  const [leftTab, setLeftTab] = useState("Referrer");
  const [rightTab, setRightTab] = useState("Country");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchStats(selectedPeriod) {
    setLoading(true);
    setError(null);
    try {
      const { fromDate, toDate } = getDateRange(selectedPeriod);
      const params = new URLSearchParams({ id: TRACKER_ID });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);

      const res = await fetch(`${API_BASE}?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Unknown error");

      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats(period);
  }, [period]);

  useEffect(() => {
    if (!chartRef.current || !data?.graph) return;
    if (chartInst.current) chartInst.current.destroy();

    const ctx = chartRef.current.getContext("2d");
    const grad = buildChartGradient(ctx);

    chartInst.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.graph.map((d) => d.label),
        datasets: [
          {
            data: data.graph.map((d) => d.visits),
            borderColor: "#3b82f6",
            borderWidth: 2.5,
            backgroundColor: grad,
            fill: true,
            tension: 0.45,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#3b82f6",
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: CHART_OPTIONS,
    });

    return () => {
      if (chartInst.current) chartInst.current.destroy();
    };
  }, [data]);

  const leftRows = getLeftRows(data, leftTab);
  const rightRows = getRightRows(data, rightTab);
  const leftMax = Math.max(0, ...leftRows.map((r) => r.value));
  const rightMax = Math.max(0, ...rightRows.map((r) => r.value));

  return (
    <div className="min-h-screen  text p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-blue-400 font-mono">{"</>"}</span>
            <span className="text-sm font-light text-[#191919]">
              analytics.sakshamjain.dev
            </span>
          </div>

          <PeriodDropdown value={period} onChange={setPeriod} />

          <button
            onClick={() => fetchStats(period)}
            disabled={loading}
            className="w-7 h-7 flex items-center justify-center rounded-md  border border-gray-200 text-[#303030] hover:text-[#504c4c] transition-colors text-sm disabled:opacity-40"
          >
            <span className={loading ? "animate-spin inline-block" : ""}>
              ↻
            </span>
          </button>

          {data?.bucketMode && (
            <span className="text-xs text-slate-600 ml-auto capitalize">
              Showing{" "}
              {data.bucketMode == "day"
                ? "daily"
                : data.bucketMode == "week"
                  ? "weekly"
                  : "monthly"}{" "}
              data
            </span>
          )}
        </div>

        {error && (
          <ErrorBanner
            message={`Failed to load: ${error}`}
            onRetry={() => fetchStats(period)}
          />
        )}

        <div className="rounded-xl border border-gray-200 p-5">
          {loading ? (
            <Spinner />
          ) : (
            data && (
              <>
                <div className="flex flex-wrap items-start gap-6">
                  <StatCard
                    label="Visitors"
                    value={data.totalVisits}
                    accent="#3b82f6"
                  />
                  <VDivider />
                  <StatCard
                    label="Unique"
                    value={data.uniqueVisitors}
                    accent="#a78bfa"
                  />
                  <VDivider />
                  <StatCard label="Sessions" value={data.totalSessions} />
                  <VDivider />
                  <StatCard label="Bounce rate" value={data.bounceRate} />
                  <VDivider />
                  <StatCard
                    label="Avg time"
                    value={fmtTime(data.avgTimeSpent)}
                  />
                  <VDivider />
                  <StatCard
                    label="Pages/visitor"
                    value={data.avgVisitsPerUser}
                  />
                </div>

                <div className="mt-5 relative" style={{ height: 260 }}>
                  <canvas ref={chartRef} />
                </div>
              </>
            )
          )}
        </div>

        {!loading && data && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <TabBar
                  options={["Referrer", "Device", "Browser", "OS"]}
                  active={leftTab}
                  onChange={setLeftTab}
                />
                <span className="text-xs text-slate-500 font-medium">
                  Visitors ↓
                </span>
              </div>
              <div className="divide-y divide-slate-700/30">
                {leftRows.length > 0 ? (
                  leftRows.map((r) => (
                    <BarRow key={r.label} {...r} max={leftMax} />
                  ))
                ) : (
                  <p className="text-sm text-slate-900 py-4 text-center">
                    No data
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <TabBar
                  options={["Country", "City", "Page"]}
                  active={rightTab}
                  onChange={setRightTab}
                />
                <span className="text-xs text-slate-500 font-medium">
                  Visitors ↓
                </span>
              </div>
              <div className="divide-y divide-slate-700/30">
                {rightRows.length > 0 ? (
                  rightRows.map((r) => (
                    <BarRow key={r.label} {...r} max={rightMax} />
                  ))
                ) : (
                  <p className="text-sm text-slate-900 py-4 text-center">
                    No data
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
