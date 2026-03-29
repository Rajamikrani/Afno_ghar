import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { handleLogout } from "../utils/logout";
import {
  User, Calendar, Star, Lock, LogOut, ChevronRight,
  MapPin, Clock, CheckCircle, XCircle, AlertCircle,
  Camera, Eye, EyeOff, X, Upload, Bed, Bath, Users,
  ArrowLeft, Edit2, Trash2, Send, Home, Heart, Search,
  Quote, RefreshCw, Award, MessageSquare, Pencil, ChevronDown,
  Info
} from "lucide-react";

import {
  getCurrentUser, logoutUser, updateUserDetails, updateUserAvatar,
  changePassword, getMyBookings, cancelBooking, getMyWishlist,
  toggleWishlistItem, createReview, deleteReview,
  fetchListingReviews,
} from "../service/api";

/* ══════════════════════════════════════════════════════════════════
   SHARED HELPERS
══════════════════════════════════════════════════════════════════ */
const RATING_META = [
  null,
  { label: "Poor",      emoji: "😞", color: "#ef4444", bg: "#fef2f2" },
  { label: "Fair",      emoji: "😐", color: "#f97316", bg: "#fff7ed" },
  { label: "Good",      emoji: "🙂", color: "#eab308", bg: "#fefce8" },
  { label: "Very Good", emoji: "😊", color: "#22c55e", bg: "#f0fdf4" },
  { label: "Excellent", emoji: "🤩", color: "#f43f5e", bg: "#fff1f2" },
];

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtRel = (d) => {
  const days = Math.floor((Date.now() - new Date(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const map = {
    pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200",       Icon: Clock       },
    confirmed: { label: "Confirmed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle },
    cancelled: { label: "Cancelled", cls: "bg-red-50 text-red-600 border-red-200",             Icon: XCircle     },
    rejected:  { label: "Rejected",  cls: "bg-gray-50 text-gray-600 border-gray-200",          Icon: AlertCircle },
  };
  const { label, cls, Icon } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
};

/* ── Interactive star picker ── */
function StarPicker({ value, onChange, size = 32 }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            className="transition-transform hover:scale-110 focus:outline-none cursor-pointer">
            <Star
              style={{ width: size, height: size }}
              className={`transition-colors ${n <= active ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
            />
          </button>
        ))}
      </div>
      {active > 0 && (
        <span className="text-sm font-bold transition-all" style={{ color: RATING_META[active]?.color }}>
          {RATING_META[active]?.emoji} {RATING_META[active]?.label}
        </span>
      )}
    </div>
  );
}

/* ── Read-only star row ── */
const StarRow = ({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} style={{ width: size, height: size }}
        className={s <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"} />
    ))}
  </div>
);

/* ── Toast ── */
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: "bg-emerald-600", error: "bg-red-600", info: "bg-rose-500" };
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl ${colors[type] || colors.info}`}
      style={{ animation: "slideUp 0.3s ease" }}>
      {msg}
      <button onClick={onClose}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
    </div>
  );
};

/* ── Password field ── */
function PasswordField({ label, field, value, show, onToggleShow, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        <button type="button" onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN GUEST PANEL
══════════════════════════════════════════════════════════════════ */
export default function GuestPanel() {
  const navigate = useNavigate();

  const [activeTab,       setActiveTab]       = useState("bookings");
  const [user,            setUser]            = useState(null);
  const [bookings,        setBookings]        = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingFilter,   setBookingFilter]   = useState("all");
  const [wishlist,        setWishlist]        = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [toast,           setToast]           = useState(null);
  const [bookingSearch,   setBookingSearch]   = useState("");

  const showToast = (msg, type = "info") => setToast({ msg, type });

  useEffect(() => {
    getCurrentUser().then((res) => { if (res.data?.data) setUser(res.data.data); }).catch(() => {});
  }, []);

  const loadBookings = () => {
    setLoadingBookings(true);
    getMyBookings()
      .then((res) => {
        const data = res.data?.data;
        const list = Array.isArray(data) ? data : data?.booking ?? [];
        setBookings(list);
        setLoadingBookings(false);
      })
      .catch(() => setLoadingBookings(false));
  };
  useEffect(loadBookings, []);

  const loadWishlist = () => {
    setLoadingWishlist(true);
    getMyWishlist()
      .then((res) => {
        const raw = res.data?.data?.listings || [];
        setWishlist(raw.map((l) => ({
          ...l,
          images: Array.isArray(l.images)
            ? l.images.flatMap((img) => (img.includes(",") ? img.split(",") : [img])) : [],
        })));
        setLoadingWishlist(false);
      })
      .catch(() => setLoadingWishlist(false));
  };
  useEffect(loadWishlist, []);

  const removeFromWishlist = async (listingId) => {
    try {
      await toggleWishlistItem(listingId);
      showToast("Removed from wishlist", "success");
      setWishlist((prev) => prev.filter((l) => l._id !== listingId));
    } catch { showToast("Failed to remove", "error"); }
  };

  const handleCancelBooking = async (id) => {
    try {
      await cancelBooking(id);
      showToast("Booking cancelled successfully", "success");
      loadBookings();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to cancel", "error");
    }
  };

  const filteredBookings = bookings
    .filter((b) => bookingFilter === "all" || b.status === bookingFilter)
    .filter((b) => {
      if (!bookingSearch.trim()) return true;
      const q = bookingSearch.toLowerCase();
      return (
        (b.listing?.title?.toLowerCase() || "").includes(q) ||
        (b.listing?.location?.city?.toLowerCase() || "").includes(q) ||
        (b.listing?.location?.country?.toLowerCase() || "").includes(q) ||
        (b.status?.toLowerCase() || "").includes(q)
      );
    });

  const navItems = [
    { id: "bookings", label: "My Bookings", Icon: Calendar },
    { id: "wishlist", label: "Wishlist",    Icon: Heart    },
    { id: "reviews",  label: "Reviews",     Icon: Star     },
    { id: "profile",  label: "Profile",     Icon: User     },
    { id: "security", label: "Security",    Icon: Lock     },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px) } to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.97)     } to{opacity:1;transform:scale(1)     } }
        .tab-content   { animation: fadeIn 0.25s ease; }
        .booking-card  { transition: box-shadow 0.2s, transform 0.2s; }
        .booking-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,.10); transform: translateY(-2px); }
        .review-card   { transition: box-shadow 0.2s, transform 0.15s; }
        .review-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,.08); transform: translateY(-1px); }
        .nav-btn { transition: all 0.15s; }
        .star-form { animation: scaleIn 0.2s ease; }
      `}</style>

      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-gray-500 hover:text-rose-500 transition text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
            <span className="text-gray-200">|</span>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-bold text-rose-500" style={{ fontFamily: "'Fraunces', serif", letterSpacing: "-0.03em" }}>
              Afno Ghar
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname)}&background=f43f5e&color=fff`}
                alt={user.fullname}
                className="w-9 h-9 rounded-full object-cover border-2 border-rose-100"
              />
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.fullname}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-8">

        {/* Sidebar */}
        <aside className="md:w-64 shrink-0">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sticky top-24">
            <div className="flex flex-col items-center pb-5 border-b border-gray-100 mb-5">
              <div className="relative">
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=Guest&background=f43f5e&color=fff&size=80`}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover border-4 border-rose-100"
                />
                <button onClick={() => setActiveTab("profile")}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition shadow-lg">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="mt-3 font-semibold text-gray-900 text-sm" style={{ fontFamily: "'Fraunces', serif" }}>
                {user?.fullname || "Guest"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
              <span className="mt-2 px-3 py-0.5 bg-rose-50 text-rose-600 text-xs font-semibold rounded-full capitalize">
                {user?.role || "guest"}
              </span>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`nav-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left ${
                    activeTab === id ? "bg-rose-500 text-white shadow-md shadow-rose-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                  {activeTab !== id && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-30" />}
                </button>
              ))}
              <div className="border-t border-gray-100 mt-3 pt-3">
             <button onClick={() => handleLogout(navigate)}
                  className="nav-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left text-red-500 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">

          {/* BOOKINGS TAB */}
          {activeTab === "bookings" && (
            <div className="tab-content">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>My Bookings</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{bookings.length} total reservation{bookings.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex gap-2 bg-white border border-gray-200 rounded-full p-1">
                  {["all", "pending", "confirmed", "cancelled"].map((f) => (
                    <button key={f} onClick={() => setBookingFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition capitalize ${
                        bookingFilter === f ? "bg-rose-500 text-white shadow" : "text-gray-500 hover:text-gray-800"
                      }`}>{f}</button>
                  ))}
                </div>
              </div>

              <div className="relative mb-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)}
                  placeholder="Search by listing name, city, country or status…"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition shadow-sm"
                />
                {bookingSearch && (
                  <button onClick={() => setBookingSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {loadingBookings ? (
                <div className="grid gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 animate-pulse flex gap-4">
                      <div className="w-28 h-24 bg-gray-200 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">
                    {bookingSearch.trim() ? `No bookings found for "${bookingSearch}"` : `No ${bookingFilter !== "all" ? bookingFilter : ""} bookings found`}
                  </p>
                  {bookingSearch.trim() ? (
                    <button onClick={() => setBookingSearch("")} className="mt-4 px-5 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold hover:bg-gray-200 transition">
                      Clear search
                    </button>
                  ) : (
                    <button onClick={() => navigate("/")} className="mt-4 px-5 py-2 bg-rose-500 text-white rounded-full text-sm font-semibold hover:bg-rose-600 transition">
                      Browse listings
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredBookings.map((booking) => (
                    <BookingCard key={booking._id} booking={booking}
                      onCancel={handleCancelBooking}
                      onReview={() => setActiveTab("reviews")}
                      navigate={navigate} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "wishlist" && (
            <WishlistTab wishlist={wishlist} loading={loadingWishlist} onRemove={removeFromWishlist} navigate={navigate} />
          )}

          {activeTab === "reviews" && (
            <ReviewsTab bookings={bookings} user={user} showToast={showToast} />
          )}

          {activeTab === "profile" && (
            <ProfileTab user={user}
              onUpdate={(updated) => { setUser((prev) => ({ ...prev, ...updated })); showToast("Profile updated successfully", "success"); }}
              showToast={showToast} />
          )}

          {activeTab === "security" && <SecurityTab showToast={showToast} />}
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WISHLIST TAB
══════════════════════════════════════════════════════════════════ */
function WishlistTab({ wishlist, loading, onRemove, navigate }) {
  const [removingId, setRemovingId] = useState(null);
  const handleRemove = async (id) => { setRemovingId(id); await onRemove(id); setRemovingId(null); };

  return (
    <div className="tab-content">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Wishlist</h1>
          <p className="text-sm text-gray-500 mt-0.5">{wishlist.length} saved {wishlist.length === 1 ? "listing" : "listings"}</p>
        </div>
        <button onClick={() => navigate("/")} className="px-4 py-2 text-sm font-semibold rounded-full border border-rose-200 text-rose-500 hover:bg-rose-50 transition flex items-center gap-2">
          <Home className="w-4 h-4" /> Browse more
        </button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
          <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-base">Your wishlist is empty</p>
          <p className="text-gray-400 text-sm mt-1">Save listings you love by tapping the heart icon</p>
          <button onClick={() => navigate("/")} className="mt-5 px-6 py-2.5 bg-rose-500 text-white rounded-full text-sm font-semibold hover:bg-rose-600 transition">
            Explore listings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {wishlist.map((listing) => (
            <WishlistCard key={listing._id} listing={listing}
              removing={removingId === listing._id}
              onRemove={() => handleRemove(listing._id)}
              onView={() => navigate(`/listing/${listing._id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistCard({ listing, removing, onRemove, onView }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = listing.images || [];
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      style={{ transition: "box-shadow 0.2s, transform 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,.10)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {images.length > 0
          ? <img src={images[imgIdx]} alt={listing.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center"><Home className="w-10 h-10 text-gray-300" /></div>}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.slice(0, 5).map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? "bg-white scale-125" : "bg-white/50"}`} />
            ))}
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} disabled={removing}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition-all ${removing ? "bg-gray-100 opacity-60 cursor-not-allowed" : "bg-white hover:bg-rose-50"}`}>
          {removing
            ? <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
            : <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />}
        </button>
        {listing.isGuestFavourite && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-rose-500 rounded-full shadow-sm border border-rose-100">
            Guest Favourite
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate text-sm leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>{listing.title}</h3>
            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><MapPin className="w-3 h-3 shrink-0" />{listing.location?.city}, {listing.location?.country}</p>
          </div>
          {listing.averageRating > 0 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Star className="w-3.5 h-3.5 fill-gray-900 text-gray-900" />
              <span className="text-xs font-semibold text-gray-900">{listing.averageRating?.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users className="w-3 h-3 text-rose-300" />{listing.maxGuests} guests</span>
          <span className="flex items-center gap-1"><Bed className="w-3 h-3 text-rose-300" />{listing.bedrooms} bed</span>
          <span className="flex items-center gap-1"><Bath className="w-3 h-3 text-rose-300" />{listing.bathrooms} bath</span>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div>
            <span className="text-gray-900 font-bold text-sm">${listing.price}</span>
            <span className="text-gray-400 text-xs ml-1">/ night</span>
          </div>
          <button onClick={onView} className="px-3.5 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded-full hover:bg-rose-600 transition shadow-sm shadow-rose-200">
            View listing
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BOOKING CARD
══════════════════════════════════════════════════════════════════ */
function BookingCard({ booking, onCancel, onReview, navigate }) {
  const [showCancel, setShowCancel] = useState(false);
  const listing  = booking.listing;
  const images   = Array.isArray(listing?.images)
    ? listing.images.flatMap((img) => (img.includes(",") ? img.split(",") : [img])) : [];
  const checkIn  = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const nights   = Math.round((checkOut - checkIn) / 86400000);
  const isPast   = checkOut < new Date();
  const canReview = isPast && booking.status === "confirmed";
  const canCancel = (booking.status === "pending" || booking.status === "confirmed") && !isPast;
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="booking-card bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-36 h-40 sm:h-auto shrink-0 bg-gray-100">
          {images[0]
            ? <img src={images[0]} alt={listing?.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Home className="w-8 h-8 text-gray-300" /></div>}
        </div>
        <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate text-base leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                  {listing?.title || "Listing Removed"}
                </h3>
                {listing?.location && (
                  <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <MapPin className="w-3 h-3" />{listing.location.city}, {listing.location.country}
                  </p>
                )}
              </div>
              <StatusBadge status={booking.status} />
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-rose-400" /><span>{fmt(checkIn)} → {fmt(checkOut)}</span></div>
              <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-rose-400" /><span>{nights} night{nights !== 1 ? "s" : ""}</span></div>
            </div>
            {listing && (
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{listing.maxGuests} guests</span>
                <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{listing.bedrooms} bed</span>
                <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{listing.bathrooms} bath</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 gap-3 flex-wrap">
            <p className="text-gray-900 font-bold text-base">
              ${booking.totalPrice?.toFixed(2)}
              <span className="text-xs text-gray-400 font-normal ml-1">total</span>
            </p>
            <div className="flex gap-2 flex-wrap items-center">
              {listing && (
                <button onClick={() => navigate(`/listing/${listing._id}`)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-700 hover:border-rose-300 hover:text-rose-500 transition">
                  View listing
                </button>
              )}
              {canReview && (
                <button onClick={onReview}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1">
                  <Star className="w-3 h-3" /> Write a review
                </button>
              )}
              {canCancel && (
                showCancel ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500 font-medium">Sure?</span>
                    <button onClick={() => { setShowCancel(false); onCancel(booking._id); }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full bg-red-500 text-white hover:bg-red-600 transition">Yes</button>
                    <button onClick={() => setShowCancel(false)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-gray-400 transition">No</button>
                  </div>
                ) : (
                  <button onClick={() => setShowCancel(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition">
                    Cancel
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REVIEWS TAB
   ─────────────────────────────────────────────────────────────────
   KEY FIXES:
   1. Always calls createReview (upsert) for both create AND edit.
      The backend handles the update-if-exists logic, so we never
      need to call updateReview separately.
   2. User ID matching uses a robust normalise() helper that trims
      and lowercases both sides — prevents "undefined === undefined"
      false positives and mismatches from ObjectId vs string.
   3. On mount, reviews are fetched for ALL reviewable listings in a
      single pass using Promise.allSettled, not forEach+async which
      silently swallowed errors.
   4. After any write (create/edit) we re-fetch the listing's reviews
      to get the real persisted review object back (with correct _id).
══════════════════════════════════════════════════════════════════ */
function ReviewsTab({ bookings, user, showToast }) {
  /* eligible bookings: confirmed + checkout in the past */
  const reviewableBookings = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.checkOut) < new Date()
  );

  /* per-listing review state: { [listingId]: reviewObject | null | undefined }
     undefined  = not yet loaded
     null       = loaded, no review found
     object     = loaded, review found                                         */
  const [myReviews,  setMyReviews]  = useState({});
  const [loadingIds, setLoadingIds] = useState({});

  /* form state */
  const [formListingId,    setFormListingId]    = useState(null);
  const [editingReviewId,  setEditingReviewId]  = useState(null);
  const [rating,           setRating]           = useState(0);
  const [reviewText,       setReviewText]       = useState("");
  const [submitting,       setSubmitting]       = useState(false);

  /* delete confirm */
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting,      setDeleting]      = useState(null);

  /* ── Normalise a user id to a comparable string ── */
  const normaliseId = (v) => String(v?._id || v?.id || v || "").trim().toLowerCase();

  /* ── Fetch reviews for a single listing, mark mine ── */
  const fetchReviewsForListing = async (lid) => {
    setLoadingIds((p) => ({ ...p, [lid]: true }));
    try {
      const res     = await fetchListingReviews(lid, 1, 100);
      const allRevs = res.data?.data?.reviews || [];
      const uid     = normaliseId(user?._id || user?.id || user);
      const mine    = uid
        ? allRevs.find((r) => normaliseId(r.user?._id || r.user?.id || r.user) === uid)
        : undefined;
      setMyReviews((p) => ({ ...p, [lid]: mine || null }));
    } catch {
      setMyReviews((p) => ({ ...p, [lid]: null }));
    } finally {
      setLoadingIds((p) => ({ ...p, [lid]: false }));
    }
  };

  /* ── Load reviews for all reviewable listings on mount / when bookings change ── */
  useEffect(() => {
    if (!user || reviewableBookings.length === 0) return;
    const unloaded = reviewableBookings.filter(
      (b) => b.listing?._id && myReviews[b.listing._id] === undefined
    );
    if (!unloaded.length) return;
    // Mark all as loading first so UI shows spinners immediately
    const loadingPatch = {};
    unloaded.forEach((b) => { loadingPatch[b.listing._id] = true; });
    setLoadingIds((p) => ({ ...p, ...loadingPatch }));
    // Fetch all in parallel
    Promise.allSettled(
      unloaded.map((b) => fetchReviewsForListing(b.listing._id))
    );
  }, [reviewableBookings.length, user?._id]);

  const openForm = (listingId, existingReview) => {
    setFormListingId(listingId);
    if (existingReview) {
      setEditingReviewId(existingReview._id);
      setRating(existingReview.rating || 0);
      setReviewText(existingReview.review || "");
    } else {
      setEditingReviewId(null);
      setRating(0);
      setReviewText("");
    }
  };

  const closeForm = () => {
    setFormListingId(null);
    setEditingReviewId(null);
    setRating(0);
    setReviewText("");
  };

  /* ── Submit: always uses createReview (upsert on backend) ── */
  const submitReview = async (listingId) => {
    if (!rating) { showToast("Please pick a star rating", "error"); return; }
    if (reviewText.trim().length < 10) { showToast("Review needs at least 10 characters", "error"); return; }
    setSubmitting(true);
    try {
      await createReview(listingId, { rating, review: reviewText.trim() });
      showToast(editingReviewId ? "Review updated! ✨" : "Review published! 🎉", "success");
      closeForm();
      // Re-fetch to get the authoritative persisted review object back
      await fetchReviewsForListing(listingId);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to submit review", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { reviewId, listingId } = confirmDelete;
    setDeleting(reviewId);
    try {
      await deleteReview(reviewId);
      showToast("Review deleted", "success");
      setMyReviews((p) => ({ ...p, [listingId]: null }));
      setConfirmDelete(null);
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setDeleting(null);
    }
  };

  const charOk = reviewText.trim().length >= 10;

  /* ── Empty state ── */
  if (reviewableBookings.length === 0) {
    return (
      <div className="tab-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Reviews & Ratings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Share your experience for completed stays</p>
        </div>
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Star className="w-8 h-8 text-amber-300" />
          </div>
          <p className="text-gray-600 font-semibold text-base">No completed stays to review yet</p>
          <p className="text-gray-400 text-sm mt-1">After a confirmed stay, you can leave a review here</p>
        </div>
      </div>
    );
  }

  const writtenCount = Object.values(myReviews).filter(Boolean).length;

  return (
    <div className="tab-content">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Reviews & Ratings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {reviewableBookings.length} completed stay{reviewableBookings.length !== 1 ? "s" : ""} eligible for review
        </p>
      </div>

      {/* Stats strip */}
      {writtenCount > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Reviews written",
              value: writtenCount,
              icon: <MessageSquare className="w-5 h-5 text-rose-400" />,
              bg: "bg-rose-50",
            },
            {
              label: "Avg. rating given",
              value: (() => {
                const all = Object.values(myReviews).filter(Boolean);
                if (!all.length) return "—";
                return (all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1);
              })(),
              icon: <Star className="w-5 h-5 text-amber-400" />,
              bg: "bg-amber-50",
            },
            {
              label: "Stays reviewed",
              value: `${writtenCount} / ${reviewableBookings.length}`,
              icon: <Award className="w-5 h-5 text-emerald-400" />,
              bg: "bg-emerald-50",
            },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 flex items-center gap-3 border border-white/80`}>
              <div className="shrink-0">{icon}</div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review cards */}
      <div className="grid gap-5">
        {reviewableBookings.map((booking) => {
          const listing    = booking.listing;
          const lid        = listing?._id;
          const images     = Array.isArray(listing?.images)
            ? listing.images.flatMap((i) => (i.includes(",") ? i.split(",") : [i])) : [];
          const existing   = myReviews[lid];            // undefined | null | object
          const isLoading  = loadingIds[lid] || existing === undefined;
          const isFormOpen = formListingId === lid;
          const checkIn    = new Date(booking.checkIn);
          const checkOut   = new Date(booking.checkOut);
          const stayNights = Math.round((checkOut - checkIn) / 86400000);
          const meta       = existing ? RATING_META[existing.rating] : null;

          return (
            <div key={booking._id} className="review-card bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* ── Listing summary row ── */}
              <div className="flex gap-4 p-5">

                {/* Thumbnail */}
                <div className="shrink-0 relative">
                  <img
                    src={images[0] || `https://ui-avatars.com/api/?name=Home&background=fce7f3&color=f43f5e&size=80`}
                    alt={listing?.title}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                  {existing && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
                        {listing?.title}
                      </h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {listing?.location?.city}, {listing?.location?.country}
                      </p>
                    </div>

                    {/* Badge */}
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin shrink-0 mt-1" />
                    ) : existing ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> Reviewed
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Star className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>

                  {/* Stay dates */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-rose-300" />
                      {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-300" />
                      {stayNights} night{stayNights !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Existing review preview */}
                  {!isLoading && existing && !isFormOpen && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <StarRow rating={existing.rating} size={14} />
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: meta?.bg, color: meta?.color }}>
                            {meta?.emoji} {meta?.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{fmtRel(existing.createdAt)}</span>
                      </div>
                      {existing.review && (
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                          <Quote className="w-3 h-3 text-gray-300 inline mr-1" />
                          {existing.review}
                        </p>
                      )}
                      {/* Edit / Delete */}
                      <div className="flex gap-2 mt-2.5">
                        <button onClick={() => openForm(lid, existing)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 transition px-2.5 py-1 bg-white rounded-lg border border-rose-100 hover:border-rose-300">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => setConfirmDelete({ reviewId: existing._id, listingId: lid })}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-600 transition px-2.5 py-1 bg-white rounded-lg border border-red-100 hover:border-red-300">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CTA if not reviewed yet */}
                  {!isLoading && !existing && !isFormOpen && (
                    <button onClick={() => openForm(lid, null)}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-bold rounded-full hover:from-amber-600 hover:to-rose-600 shadow-sm shadow-amber-200 transition-all active:scale-[.97]">
                      <Star className="w-3.5 h-3.5 fill-white" />
                      Leave a review
                    </button>
                  )}
                </div>
              </div>

              {/* ── Inline review form ── */}
              {isFormOpen && (
                <div className="star-form border-t border-gray-100 px-5 pb-6 pt-5 bg-gradient-to-br from-rose-50/60 via-white to-amber-50/40">

                  {/* Form header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname || "You")}&background=f43f5e&color=fff&size=40`}
                        alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                      <div>
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.fullname || "You"}</p>
                        <p className="text-[10px] text-gray-400">{editingReviewId ? "Updating review" : "Writing a review"}</p>
                      </div>
                    </div>
                    <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Upsert notice when editing */}
                  {editingReviewId && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4 text-xs text-blue-700">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Submitting will <strong>update</strong> your existing review.</span>
                    </div>
                  )}

                  {/* Star picker */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Your rating *</p>
                    <StarPicker value={rating} onChange={setRating} size={30} />
                  </div>

                  {/* Text area */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Your review *</p>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="What made this stay special? How was the host? Any tips for future guests?"
                      rows={4}
                      maxLength={1000}
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none bg-white transition leading-relaxed placeholder-gray-300"
                    />
                    <div className="flex justify-between mt-1">
                      <p className={`text-xs font-medium transition-colors ${reviewText.length > 0 && !charOk ? "text-rose-400" : "text-gray-400"}`}>
                        {reviewText.length > 0 && !charOk
                          ? `${10 - reviewText.trim().length} more character${10 - reviewText.trim().length !== 1 ? "s" : ""} needed`
                          : "Min. 10 characters"}
                      </p>
                      <p className={`text-xs font-medium ${reviewText.length > 900 ? "text-amber-500" : "text-gray-300"}`}>
                        {reviewText.length}/1000
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2.5">
                    <button onClick={() => submitReview(lid)}
                      disabled={submitting || !rating || !charOk}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-sm font-bold rounded-xl
                        hover:from-rose-600 hover:to-rose-700 disabled:opacity-40 disabled:cursor-not-allowed
                        shadow-lg shadow-rose-100 transition-all active:scale-[.98]">
                      {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      {submitting ? "Saving…" : editingReviewId ? "Update Review" : "Publish Review"}
                    </button>
                    <button onClick={closeForm}
                      className="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Delete confirm modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full z-10 space-y-4" style={{ animation: "scaleIn 0.2s ease" }}>
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900">Delete this review?</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">Your review will be permanently removed and future guests won't see your experience.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={!!deleting}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                Keep it
              </button>
              <button onClick={handleDelete} disabled={!!deleting}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROFILE TAB
══════════════════════════════════════════════════════════════════ */
function ProfileTab({ user, onUpdate, showToast }) {
  const [form,            setForm]            = useState({ fullname: "", email: "", bio: "" });
  const [avatarFile,      setAvatarFile]      = useState(null);
  const [avatarPreview,   setAvatarPreview]   = useState(null);
  const [saving,          setSaving]          = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (user) setForm({ fullname: user.fullname || "", email: user.email || "", bio: user.bio || "" });
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append("avatar", avatarFile);
    try {
      const res = await updateUserAvatar(fd);
      const newAvatar = res.data?.data?.avatar || res.data?.data?.user?.avatar || res.data?.avatar;
      if (newAvatar) { onUpdate({ avatar: newAvatar }); }
      else {
        const userRes = await getCurrentUser();
        const freshAvatar = userRes.data?.data?.avatar;
        if (freshAvatar) onUpdate({ avatar: freshAvatar });
      }
      showToast("Avatar updated!", "success");
      setAvatarFile(null); setAvatarPreview(null);
    } catch (err) { showToast(err?.response?.data?.message || "Upload failed", "error"); }
    finally { setUploadingAvatar(false); }
  };

  const saveProfile = async () => {
    if (!form.fullname || !form.email) { showToast("Name and email are required", "error"); return; }
    setSaving(true);
    try { await updateUserDetails(form); onUpdate(form); }
    catch (err) { showToast(err?.response?.data?.message || "Update failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="tab-content space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Your Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-rose-400" /> Profile Photo
        </h2>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="relative">
            <img
              src={avatarPreview || user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname || "G")}&background=f43f5e&color=fff&size=100`}
              alt="avatar" className="w-24 h-24 rounded-2xl object-cover border-2 border-rose-100 shadow-sm"
            />
            {avatarPreview && <span className="absolute top-1 right-1 bg-emerald-400 w-3 h-3 rounded-full border-2 border-white" />}
          </div>
          <div>
            <input type="file" ref={fileRef} accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => fileRef.current.click()}
                className="px-4 py-2 text-sm font-semibold rounded-full border border-gray-200 text-gray-700 hover:border-rose-300 hover:text-rose-500 transition flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" /> Choose photo
              </button>
              {avatarPreview && (
                <button onClick={uploadAvatar} disabled={uploadingAvatar}
                  className="px-4 py-2 text-sm font-semibold rounded-full bg-rose-500 text-white hover:bg-rose-600 transition disabled:opacity-50">
                  {uploadingAvatar ? "Uploading…" : "Save photo"}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG. Max 5MB.</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-rose-400" /> Personal Information
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full name</label>
            <input value={form.fullname} onChange={(e) => setForm((p) => ({ ...p, fullname: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email address</label>
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Bio</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell hosts a little about yourself…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition resize-none" />
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving}
          className="mt-5 px-6 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECURITY TAB
══════════════════════════════════════════════════════════════════ */
function SecurityTab({ showToast }) {
  const [form,     setForm]     = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [show,     setShow]     = useState({ old: false, new: false, confirm: false });
  const [saving,   setSaving]   = useState(false);
  const [strength, setStrength] = useState(0);

  const calcStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const handleChange = (field, val) => {
    setForm((p) => ({ ...p, [field]: val }));
    if (field === "newPassword") setStrength(calcStrength(val));
  };

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-500"];

  const handleSubmit = async () => {
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) { showToast("All fields are required", "error"); return; }
    if (form.newPassword !== form.confirmPassword) { showToast("Passwords do not match", "error"); return; }
    if (strength < 2) { showToast("Password is too weak", "error"); return; }
    setSaving(true);
    try {
      await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword, confirmPassword: form.confirmPassword });
      showToast("Password changed successfully!", "success");
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setStrength(0);
    } catch (err) { showToast(err?.response?.data?.message || "Failed to change password", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="tab-content space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Security</h1>
        <p className="text-sm text-gray-500 mt-0.5">Keep your account safe</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-400" /> Change Password
        </h2>
        <div className="space-y-4 max-w-md">
          <PasswordField label="Current Password" field="oldPassword" value={form.oldPassword}
            show={show.old} onToggleShow={() => setShow((p) => ({ ...p, old: !p.old }))} onChange={handleChange} />
          <PasswordField label="New Password" field="newPassword" value={form.newPassword}
            show={show.new} onToggleShow={() => setShow((p) => ({ ...p, new: !p.new }))} onChange={handleChange} />
          {form.newPassword && (
            <div>
              <div className="flex gap-1 mb-1">
                {[1,2,3,4].map((n) => (
                  <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${n <= strength ? strengthColor[strength] : "bg-gray-100"}`} />
                ))}
              </div>
              <p className={`text-xs font-medium ${strength <= 1 ? "text-red-400" : strength === 2 ? "text-amber-500" : strength === 3 ? "text-blue-500" : "text-emerald-600"}`}>
                {strengthLabel[strength]}
              </p>
            </div>
          )}
          <PasswordField label="Confirm New Password" field="confirmPassword" value={form.confirmPassword}
            show={show.confirm} onToggleShow={() => setShow((p) => ({ ...p, confirm: !p.confirm }))} onChange={handleChange} />
          {form.confirmPassword && (
            <p className={`text-xs font-medium flex items-center gap-1 ${form.newPassword === form.confirmPassword ? "text-emerald-600" : "text-red-400"}`}>
              {form.newPassword === form.confirmPassword
                ? <><CheckCircle className="w-3.5 h-3.5" /> Passwords match</>
                : <><XCircle className="w-3.5 h-3.5" /> Passwords don't match</>}
            </p>
          )}
          <div className="pt-2">
            <button onClick={handleSubmit} disabled={saving}
              className="px-6 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition disabled:opacity-50">
              {saving ? "Changing…" : "Change password"}
            </button>
          </div>
        </div>
      </div>
      <div className="bg-rose-50 rounded-2xl border border-rose-100 p-5">
        <h3 className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Password tips
        </h3>
        <ul className="text-xs text-rose-600 space-y-1">
          <li>• Use at least 8 characters</li>
          <li>• Include uppercase letters and numbers</li>
          <li>• Add special characters (!@#$) for extra strength</li>
          <li>• Avoid reusing passwords from other sites</li>
        </ul>
      </div>
    </div>
  );
}