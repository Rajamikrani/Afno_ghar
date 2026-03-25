import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { handleLogout } from "../utils/logout"; 
import {
  LayoutDashboard, Users, Home, Calendar, Star, Settings,
  LogOut, ChevronRight, MapPin, Clock, CheckCircle, XCircle,
  AlertCircle, Shield, TrendingUp, DollarSign, Search, X,
  RefreshCw, Trash2, Edit2, Eye, ArrowLeft, ArrowUp, ArrowDown,
  BarChart2, Package, Bell, Filter, Download, MoreVertical,
  UserCheck, UserX, Crown, ChevronDown, Info, Award,
  Activity, Globe, Database, Layers, Tag, Zap, Plus,
  ExternalLink, Quote, AlertTriangle, ChevronLeft,
} from "lucide-react";

/* ── API imports — adjust path to your actual api.js ── */
import {
  getCurrentUser, logoutUser,
  adminGetAllUsers, adminUpdateUserRole, adminDeleteUser,
  adminGetAllListings, adminDeleteListing,
  adminGetAllBookings, adminGetBookingStats,
  adminGetAllReviews, adminDeleteReview,
  updateBookingStatus,
  adminGetCategories, adminGetAmenities,
  adminUpdateListingStatus 
} from "../service/api";

/* ════════════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════════════ */
const ROLES = ["guest", "host", "admin"];
const ROLE_META = {
  guest: { color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-400" },
  host:  { color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200",   dot: "bg-rose-400"   },
  admin: { color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-300",  dot: "bg-amber-500"  },
};

const STATUS_META = {
  pending:   { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   dot: "bg-amber-400"   },
  confirmed: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     dot: "bg-red-400"     },
  rejected:  { color: "text-gray-600",    bg: "bg-gray-50",    border: "border-gray-200",    dot: "bg-gray-400"    },
};

/* ════════════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════════════ */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtRel = (d) => {
  const days = Math.floor((Date.now() - new Date(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return fmtDate(d);
};

const nights = (a, b) =>
  Math.max(1, Math.round((new Date(b) - new Date(a)) / 86_400_000));

const fmtMoney = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

/* ════════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
════════════════════════════════════════════════════════════════════ */

/* ── Toast ── */
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const MAP = {
    success: "bg-emerald-600",
    error:   "bg-red-600",
    info:    "bg-slate-700",
    warning: "bg-amber-500",
  };
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl ${MAP[type] || MAP.info}`}
      style={{ animation: "slideUp .3s ease" }}>
      {msg}
      <button onClick={onClose}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
    </div>
  );
};

/* ── Badge ── */
const Badge = ({ label, color = "gray", size = "sm" }) => {
  const map = {
    gray:    "bg-gray-100 text-gray-600 border-gray-200",
    rose:    "bg-rose-50 text-rose-600 border-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber:   "bg-amber-50 text-amber-700 border-amber-200",
    indigo:  "bg-indigo-50 text-indigo-600 border-indigo-200",
    red:     "bg-red-50 text-red-600 border-red-200",
    blue:    "bg-blue-50 text-blue-600 border-blue-200",
  };
  const pad = size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 ${pad} rounded-full font-semibold border ${map[color] || map.gray}`}>
      {label}
    </span>
  );
};

/* ── Confirm Modal ── */
function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger = true, loading = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10" style={{ animation: "scaleIn .2s ease" }}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto ${danger ? "bg-red-50" : "bg-amber-50"}`}>
          <AlertTriangle className={`w-6 h-6 ${danger ? "text-red-500" : "text-amber-500"}`} />
        </div>
        <h3 className="font-bold text-gray-900 text-base text-center mb-1">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${danger ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"}`}>
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ── */
const StatCard = ({ label, value, sub, icon: Icon, color = "rose", trend, delay = 0 }) => {
  const COLORS = {
    rose:    { bg: "bg-rose-50",    text: "text-rose-500",    ring: "ring-rose-100"    },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-500", ring: "ring-emerald-100" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-500",   ring: "ring-amber-100"   },
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-500",  ring: "ring-indigo-100"  },
    blue:    { bg: "bg-blue-50",    text: "text-blue-500",    ring: "ring-blue-100"    },
    slate:   { bg: "bg-slate-100",  text: "text-slate-500",   ring: "ring-slate-200"   },
  };
  const c = COLORS[color] || COLORS.rose;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
      style={{ animation: `fadeUp .4s ease ${delay}ms both` }}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ring-4 ${c.ring}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

/* ── Search Bar ── */
const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative flex-1 min-w-48">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    <input value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder || "Search…"}
      className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm" />
    {value && (
      <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

/* ── Pagination ── */
function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs text-gray-400">
        Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = i + 1;
          if (totalPages > 5) {
            if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
          }
          return (
            <button key={p} onClick={() => onChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${p === page ? "bg-rose-500 text-white shadow-sm shadow-rose-200" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Empty State ── */
const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="flex flex-col items-center gap-3 py-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
      <Icon className="w-7 h-7 text-gray-300" />
    </div>
    <p className="font-semibold text-gray-700">{title}</p>
    {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
  </div>
);

/* ── Skeleton ── */
const Skeleton = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse flex gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        {Array.from({ length: cols - 2 }).map((_, j) => (
          <div key={j} className="h-3 bg-gray-100 rounded w-20 self-center" />
        ))}
      </div>
    ))}
  </div>
);

/* ── Mini Bar Chart ── */
function BarChart({ data, colorClass = "bg-rose-400" }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${Math.round((d.value / max) * 64)}px` }}>
            <div className={`w-full h-full ${colorClass} rounded-t-md opacity-80 hover:opacity-100 transition-opacity`} title={`${d.label}: ${d.value}`} />
          </div>
          <span className="text-[9px] text-gray-400 font-medium truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD TAB
════════════════════════════════════════════════════════════════════ */
function DashboardTab({ stats, users, listings, bookings, navigate, setActiveTab }) {
  const totalRevenue = bookings
    .filter(b => b.status === "confirmed")
    .reduce((s, b) => s + (b.totalPrice || 0), 0);

  const pendingBookings = bookings.filter(b => b.status === "pending");

  /* Monthly revenue (last 6 months mock from real data) */
  const monthlyData = (() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now     = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d     = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const total = bookings
        .filter(b => {
          const bd = new Date(b.createdAt);
          return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear() && b.status !== "cancelled";
        })
        .reduce((s, b) => s + (b.totalPrice || 0), 0);
      return { label: months[d.getMonth()], value: Math.round(total) };
    });
  })();

  /* Role breakdown */
  const roleCounts = ROLES.map(r => ({ label: r, count: users.filter(u => u.role === r).length }));

  /* Status breakdown */
  const statusCounts = ["pending", "confirmed", "cancelled", "rejected"].map(s => ({
    label: s, count: bookings.filter(b => b.status === s).length,
  }));

  /* Recent activity */
  const recentBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div className="tab-content space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-wide at a glance</p>
        </div>
        <button onClick={() => setActiveTab("bookings")}
          className="px-4 py-2 text-sm font-semibold rounded-full bg-rose-500 text-white hover:bg-rose-600 transition shadow-md shadow-rose-100 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Live bookings
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={users.length}       icon={Users}       color="indigo"  trend={12} delay={0}   sub={`${users.filter(u => u.role === "host").length} hosts`} />
        <StatCard label="Listings"       value={listings.length}    icon={Home}        color="rose"    trend={8}  delay={60}  sub="active properties" />
        <StatCard label="Total Bookings" value={bookings.length}    icon={Calendar}    color="amber"   trend={15} delay={120} sub={`${pendingBookings.length} pending`} />
        <StatCard label="Revenue"        value={fmtMoney(totalRevenue)} icon={DollarSign} color="emerald" trend={22} delay={180} sub="confirmed stays" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Monthly Revenue</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>{fmtMoney(totalRevenue)}</p>
              <p className="text-xs text-emerald-500 font-semibold">total confirmed</p>
            </div>
          </div>
          <BarChart data={monthlyData} colorClass="bg-rose-400" />
        </div>

        {/* User Roles */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">User Breakdown</h3>
          <div className="space-y-3">
            {roleCounts.map(({ label, count }) => {
              const meta = ROLE_META[label];
              const pct  = users.length ? Math.round((count / users.length) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span className="text-xs font-semibold text-gray-700 capitalize">{label}</span>
                    </div>
                    <span className="text-xs text-gray-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${meta.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 mb-3">Booking Status</h4>
            <div className="grid grid-cols-2 gap-2">
              {statusCounts.map(({ label, count }) => {
                const meta = STATUS_META[label];
                return (
                  <div key={label} className={`${meta.bg} ${meta.border} border rounded-xl p-2.5`}>
                    <p className={`text-xs font-bold ${meta.color} capitalize`}>{label}</p>
                    <p className="text-lg font-bold text-gray-900 leading-tight">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" /> Recent Bookings
          </h3>
          <button onClick={() => setActiveTab("bookings")}
            className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {recentBookings.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No bookings yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentBookings.map(b => {
              const guest  = b.user;
              const meta   = STATUS_META[b.status] || STATUS_META.pending;
              return (
                <div key={b._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition">
                  <img
                    src={guest?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest?.fullname || "G")}&background=6366f1&color=fff&size=36`}
                    alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{guest?.fullname || "Guest"}</p>
                    <p className="text-xs text-gray-400 truncate">{b.listing?.title || "Listing removed"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmtMoney(b.totalPrice)}</p>
                    <p className="text-xs text-gray-400">{fmtRel(b.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {b.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Manage Users",    icon: Users,    tab: "users",    color: "from-indigo-500 to-indigo-600" },
          { label: "All Listings",    icon: Home,     tab: "listings", color: "from-rose-500 to-rose-600"     },
          { label: "All Bookings",    icon: Calendar, tab: "bookings", color: "from-amber-500 to-orange-500"  },
          { label: "Reviews",         icon: Star,     tab: "reviews",  color: "from-emerald-500 to-teal-500"  },
        ].map(({ label, icon: Icon, tab, color }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`bg-gradient-to-br ${color} text-white rounded-2xl p-4 text-left hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0`}>
            <Icon className="w-5 h-5 mb-2 opacity-90" />
            <p className="text-sm font-bold">{label}</p>
            <ChevronRight className="w-4 h-4 mt-1 opacity-60" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   USERS TAB
════════════════════════════════════════════════════════════════════ */
function UsersTab({ users, loading, onRefresh, showToast }) {
  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState("all");
  const [page,          setPage]          = useState(1);
  const [updating,      setUpdating]      = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [localUsers,    setLocalUsers]    = useState(users);
  const PER_PAGE = 10;

  useEffect(() => { setLocalUsers(users); }, [users]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const filtered = localUsers
    .filter(u => roleFilter === "all" || u.role === roleFilter)
    .filter(u => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (u.fullname || "").toLowerCase().includes(q)
        || (u.email || "").toLowerCase().includes(q)
        || (u.username || "").toLowerCase().includes(q);
    });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId);
    try {
      await adminUpdateUserRole(userId, newRole);
      setLocalUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      showToast(`Role updated to ${newRole}`, "success");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update role", "error");
    } finally { setUpdating(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteUser(deleteTarget._id);
      setLocalUsers(prev => prev.filter(u => u._id !== deleteTarget._id));
      showToast("User deleted", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete user", "error");
    } finally { setDeleting(false); }
  };

  const roleCounts = { all: localUsers.length, ...Object.fromEntries(ROLES.map(r => [r, localUsers.filter(u => u.role === r).length])) };

  return (
    <div className="tab-content space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{localUsers.length} registered members</p>
        </div>
        <button onClick={onRefresh} className="p-2.5 border border-gray-200 rounded-full text-gray-500 hover:text-rose-500 hover:border-rose-300 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Role Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...ROLES].map(r => {
          const meta = r !== "all" ? ROLE_META[r] : null;
          return (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition capitalize ${
                roleFilter === r
                  ? r === "all"
                    ? "bg-gray-900 text-white border-gray-900"
                    : `${meta.bg} ${meta.color} ${meta.border} ring-2 ring-offset-1`
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}>
              {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
              {r} <span className="opacity-60">({roleCounts[r] ?? 0})</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email or username…" />
      </div>

      {loading ? <Skeleton rows={6} cols={5} /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" subtitle="Try adjusting your search or filter" />
      ) : (
        <>
          <div className="space-y-2">
            {paged.map(user => {
              const meta = ROLE_META[user.role] || ROLE_META.guest;
              return (
                <div key={user._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-gray-200 transition">
                  {/* Avatar */}
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname || "U")}&background=6366f1&color=fff&size=44`}
                    alt={user.fullname}
                    className="w-11 h-11 rounded-xl object-cover border border-gray-100 shrink-0"
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm truncate">{user.fullname}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.bg} ${meta.color} ${meta.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
                    <p className="text-xs text-gray-300 mt-0.5">@{user.username} · Joined {fmtDate(user.createdAt)}</p>
                  </div>

                  {/* Role Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user._id, e.target.value)}
                        disabled={updating === user._id}
                        className="pl-3 pr-7 py-1.5 text-xs font-semibold border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer disabled:opacity-50 appearance-none">
                        {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select>
                      {updating === user._id
                        ? <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400 pointer-events-none" />
                        : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />}
                    </div>
                    <button onClick={() => setDeleteTarget(user)}
                      className="p-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.fullname}?`}
        message="This permanently deletes the user account and all associated data. This cannot be undone."
        confirmLabel="Delete user"
        danger
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LISTINGS TAB
════════════════════════════════════════════════════════════════════ */
function ListingsTab({ listings, loading, onRefresh, navigate, showToast }) {
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [localList,    setLocalList]    = useState(listings);
  const [sort,         setSort]         = useState("newest");
  const [statusUpdating, setStatusUpdating] = useState(null);
  const PER_PAGE = 8;

  useEffect(() => { setLocalList(listings); }, [listings]);
  useEffect(() => { setPage(1); }, [search, sort]);

  const filtered = localList
    .filter(l => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (l.title || "").toLowerCase().includes(q)
        || (l.location?.city || "").toLowerCase().includes(q)
        || (l.location?.country || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === "price_h") return (b.price || 0) - (a.price || 0);
      if (sort === "price_l") return (a.price || 0) - (b.price || 0);
      if (sort === "rating")  return (b.averageRating || 0) - (a.averageRating || 0);
      return 0;
    });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Add handler
const handleStatusUpdate = async (listingId, status, adminNote = "") => {
  setStatusUpdating(listingId);
  try {
    await adminUpdateListingStatus(listingId, status, adminNote);
    setLocalList(prev =>
      prev.map(l => l._id === listingId ? { ...l, status } : l)
    );
    showToast(`Listing ${status}`, "success");
  } catch {
    showToast("Failed to update status", "error");
  } finally { setStatusUpdating(null); }
};

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteListing(deleteTarget._id);
      setLocalList(prev => prev.filter(l => l._id !== deleteTarget._id));
      showToast("Listing deleted", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete listing", "error");
    } finally { setDeleting(false); }
  };

  return (
    <div className="tab-content space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Listings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{localList.length} properties on the platform</p>
        </div>
        <button onClick={onRefresh} className="p-2.5 border border-gray-200 rounded-full text-gray-500 hover:text-rose-500 hover:border-rose-300 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by title, city or country…" />
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm font-medium cursor-pointer">
          <option value="newest">Newest first</option>
          <option value="price_h">Price: high to low</option>
          <option value="price_l">Price: low to high</option>
          <option value="rating">Highest rated</option>
        </select>
      </div>

      {loading ? <Skeleton rows={5} cols={4} /> : filtered.length === 0 ? (
        <EmptyState icon={Home} title="No listings found" subtitle="Try adjusting your search" />
      ) : (
        <>
          <div className="space-y-3">
            {paged.map(listing => {
              const images = Array.isArray(listing.images)
                ? listing.images.flatMap(img => img?.includes(",") ? img.split(",") : [img])
                : [];
              const host = listing.host;
              return (
                <div key={listing._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-gray-200 transition flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div className="sm:w-40 h-36 sm:h-auto shrink-0 bg-gray-100 relative">
                    {images[0]
                      ? <img src={images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Home className="w-8 h-8 text-gray-300" /></div>}
                    {listing.averageRating > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-gray-900">{Number(listing.averageRating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate" style={{ fontFamily: "'Fraunces', serif" }}>{listing.title}</h3>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {listing.location?.city}, {listing.location?.country}
                          </p>
                        </div>
                        <p className="font-bold text-gray-900 text-sm shrink-0">
                          ${listing.price}<span className="text-xs text-gray-400 font-normal">/night</span>
                        </p>
                      </div>

                      {host && (
                        <div className="flex items-center gap-2 mt-2">
                          <img src={host.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(host.fullname || "H")}&background=f43f5e&color=fff&size=24`}
                            alt={host.fullname} className="w-5 h-5 rounded-full object-cover" />
                          <p className="text-xs text-gray-500">by <span className="font-medium text-gray-700">{host.fullname}</span></p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{listing.bedrooms}bed Room</span>
                        <span>·</span>
                        <span>{listing.bathrooms}bath Room</span>
                        <span>·</span>
                        <span>{listing.maxGuests} guests</span>
                        <span>·</span>
                        <span className="text-gray-300">{fmtDate(listing.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                      <button onClick={() => navigate(`/listing/${listing._id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-xl hover:border-rose-300 hover:text-rose-500 transition">
                        <ExternalLink className="w-3 h-3" /> View
                      </button>
                      {/* Status badge */}
<span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
  listing.status === "approved"  ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
  listing.status === "rejected"  ? "bg-red-50 text-red-600 border-red-200" :
  listing.status === "inactive"  ? "bg-gray-100 text-gray-500 border-gray-200" :
                                   "bg-amber-50 text-amber-700 border-amber-200"
}`}>
  {listing.status}
</span>

{/* Approve button — only show if not already approved */}
{listing.status !== "approved" && (
  <button
    onClick={() => handleStatusUpdate(listing._id, "approved")}
    disabled={statusUpdating === listing._id}
    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition disabled:opacity-50">
    {statusUpdating === listing._id
      ? <RefreshCw className="w-3 h-3 animate-spin" />
      : <CheckCircle className="w-3 h-3" />}
    Approve
  </button>
)}

{/* Reject button — only show if not already rejected */}
{listing.status !== "rejected" && (
  <button
    onClick={() => handleStatusUpdate(listing._id, "rejected")}
    disabled={statusUpdating === listing._id}
    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 border border-red-100 px-3 py-1.5 rounded-xl hover:bg-red-50 transition disabled:opacity-50">
    <XCircle className="w-3 h-3" /> Reject
  </button>
)}
                      <button onClick={() => setDeleteTarget(listing)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 border border-red-100 px-3 py-1.5 rounded-xl hover:bg-red-50 hover:border-red-200 transition ml-auto">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete "${deleteTarget?.title}"?`}
        message="This will permanently remove the listing and all associated bookings and reviews."
        confirmLabel="Delete listing"
        danger
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   BOOKINGS TAB
════════════════════════════════════════════════════════════════════ */
function BookingsTab({ bookings, loading, onRefresh, showToast }) {
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("all");
  const [page,        setPage]        = useState(1);
  const [updating,    setUpdating]    = useState(null);
  const [localBk,     setLocalBk]     = useState(bookings);
  const PER_PAGE = 10;

  useEffect(() => { setLocalBk(bookings); }, [bookings]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = localBk
    .filter(b => statusFilter === "all" || b.status === statusFilter)
    .filter(b => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const guest = b.user;
      return (b.listing?.title || "").toLowerCase().includes(q)
        || (guest?.fullname || "").toLowerCase().includes(q)
        || (guest?.email || "").toLowerCase().includes(q)
        || (b.status || "").toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleStatusUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await updateBookingStatus(id, status);
      setLocalBk(prev => prev.map(b => b._id === id ? { ...b, status } : b));
      showToast(`Booking ${status}`, "success");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update", "error");
    } finally { setUpdating(null); }
  };

  const totalRevenue = localBk.filter(b => b.status === "confirmed").reduce((s, b) => s + (b.totalPrice || 0), 0);

  const STATUSES = ["all", "pending", "confirmed", "cancelled", "rejected"];
  const counts   = Object.fromEntries(STATUSES.map(s => [s, s === "all" ? localBk.length : localBk.filter(b => b.status === s).length]));

  return (
    <div className="tab-content space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{localBk.length} total · {fmtMoney(totalRevenue)} confirmed revenue</p>
        </div>
        <button onClick={onRefresh} className="p-2.5 border border-gray-200 rounded-full text-gray-500 hover:text-rose-500 hover:border-rose-300 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary strips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["pending", "confirmed", "cancelled", "rejected"].map(s => {
          const meta = STATUS_META[s];
          return (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`${meta.bg} ${meta.border} border rounded-2xl p-3.5 text-left transition hover:shadow-sm ${statusFilter === s ? "ring-2 ring-offset-1 ring-current" : ""}`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${meta.color} capitalize`}>{s}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none">{counts[s]}</p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by guest, listing or status…" />
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition capitalize ${statusFilter === s ? "bg-rose-500 text-white shadow" : "text-gray-500 hover:text-gray-800"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Skeleton rows={7} cols={5} /> : filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="No bookings found" subtitle="Try adjusting your filters" />
      ) : (
        <>
          <div className="space-y-2">
            {paged.map(b => {
              const guest  = b.user;
              const listing = b.listing;
              const meta   = STATUS_META[b.status] || STATUS_META.pending;
              const n      = nights(b.checkIn, b.checkOut);
              const isPending = b.status === "pending";
              const images = Array.isArray(listing?.images)
                ? listing.images.flatMap(img => img?.includes(",") ? img.split(",") : [img])
                : [];

              return (
                <div key={b._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition hover:border-gray-200 ${isPending ? "border-amber-200" : "border-gray-100"}`}>
                  {isPending && <div className="h-0.5 bg-gradient-to-r from-amber-400 to-orange-400" />}
                  <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">

                    {/* Guest */}
                    <div className="flex items-center gap-3 sm:w-48 shrink-0">
                      <img src={guest?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest?.fullname || "G")}&background=6366f1&color=fff&size=40`}
                        alt={guest?.fullname} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{guest?.fullname || "Guest"}</p>
                        <p className="text-xs text-gray-400 truncate">{guest?.email}</p>
                      </div>
                    </div>

                    {/* Listing */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {images[0] && <img src={images[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate" style={{ fontFamily: "'Fraunces', serif" }}>{listing?.title || "Listing removed"}</p>
                        <p className="text-xs text-gray-400">{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)} · {n}n</p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{fmtMoney(b.totalPrice)}</p>
                      <p className="text-xs text-gray-400">{fmtRel(b.createdAt)}</p>
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {b.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   REVIEWS TAB
════════════════════════════════════════════════════════════════════ */
function ReviewsTab({ reviews, loading, onRefresh, showToast }) {
  const [search,       setSearch]       = useState("");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [page,         setPage]         = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [localRevs,    setLocalRevs]    = useState(reviews);
  const PER_PAGE = 10;

  useEffect(() => { setLocalRevs(reviews); }, [reviews]);
  useEffect(() => { setPage(1); }, [search, ratingFilter]);

  const filtered = localRevs
    .filter(r => ratingFilter === 0 || r.rating === ratingFilter)
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (r.review || "").toLowerCase().includes(q)
        || (r.user?.fullname || "").toLowerCase().includes(q)
        || (r.listing?.title || "").toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteReview(deleteTarget._id);
      setLocalRevs(prev => prev.filter(r => r._id !== deleteTarget._id));
      showToast("Review deleted", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete review", "error");
    } finally { setDeleting(false); }
  };

  const avgRating = localRevs.length
    ? (localRevs.reduce((s, r) => s + r.rating, 0) / localRevs.length).toFixed(1)
    : "—";

  const dist = [5,4,3,2,1].map(s => ({
    star: s,
    count: localRevs.filter(r => r.rating === s).length,
    pct: localRevs.length ? Math.round(localRevs.filter(r => r.rating === s).length / localRevs.length * 100) : 0,
  }));

  return (
    <div className="tab-content space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">{localRevs.length} reviews · {avgRating}★ average</p>
        </div>
        <button onClick={onRefresh} className="p-2.5 border border-gray-200 rounded-full text-gray-500 hover:text-rose-500 hover:border-rose-300 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-5 flex-col lg:flex-row">

        {/* Sidebar */}
        <div className="lg:w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-24">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Rating filter</p>
            <div className="space-y-2">
              {dist.map(({ star, count, pct }) => (
                <button key={star} onClick={() => setRatingFilter(ratingFilter === star ? 0 : star)}
                  className={`w-full flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all text-left ${ratingFilter === star ? "bg-amber-50 ring-1 ring-amber-200" : "hover:bg-gray-50"}`}>
                  <span className="text-xs font-bold text-gray-400 w-3 shrink-0">{star}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 w-5 text-right">{count}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-3xl font-bold text-amber-500" style={{ fontFamily: "'Fraunces', serif" }}>{avgRating}</p>
              <p className="text-xs text-gray-400 mt-1">platform average</p>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by reviewer, listing or content…" />
            <div className="flex gap-1">
              {[0,5,4,3,2,1].map(s => (
                <button key={s} onClick={() => setRatingFilter(ratingFilter === s ? 0 : s)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${ratingFilter === s ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-500"}`}>
                  {s === 0 ? "All" : `${s}★`}
                </button>
              ))}
            </div>
          </div>

          {loading ? <Skeleton rows={5} cols={3} /> : filtered.length === 0 ? (
            <EmptyState icon={Star} title="No reviews found" subtitle="Try adjusting your search or filter" />
          ) : (
            <>
              <div className="space-y-3">
                {paged.map(r => {
                  const listing = r.listing;
                  const user    = r.user;
                  const RATING_COLORS = ["", "text-red-500", "text-orange-400", "text-yellow-500", "text-emerald-500", "text-rose-500"];
                  const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

                  return (
                    <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 transition">
                      <div className="flex gap-4 items-start">
                        <img
                          src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname || "U")}&background=6366f1&color=fff&size=40`}
                          alt={user?.fullname} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900">{user?.fullname || "User"}</p>
                                <div className="flex items-center gap-0.5">
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`} />
                                  ))}
                                </div>
                                <span className={`text-xs font-bold ${RATING_COLORS[r.rating]}`}>{RATING_LABELS[r.rating]}</span>
                              </div>
                              {listing && (
                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                  <Home className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{listing.title}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-gray-400">{fmtRel(r.createdAt)}</span>
                              <button onClick={() => setDeleteTarget(r)}
                                className="p-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed mt-2.5">
                            <Quote className="w-3 h-3 text-gray-300 inline mr-1" />
                            {r.review}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this review?"
        message="This permanently removes the review and recalculates the listing's average rating."
        confirmLabel="Delete review"
        danger
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SETTINGS TAB
════════════════════════════════════════════════════════════════════ */
function SettingsTab({ categories, amenities, loading, onRefresh, showToast }) {
  return (
    <div className="tab-content space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage platform categories and amenities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Categories */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400" /> Categories
            </h3>
            <button onClick={onRefresh} className="p-1.5 text-gray-400 hover:text-rose-500 transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length:4}).map((_,i)=><div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No categories yet</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition">
                  {cat.icon && <span className="text-xl w-7 text-center shrink-0">{cat.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{cat.name}</p>
                    {cat.description && <p className="text-xs text-gray-400 truncate">{cat.description}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                    {cat.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">{categories.length} categories · manage via API</p>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Amenities
            </h3>
            <button onClick={onRefresh} className="p-1.5 text-gray-400 hover:text-rose-500 transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
          ) : amenities.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No amenities yet</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {amenities.map(am => (
                <div key={am._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition">
                  {am.icon && <span className="text-xl w-7 text-center shrink-0">{am.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{am.name}</p>
                    {am.category && <p className="text-xs text-gray-400 capitalize">{am.category}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${am.isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                    {am.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">{amenities.length} amenities · manage via API</p>
          </div>
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Platform Status</p>
            <p className="text-xs text-slate-400">Afno Ghar · Admin Dashboard</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">Operational</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "API Version", value: "v1" },
            { label: "Environment", value: "Production" },
            { label: "Auth", value: "JWT + Cookies" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-400 font-medium">{label}</p>
              <p className="text-sm font-bold text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN ADMIN PANEL
════════════════════════════════════════════════════════════════════ */
export default function AdminPanel() {
  const navigate = useNavigate();

  const [activeTab,    setActiveTab]    = useState("dashboard");
  const [user,         setUser]         = useState(null);
  const [toast,        setToast]        = useState(null);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);

  /* Data */
  const [users,      setUsers]      = useState([]);
  const [listings,   setListings]   = useState([]);
  const [bookings,   setBookings]   = useState([]);
  const [reviews,    setReviews]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [amenities,  setAmenities]  = useState([]);

  /* Loading flags */
  const [loadingUsers,    setLoadingUsers]    = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingReviews,  setLoadingReviews]  = useState(true);
  const [loadingMeta,     setLoadingMeta]     = useState(true);

  const showToast = (msg, type = "info") => setToast({ msg, type });

  /* ── Load current admin user ── */
  useEffect(() => {
    getCurrentUser()
      .then(r => { if (r.data?.data) setUser(r.data.data); })
      .catch(() => {});
  }, []);

  /* ── Loaders ── */
  const loadUsers = useCallback(() => {
    setLoadingUsers(true);
    adminGetAllUsers()
      .then(r => setUsers(r.data?.data || []))
      .catch(() => showToast("Failed to load users", "error"))
      .finally(() => setLoadingUsers(false));
  }, []);

const loadListings = useCallback(() => {
  setLoadingListings(true);
  adminGetAllListings()
    .then(r => {
      // adminGetAllListings returns { listings, total } — unwrap .listings
      const raw = r.data?.data?.listings || r.data?.data || [];
      setListings(raw.map(l => ({
        ...l,
        images: Array.isArray(l.images)
          ? l.images.flatMap(img => img?.includes(",") ? img.split(",") : [img])
          : [],
      })));
    })
    .catch(() => showToast("Failed to load listings", "error"))
    .finally(() => setLoadingListings(false));
}, []);

  /* 
    adminGetAllBookings requires a new backend route: GET /bookings/admin/all
    Fallback: tries getHostBookings or getMyBookings if not available.
    Populate with guest and listing details.
  */
  const loadBookings = useCallback(() => {
    setLoadingBookings(true);
    adminGetAllBookings()
      .then(r => {
        const raw = r.data?.data || [];
        setBookings(Array.isArray(raw) ? raw : raw?.bookings ?? []);
      })
      .catch(() => showToast("Failed to load bookings — check /bookings/admin/all route", "warning"))
      .finally(() => setLoadingBookings(false));
  }, []);

  /*
    adminGetAllReviews requires a new backend route: GET /reviews/admin/all
    Each review should be populated with user + listing.
  */
  const loadReviews = useCallback(() => {
    setLoadingReviews(true);
    adminGetAllReviews()
      .then(r => setReviews(r.data?.data?.reviews || r.data?.data || []))
      .catch(() => showToast("Failed to load reviews — check /reviews/admin/all route", "warning"))
      .finally(() => setLoadingReviews(false));
  }, []);

const loadMeta = useCallback(() => {
  setLoadingMeta(true);
  Promise.allSettled([adminGetCategories(), adminGetAmenities()])
    .then(([catRes, amRes]) => {
      if (catRes.status === "fulfilled") {
        // categories: ApiResponse wraps array in .data.data
        const cats = catRes.value?.data?.data;
        setCategories(Array.isArray(cats) ? cats : []);
      }
      if (amRes.status === "fulfilled") {
        // adminGetAmenities in api.js returns response.data directly (not axios response)
        // so the array is either at .data or at root
        const raw = amRes.value;
        const ams = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw?.data?.data)
              ? raw.data.data
              : [];
        setAmenities(ams);
      }
    })
    .finally(() => setLoadingMeta(false));
}, []);

  useEffect(() => { loadUsers(); loadListings(); loadBookings(); loadReviews(); loadMeta(); }, []);

  /* ── Pending bookings count for badge ── */
  const pendingCount = bookings.filter(b => b.status === "pending").length;

  const navItems = [
    { id: "dashboard", label: "Dashboard",  Icon: LayoutDashboard, badge: null          },
    { id: "users",     label: "Users",       Icon: Users,           badge: users.length  },
    { id: "listings",  label: "Listings",    Icon: Home,            badge: listings.length },
    { id: "bookings",  label: "Bookings",    Icon: Calendar,        badge: pendingCount  },
    { id: "reviews",   label: "Reviews",     Icon: Star,            badge: reviews.length },
    { id: "settings",  label: "Settings",    Icon: Settings,        badge: null          },
  ];

  return (
    <div className="min-h-screen bg-[#f5f4f2]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&display=swap');
        @keyframes slideUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(8px) } to{opacity:1;transform:none} }
        @keyframes scaleIn  { from{opacity:0;transform:scale(.96)      } to{opacity:1;transform:none} }
        .tab-content { animation: fadeUp .25s ease; }
        .nav-btn     { transition: all .15s; }
      `}</style>

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-gray-500 hover:text-rose-500 transition text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm" style={{ fontFamily: "'Fraunces', serif" }}>
                Admin Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <button onClick={() => setActiveTab("bookings")} className="relative p-2 text-gray-500 hover:text-amber-500 transition">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-full border border-rose-100">ADMIN</span>
              <span className="text-sm font-medium text-gray-700">{user?.fullname}</span>
            </div>
            {user && (
              <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname || "A")}&background=f43f5e&color=fff`}
                alt={user.fullname} className="w-8 h-8 rounded-full object-cover border-2 border-rose-100" />
            )}
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-6">

        {/* ── SIDEBAR ── */}
        <aside className="md:w-56 shrink-0">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sticky top-24">
            {/* Admin Badge */}
            <div className="flex flex-col items-center pb-4 border-b border-gray-100 mb-4">
              <div className="relative">
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname || "Admin")}&background=f43f5e&color=fff&size=64`}
                  alt="Admin" className="w-14 h-14 rounded-2xl object-cover border-2 border-rose-100" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white" title="Admin">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <p className="mt-2.5 font-semibold text-gray-900 text-xs text-center" style={{ fontFamily: "'Fraunces', serif" }}>
                {user?.fullname || "Administrator"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{user?.email}</p>
              <span className="mt-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                Super Admin
              </span>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5">
              {navItems.map(({ id, label, Icon, badge }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`nav-btn flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold w-full text-left ${
                    activeTab === id
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      {badge > 999 ? "999+" : badge}
                    </span>
                  )}
                  {activeTab !== id && badge === 0 && <ChevronRight className="w-3 h-3 opacity-20 ml-auto" />}
                </button>
              ))}

              <div className="border-t border-gray-100 mt-2 pt-2">
                <button onClick={handleLogout}
                  className="nav-btn flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold w-full text-left text-red-500 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </nav>

            {/* Platform health */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-400 font-medium">Platform operational</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-w-0">
          {activeTab === "dashboard" && (
            <DashboardTab
              stats={{}}
              users={users}
              listings={listings}
              bookings={bookings}
              navigate={navigate}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "users" && (
            <UsersTab
              users={users}
              loading={loadingUsers}
              onRefresh={loadUsers}
              showToast={showToast}
            />
          )}
          {activeTab === "listings" && (
            <ListingsTab
              listings={listings}
              loading={loadingListings}
              onRefresh={loadListings}
              navigate={navigate}
              showToast={showToast}
            />
          )}
          {activeTab === "bookings" && (
            <BookingsTab
              bookings={bookings}
              loading={loadingBookings}
              onRefresh={loadBookings}
              showToast={showToast}
            />
          )}
          {activeTab === "reviews" && (
            <ReviewsTab
              reviews={reviews}
              loading={loadingReviews}
              onRefresh={loadReviews}
              showToast={showToast}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              categories={categories}
              amenities={amenities}
              loading={loadingMeta}
              onRefresh={loadMeta}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
