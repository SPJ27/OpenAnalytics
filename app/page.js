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
  FaUser,
  FaEnvelope,
  FaAndroid,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearch,
  FaPaperclip,
  FaMapMarker,
} from "react-icons/fa";
Chart.register(...registerables);

const API_BASE = "/api/stats";
const TRACKER_ID = "a0b13b39-797f-4009-96bf-82f2c09e2704";

function getDateRange(period) {
  const today = new Date().toISOString().split("T")[0];
  const daysAgo = (n) =>
    new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
  switch (period) {
    case "Today": return { fromDate: today, toDate: today };
    case "Yesterday": return { fromDate: daysAgo(1), toDate: daysAgo(1) };
    case "Last 7 days": return { fromDate: daysAgo(7), toDate: today };
    case "Last 30 days": return { fromDate: daysAgo(30), toDate: today };
    case "All time": return { fromDate: null, toDate: null };
    default: return { fromDate: daysAgo(7), toDate: today };
  }
}

const PERIODS = ["Today", "Yesterday", "Last 7 days", "Last 30 days", "All time"];

function fmtTime(secs) {
  const s = Math.round(Number(secs) || 0);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function topEntries(obj = {}) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

const COUNTRY_FLAGS = {
  "United States": "🇺🇸", India: "🇮🇳", Canada: "🇨🇦", "United Kingdom": "🇬🇧",
  Germany: "🇩🇪", France: "🇫🇷", Australia: "🇦🇺", Brazil: "🇧🇷", Japan: "🇯🇵",
  Morocco: "🇲🇦", Portugal: "🇵🇹", Italy: "🇮🇹", Indonesia: "🇮🇩", Pakistan: "🇵🇰", Spain: "🇪🇸",
};

function getFlag(country) { return COUNTRY_FLAGS[country] ?? "🌐"; }

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
  if (/android/i.test(o)) return <FaAndroid className="text-gray-400" />;
  if (/ios/i.test(o)) return <FaApple className="text-gray-400" />;
  return <FaLink className="text-gray-400" />;
}

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
  return topEntries(obj).map(([k, v]) => ({ label: k, value: v, icon: iconFn(k) }));
}

function getRightRows(data, tab) {
  if (!data) return [];
  const maps = {
    Country: [data.countries, getFlag],
    City: [data.cities, () => <FaMapMarker className="text-gray-400" />],
    Page: [data.visitedPages, () => <FaPaperclip className="text-gray-400" />],
  };
  const [obj, iconFn] = maps[tab] || [];
  if (!obj) return [];
  return topEntries(obj).map(([k, v]) => ({ label: k, value: v, icon: iconFn(k) }));
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name }) {
  if (!name) return <FaUser className="text-gray-300" />;
  const initials = (name || "Anonymous").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const colors = [
    "bg-blue-100 text-blue-600", "bg-purple-100 text-purple-600",
    "bg-green-100 text-green-600", "bg-orange-100 text-orange-600",
    "bg-pink-100 text-pink-600", "bg-teal-100 text-teal-600",
  ];
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

// ── UI Primitives ──────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1 min-w-25">
      <div className="flex items-center gap-1.5">
        {accent && <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: accent }} />}
        <span className="text-xs text-[#101010] font-light tracking-wide">{label}</span>
      </div>
      <span className="text-2xl font-bold text-[#454545] tabular-nums leading-tight">{value ?? "–"}</span>
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
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${active === o ? "bg-blue-500 text-white" : "text-slate-600 hover:text-slate-500"}`}>
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
          <span className="text-sm text-gray-600 truncate transition-colors">{label}</span>
          <span className="text-sm font-semibold text-slate-600 ml-2 tabular-nums">{value}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#3b82f6,#60a5fa)" }} />
        </div>
      </div>
    </div>
  );
}

function PeriodDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-light text-[#191919] hover:border-slate-300 transition-colors">
        {value} <span className="text-[#191919] ml-1">▾</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-xl min-w-[140px]">
          {PERIODS.map((p) => (
            <button key={p} onClick={() => { onChange(p); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${p === value ? "text-[#454545] bg-blue-600/10" : "text-[#303030] hover:bg-blue-600/5 hover:text-slate-600"}`}>
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
      <button onClick={onRetry} className="text-xs text-red-400 hover:text-red-300 underline ml-4">Retry</button>
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
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b", borderColor: "#334155", borderWidth: 1,
      titleColor: "#94a3b8", bodyColor: "#f1f5f9", padding: 10,
      callbacks: { label: (c) => ` ${c.parsed.y} visitors` },
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
      ticks: { color: "#475569", font: { size: 11 }, maxRotation: 0, maxTicksLimit: 10 },
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

// ── Users Table ────────────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <FaSort className="text-gray-300 ml-1 inline" />;
  return sortDir === "asc"
    ? <FaSortUp className="text-blue-500 ml-1 inline" />
    : <FaSortDown className="text-blue-500 ml-1 inline" />;
}

function UsersTable({ users = [] }) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("lastSeen");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 8;

  function toggleSort(col) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
    setPage(0);
  }

  const filtered = users
    .filter((u) => {
      const q = search.toLowerCase();
      return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.userId?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let av = a[sortCol] ?? "", bv = b[sortCol] ?? "";
      if (sortCol === "visits") { av = Number(av) || 0; bv = Number(bv) || 0; }
      else if (sortCol === "lastSeen" || sortCol === "dateCreated") { av = new Date(av).getTime() || 0; bv = new Date(bv).getTime() || 0; }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const thClass = "px-4 py-2.5 text-left text-xs font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-700 transition-colors whitespace-nowrap";

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FaUser className="text-blue-500 text-sm" />
          <span className="text-sm font-semibold text-[#303030]">Users</span>
          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 tabular-nums">
            {filtered.length}
          </span>
        </div>
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search name, email, ID…"
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg text-[#303030] placeholder-gray-300 focus:outline-none focus:border-blue-300 w-52 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={thClass} onClick={() => toggleSort("name")}>
                <FaUser className="inline mr-1.5 text-gray-300 text-xs" />
                Name <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("email")}>
                <FaEnvelope className="inline mr-1.5 text-gray-300 text-xs" />
                Email <SortIcon col="email" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("visits")}>
                Visits <SortIcon col="visits" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("lastSeen")}>
                Last Seen <SortIcon col="lastSeen" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Location</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Browser / OS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.length > 0 ? (
              paged.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} />
                      <span className="text-sm text-[#303030] font-medium truncate max-w-35">
                        {u.name || <span className="text-gray-300 italic">Anonymous</span>}
                      </span>
                    </div>
                  </td>
                  {/* Email */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500 truncate max-w-[180px] block">
                      {u.email || <span className="text-gray-300 italic">—</span>}
                    </span>
                  </td>
                  {/* Visits */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-slate-600 tabular-nums">{u.visits ?? "—"}</span>
                  </td>
                  {/* Last Seen */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500 whitespace-nowrap">{fmtDate(u.lastSeen)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-gray-500 flex items-center gap-1.5">
                        <span>{getFlag(u.country)}</span>
                        <span className="truncate max-w-[90px]">{u.country || "—"}</span>
                      </span>
                      {u.city && (
                        <span className="text-xs text-gray-400 truncate max-w-[90px]">{u.city}</span>
                      )}
                    </div>
                  </td>
                  {/* Browser / OS */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        {getBrowserIcon(u.browser)}
                        <span className="truncate max-w-[80px]">{u.browser || "—"}</span>
                      </span>
                      {u.os && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          {getOSIcon(u.os)}
                          <span className="truncate max-w-20">{u.os}</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                  {search ? "No users match your search." : "No user data available."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-slate-400">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded-md text-slate-500 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              ←
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${pageNum === page ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 text-slate-500 hover:border-slate-300"}`}>
                  {pageNum + 1}
                </button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded-md text-slate-500 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
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

  useEffect(() => { fetchStats(period); }, [period]);

  useEffect(() => {
    if (!chartRef.current || !data?.graph) return;
    if (chartInst.current) chartInst.current.destroy();
    const ctx = chartRef.current.getContext("2d");
    const grad = buildChartGradient(ctx);
    chartInst.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.graph.map((d) => d.label),
        datasets: [{
          data: data.graph.map((d) => d.visits),
          borderColor: "#3b82f6", borderWidth: 2.5,
          backgroundColor: grad, fill: true, tension: 0.45,
          pointRadius: 0, pointHoverRadius: 5,
          pointHoverBackgroundColor: "#3b82f6",
          pointHoverBorderColor: "#fff", pointHoverBorderWidth: 2,
        }],
      },
      options: CHART_OPTIONS,
    });
    return () => { if (chartInst.current) chartInst.current.destroy(); };
  }, [data]);

  const leftRows = getLeftRows(data, leftTab);
  const rightRows = getRightRows(data, rightTab);
  const leftMax = Math.max(0, ...leftRows.map((r) => r.value));
  const rightMax = Math.max(0, ...rightRows.map((r) => r.value));

  return (
    <div className="min-h-screen text p-6">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-blue-400 font-mono">{"</>"}</span>
            <span className="text-sm font-light text-[#191919]">analytics.sakshamjain.dev</span>
          </div>
          <PeriodDropdown value={period} onChange={setPeriod} />
          <button onClick={() => fetchStats(period)} disabled={loading}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-[#303030] hover:text-[#504c4c] transition-colors text-sm disabled:opacity-40">
            <span className={loading ? "animate-spin inline-block" : ""}>↻</span>
          </button>
          {data?.bucketMode && (
            <span className="text-xs text-slate-600 ml-auto capitalize">
              Showing {data.bucketMode === "day" ? "daily" : data.bucketMode === "week" ? "weekly" : "monthly"} data
            </span>
          )}
        </div>

        {error && <ErrorBanner message={`Failed to load: ${error}`} onRetry={() => fetchStats(period)} />}

        {/* Stats + Chart */}
        <div className="rounded-xl border border-gray-200 p-5">
          {loading ? <Spinner /> : data && (
            <>
              <div className="flex flex-wrap items-start gap-6">
                <StatCard label="Visitors" value={data.totalVisits} accent="#3b82f6" />
                <VDivider />
                <StatCard label="Unique" value={data.uniqueVisitors} accent="#a78bfa" />
                <VDivider />
                <StatCard label="Sessions" value={data.totalSessions} />
                <VDivider />
                <StatCard label="Bounce rate" value={data.bounceRate} />
                <VDivider />
                <StatCard label="Avg time" value={fmtTime(data.avgTimeSpent)} />
                <VDivider />
                <StatCard label="Pages/visitor" value={data.avgVisitsPerUser} />
              </div>
              <div className="mt-5 relative" style={{ height: 260 }}>
                <canvas ref={chartRef} />
              </div>
            </>
          )}
        </div>

        {/* Breakdown panels */}
        {!loading && data && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <TabBar options={["Referrer", "Device", "Browser", "OS"]} active={leftTab} onChange={setLeftTab} />
                <span className="text-xs text-slate-500 font-medium">Visitors ↓</span>
              </div>
              <div className="divide-y divide-slate-700/30">
                {leftRows.length > 0
                  ? leftRows.map((r) => <BarRow key={r.label} {...r} max={leftMax} />)
                  : <p className="text-sm text-slate-900 py-4 text-center">No data</p>}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <TabBar options={["Country", "City", "Page"]} active={rightTab} onChange={setRightTab} />
                <span className="text-xs text-slate-500 font-medium">Visitors ↓</span>
              </div>
              <div className="divide-y divide-slate-700/30">
                {rightRows.length > 0
                  ? rightRows.map((r) => <BarRow key={r.label} {...r} max={rightMax} />)
                  : <p className="text-sm text-slate-900 py-4 text-center">No data</p>}
              </div>
            </div>
          </div>
        )}

        {/* Users table */}
        {!loading && data && <UsersTable users={data.users ?? []} />}

      </div>
    </div>
  );
}