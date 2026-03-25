import { useState, useEffect, useCallback, useRef } from "react";

/*
  HostPanel.jsx — Full-featured host dashboard
  Theme: matches GuestPanel exactly (light bg, rose-500 accents, Fraunces + DM Sans)

  To wire up real APIs, swap MockAPI methods with your imports:
    import { getCurrentUser, getBookingStats, getMyListings, getMyBookings,
             getReviews, updateBookingStatus, cancelBooking, deleteListing,
             createListing, updateListing, fetchCategories, fetchAmenities,
             getCurrentUser, updateUserDetails, updateUserAvatar,
             changePassword, logoutUser } from "../service/api";
    import { useNavigate } from "react-router-dom";
*/

// ─── Mock API ─────────────────────────────────────────────────────────────────
const delay = (d, ms = 650) => new Promise((r) => setTimeout(() => r({ data: { data: d } }), ms));

const MockAPI = {
  getCurrentUser: () => delay({
    _id: "u1", fullname: "Sarah Mitchell", email: "sarah@afnoghar.co",
    username: "sarah_m", bio: "Passionate Superhost with 3 properties. Love connecting travellers with unique stays.",
    avatar: "https://i.pravatar.cc/120?img=5", role: "host",
    address: { city: "London", country: "UK" },
  }),
  getBookingStats: () => delay({
    totalBookings: 24, upcomingBookings: 7, totalRevenue: 184320,
    statusBreakdown: [
      { _id: "confirmed", count: 12, totalRevenue: 142400 },
      { _id: "pending",   count: 5,  totalRevenue: 28500  },
      { _id: "cancelled", count: 4,  totalRevenue: 0      },
      { _id: "rejected",  count: 3,  totalRevenue: 0      },
    ],
  }),
  getMyListings: () => delay([
    { _id:"l1", title:"Cliffside Villa Retreat", location:{city:"Santorini",country:"Greece"}, price:420, images:["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600"], maxGuests:6, bedrooms:3, beds:4, bathrooms:2, averageRating:4.9, numberOfRatings:38, isActive:true,  category:{name:"Villa"},  amenities:[{name:"WiFi"},{name:"Pool"},{name:"Kitchen"}] },
    { _id:"l2", title:"Forest Treehouse Cabin",  location:{city:"Asheville", country:"USA"},   price:195, images:["https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=600"], maxGuests:2, bedrooms:1, beds:1, bathrooms:1, averageRating:4.7, numberOfRatings:61, isActive:true,  category:{name:"Cabin"},  amenities:[{name:"WiFi"},{name:"Fireplace"}] },
    { _id:"l3", title:"Downtown Loft Studio",    location:{city:"New York",  country:"USA"},   price:280, images:["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600"], maxGuests:3, bedrooms:1, beds:2, bathrooms:1, averageRating:4.5, numberOfRatings:22, isActive:false, category:{name:"Studio"}, amenities:[{name:"WiFi"},{name:"Gym"}] },
  ]),
  getMyBookings: () => delay([
    { _id:"b1", listing:{_id:"l1",title:"Cliffside Villa Retreat", images:["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=120"]}, user:{fullname:"Emma Laurent", avatar:"https://i.pravatar.cc/48?img=47",email:"emma@email.com"  }, checkIn:"2026-03-10",checkOut:"2026-03-15",totalPrice:2100,guests:{adults:4,children:0,infants:0},status:"pending"   },
    { _id:"b2", listing:{_id:"l2",title:"Forest Treehouse Cabin",  images:["https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=120"]}, user:{fullname:"Marcus Webb",  avatar:"https://i.pravatar.cc/48?img=12",email:"marcus@email.com"},checkIn:"2026-02-28",checkOut:"2026-03-03",totalPrice:585, guests:{adults:2,children:0,infants:0},status:"confirmed" },
    { _id:"b3", listing:{_id:"l1",title:"Cliffside Villa Retreat", images:["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=120"]}, user:{fullname:"Priya Sharma", avatar:"https://i.pravatar.cc/48?img=31",email:"priya@email.com" }, checkIn:"2026-04-01",checkOut:"2026-04-07",totalPrice:2520,guests:{adults:5,children:1,infants:0},status:"pending"   },
    { _id:"b4", listing:{_id:"l3",title:"Downtown Loft Studio",    images:["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=120"]},  user:{fullname:"James Okafor", avatar:"https://i.pravatar.cc/48?img=53",email:"james@email.com" }, checkIn:"2026-01-20",checkOut:"2026-01-25",totalPrice:1400,guests:{adults:2,children:0,infants:0},status:"cancelled" },
    { _id:"b5", listing:{_id:"l2",title:"Forest Treehouse Cabin",  images:["https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=120"]}, user:{fullname:"Sofia Reyes",  avatar:"https://i.pravatar.cc/48?img=22",email:"sofia@email.com" }, checkIn:"2026-04-15",checkOut:"2026-04-18",totalPrice:585, guests:{adults:1,children:0,infants:0},status:"confirmed" },
    { _id:"b6", listing:{_id:"l1",title:"Cliffside Villa Retreat", images:["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=120"]}, user:{fullname:"Yuki Tanaka",  avatar:"https://i.pravatar.cc/48?img=21",email:"yuki@email.com"  }, checkIn:"2026-05-01",checkOut:"2026-05-06",totalPrice:2100,guests:{adults:2,children:0,infants:0},status:"rejected"  },
  ]),
  getReviews: () => delay([
    { _id:"r1", listing:{title:"Cliffside Villa Retreat"}, user:{fullname:"Emma Laurent", avatar:"https://i.pravatar.cc/48?img=47"}, rating:5, review:"Breathtaking views and immaculate property. The host was incredibly responsive and welcoming.", createdAt:"2026-02-10T00:00:00Z" },
    { _id:"r2", listing:{title:"Forest Treehouse Cabin"},  user:{fullname:"Marcus Webb",  avatar:"https://i.pravatar.cc/48?img=12"}, rating:4, review:"Magical experience waking up among the trees. Cozy and well-equipped — only minor issue was spotty WiFi.", createdAt:"2026-01-25T00:00:00Z" },
    { _id:"r3", listing:{title:"Cliffside Villa Retreat"}, user:{fullname:"Yuki Tanaka",  avatar:"https://i.pravatar.cc/48?img=21"}, rating:5, review:"A perfect honeymoon stay. The sunset from the terrace was unlike anything we've ever seen.", createdAt:"2026-01-18T00:00:00Z" },
    { _id:"r4", listing:{title:"Downtown Loft Studio"},    user:{fullname:"James Okafor", avatar:"https://i.pravatar.cc/48?img=53"}, rating:3, review:"Decent location but listing photos were a bit misleading. Space was smaller than expected.", createdAt:"2026-01-05T00:00:00Z" },
  ]),
  updateBookingStatus: (id, status) => delay({ id, status }),
  cancelBooking:       (id)          => delay({ id, status: "cancelled" }),
  updateUserDetails:   (d)           => delay(d),
  updateUserAvatar:    ()            => delay({ avatar: "https://i.pravatar.cc/120?img=10" }),
  changePassword:      ()            => delay({ success: true }),
  logoutUser:          ()            => delay({}),
  fetchCategories: () => delay([
    {_id:"c1",name:"Apartment",icon:"🏢"},{_id:"c2",name:"Villa",      icon:"🏰"},
    {_id:"c3",name:"Farmhouse", icon:"🌾"},{_id:"c4",name:"Studio",     icon:"🎨"},
    {_id:"c5",name:"Treehouse", icon:"🌲"},{_id:"c6",name:"Cabin",      icon:"🏕️"},
    {_id:"c7",name:"Cottage",   icon:"🏡"},{_id:"c8",name:"Shared Room",icon:"👥"},
  ]),
  fetchAmenities: () => delay([
    {_id:"a1", name:"WiFi",            icon:"📶",category:"essentials"},
    {_id:"a2", name:"Kitchen",         icon:"🍳",category:"essentials"},
    {_id:"a3", name:"Free Parking",    icon:"🚗",category:"essentials"},
    {_id:"a4", name:"Air Conditioning",icon:"❄️",category:"essentials"},
    {_id:"a5", name:"Pool",            icon:"🏊",category:"features"  },
    {_id:"a6", name:"Hot Tub",         icon:"♨️",category:"features"  },
    {_id:"a7", name:"Gym",             icon:"💪",category:"features"  },
    {_id:"a8", name:"Fireplace",       icon:"🔥",category:"features"  },
    {_id:"a9", name:"BBQ Grill",       icon:"🍖",category:"outdoor"   },
    {_id:"a10",name:"Garden",          icon:"🌿",category:"outdoor"   },
    {_id:"a11",name:"Beach Access",    icon:"🏖️",category:"outdoor"   },
  ]),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt       = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0}).format(n);
const fmtDate   = (d) => new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const nightDiff = (a,b) => Math.round((new Date(b)-new Date(a))/864e5);
const starsStr  = (n) => "★".repeat(n)+"☆".repeat(5-n);

const BAR_COLORS = {confirmed:"#059669",pending:"#d97706",cancelled:"#9ca3af",rejected:"#ef4444"};

// ══════════════════════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// StatusBadge
const StatusBadge = ({ status }) => {
  const map = {
    pending:   "bg-amber-50   text-amber-700   border-amber-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-gray-100   text-gray-500    border-gray-200",
    rejected:  "bg-red-50     text-red-600     border-red-200",
    active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive:  "bg-gray-100   text-gray-500    border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status]||map.pending}`}>
      {status}
    </span>
  );
};

// Toast — defined at module level so it never loses identity
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = { success:"bg-emerald-600", error:"bg-red-500", info:"bg-rose-500" };
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl ${colors[type]||colors.info}`}
      style={{animation:"slideUp 0.3s ease"}}>
      {type==="success"?"✓":type==="error"?"✕":"ℹ"} {msg}
      <button onClick={onClose} className="opacity-70 hover:opacity-100 ml-1">✕</button>
    </div>
  );
};

// Confirm Dialog
const ConfirmDialog = ({ title, msg, confirmLabel="Confirm", danger=true, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={(e) => e.target===e.currentTarget && onClose()}>
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" style={{animation:"slideUp 0.2s ease"}}>
      <h3 className="text-lg font-bold text-gray-900 mb-2" style={{fontFamily:"'Fraunces',serif"}}>{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">{msg}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
        <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition ${danger?"bg-red-500 hover:bg-red-600":"bg-rose-500 hover:bg-rose-600"}`}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

// Loading skeletons
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="h-44 bg-gray-200"/>
    <div className="p-4 space-y-2"><div className="h-4 bg-gray-200 rounded w-3/4"/><div className="h-3 bg-gray-100 rounded w-1/2"/><div className="h-3 bg-gray-100 rounded w-2/3"/></div>
  </div>
);
const SkeletonRow = () => (
  <div className="bg-white rounded-2xl p-5 animate-pulse flex gap-4">
    <div className="w-10 h-8 bg-gray-200 rounded-lg shrink-0"/>
    <div className="flex-1 space-y-2"><div className="h-3 bg-gray-200 rounded w-1/2"/><div className="h-3 bg-gray-100 rounded w-1/3"/></div>
  </div>
);

// ── PasswordField at module level (prevents focus-loss bug) ──────────────────
function PasswordField({ label, field, value, show, onToggleShow, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        <button type="button" onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition text-sm">
          {show ? "🙈" : "👁"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD TAB
// ══════════════════════════════════════════════════════════════════════════════
function DashboardTab({ stats, listings, bookings, onTab, onConfirm, onReject }) {
  const bd      = stats?.statusBreakdown || [];
  const maxRev  = Math.max(...bd.map((b) => b.totalRevenue), 1);
  const pending = bookings.filter((b) => b.status === "pending");
  const pend    = bd.find((s) => s._id === "pending");

  const statItems = [
    { ico:"📦", lbl:"Total Bookings",  val:stats?.totalBookings    ?? "—", color:"text-blue-600",   bg:"bg-blue-50",    delta:"↑ 12% this month", up:true  },
    { ico:"📅", lbl:"Upcoming Stays",  val:stats?.upcomingBookings ?? "—", color:"text-amber-600",  bg:"bg-amber-50",   delta:"next 30 days",      up:null  },
    { ico:"💰", lbl:"Total Revenue",   val:stats?.totalRevenue ? fmt(stats.totalRevenue) : "—", color:"text-emerald-600",bg:"bg-emerald-50", delta:"↑ 18% vs last mo",up:true },
    { ico:"⏳", lbl:"Pending Action",  val:pend?.count ?? 0,              color:"text-red-500",    bg:"bg-red-50",     delta:"Needs response",    up:false },
  ];

  return (
    <div className="tab-content">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily:"'Fraunces',serif"}}>Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your hosting overview at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statItems.map((s) => (
          <div key={s.lbl} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-lg mb-3`}>{s.ico}</div>
            <div className="text-2xl font-bold text-gray-900" style={{fontFamily:"'Fraunces',serif"}}>{s.val}</div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{s.lbl}</div>
            <div className={`text-xs mt-2 font-medium ${s.up===true?"text-emerald-600":s.up===false?"text-red-400":"text-gray-400"}`}>
              {s.up===true?"↑":s.up===false?"↓":""} {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue + Quick Listings */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Revenue by Status</h2>
          {bd.filter((b) => b.totalRevenue > 0).map((b) => (
            <div key={b._id} className="flex items-center gap-3 mb-3 text-sm">
              <span className="w-20 text-gray-500 capitalize text-xs">{b._id}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{width:`${(b.totalRevenue/maxRev)*100}%`,background:BAR_COLORS[b._id]}}/>
              </div>
              <span className="w-20 text-right text-xs font-semibold text-gray-700">{fmt(b.totalRevenue)}</span>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t border-gray-50 flex gap-5">
            {bd.map((b) => (
              <div key={b._id} className="text-center">
                <div className="text-lg font-bold" style={{color:BAR_COLORS[b._id]}}>{b.count}</div>
                <div className="text-xs text-gray-400 capitalize">{b._id}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Your Properties</h2>
            <button onClick={() => onTab("listings")} className="text-xs text-rose-500 font-semibold hover:text-rose-700 transition">View all →</button>
          </div>
          {listings.slice(0,3).map((l) => (
            <div key={l._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
              <img src={l.images[0]} alt={l.title} className="w-12 h-9 rounded-lg object-cover shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{l.title}</div>
                <div className="text-xs text-gray-400">{l.location.city} · {fmt(l.price)}/night</div>
              </div>
              <StatusBadge status={l.isActive ? "active" : "inactive"}/>
            </div>
          ))}
        </div>
      </div>

      {/* Pending requests table */}
      {pending.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              ⚡ Pending Requests
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">{pending.length}</span>
            </h2>
            <button onClick={() => onTab("bookings")} className="text-xs text-rose-500 font-semibold hover:text-rose-700 transition">Manage all →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{["Listing","Guest","Dates","Total","Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pending.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={b.listing.images[0]} alt="" className="w-9 h-7 rounded-lg object-cover"/>
                        <span className="text-xs font-medium text-gray-800 max-w-[120px] truncate">{b.listing.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={b.user.avatar} alt="" className="w-6 h-6 rounded-full object-cover"/>
                        <span className="text-xs text-gray-700">{b.user.fullname}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-rose-500">{fmt(b.totalPrice)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => onConfirm(b._id)} className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 transition">✓ Confirm</button>
                        <button onClick={() => onReject(b._id)}  className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full hover:bg-red-100 transition">✕ Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  LISTINGS TAB
// ══════════════════════════════════════════════════════════════════════════════
function ListingsTab({ listings, loading, onAdd, onEdit, onDelete }) {
  return (
    <div className="tab-content">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily:"'Fraunces',serif"}}>My Listings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{listings.length} properties · {listings.filter(l=>l.isActive).length} active</p>
        </div>
        <button onClick={onAdd} className="px-5 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition shadow-sm shadow-rose-200 flex items-center gap-2">
          ＋ New Listing
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard/><SkeletonCard/><SkeletonCard/>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
          <div className="text-4xl mb-3">🏠</div>
          <p className="text-gray-600 font-semibold">No listings yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first listing to start hosting</p>
          <button onClick={onAdd} className="mt-5 px-6 py-2.5 bg-rose-500 text-white rounded-full text-sm font-semibold hover:bg-rose-600 transition">Create listing</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((l) => (
            <div key={l._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group"
              style={{transition:"box-shadow 0.2s,transform 0.2s"}}
              onMouseEnter={(e)=>{e.currentTarget.style.boxShadow="0 12px 40px rgba(0,0,0,.10)";e.currentTarget.style.transform="translateY(-2px)"}}
              onMouseLeave={(e)=>{e.currentTarget.style.boxShadow="";e.currentTarget.style.transform=""}}>
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                <div className="absolute top-3 right-3"><StatusBadge status={l.isActive?"active":"inactive"}/></div>
                {l.averageRating > 0 && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-gray-800 flex items-center gap-1 shadow-sm">
                    ★ {l.averageRating.toFixed(1)} <span className="text-gray-400 font-normal">({l.numberOfRatings})</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 truncate text-sm" style={{fontFamily:"'Fraunces',serif"}}>{l.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">📍 {l.location.city}, {l.location.country}</p>
                <div className="flex gap-3 mt-2.5 text-xs text-gray-500">
                  <span>👤 {l.maxGuests} guests</span>
                  <span>🛏 {l.bedrooms} bed</span>
                  <span>🚿 {l.bathrooms} bath</span>
                </div>
                {l.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {l.amenities.slice(0,3).map((a,i) => (
                      <span key={i} className="text-xs bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full">{a.name}</span>
                    ))}
                    {l.amenities.length > 3 && <span className="text-xs text-gray-400">+{l.amenities.length-3}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <div><span className="text-gray-900 font-bold">{fmt(l.price)}</span><span className="text-xs text-gray-400 ml-1">/ night</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(l)} className="px-3 py-1.5 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:border-rose-300 hover:text-rose-500 transition">✏ Edit</button>
                    <button onClick={() => onDelete(l._id)} className="px-3 py-1.5 border border-red-200 rounded-full text-xs font-semibold text-red-400 hover:bg-red-50 transition">🗑</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  BOOKINGS TAB
// ══════════════════════════════════════════════════════════════════════════════
function BookingsTab({ bookings, loading, onConfirm, onReject, onCancel }) {
  const [filter, setFilter] = useState("all");
  const counts = {};
  bookings.forEach((b) => { counts[b.status] = (counts[b.status]||0)+1; });
  const visible = filter==="all" ? bookings : bookings.filter((b) => b.status===filter);

  return (
    <div className="tab-content">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily:"'Fraunces',serif"}}>Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{bookings.length} total · {counts["pending"]||0} awaiting response</p>
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1 flex-wrap">
          {["all","pending","confirmed","cancelled","rejected"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition capitalize ${filter===s?"bg-rose-500 text-white shadow":"text-gray-500 hover:text-gray-800"}`}>
              {s==="all"?"All":s}
              {s!=="all" && counts[s] ? <span className="ml-1 opacity-70">({counts[s]})</span> : null}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3"><SkeletonRow/><SkeletonRow/><SkeletonRow/></div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 font-medium">No {filter!=="all"?filter:""} bookings</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{["Listing","Guest","Check-in","Check-out","Nights","Guests","Total","Status","Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={b.listing.images[0]} alt="" className="w-9 h-7 rounded-lg object-cover shrink-0"/>
                        <span className="text-xs font-medium text-gray-800 max-w-[130px] truncate">{b.listing.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={b.user.avatar} alt="" className="w-6 h-6 rounded-full object-cover"/>
                        <div>
                          <div className="text-xs font-medium text-gray-800">{b.user.fullname}</div>
                          <div className="text-xs text-gray-400">{b.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(b.checkIn)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(b.checkOut)}</td>
                    <td className="px-4 py-3 text-xs text-center text-gray-500">{nightDiff(b.checkIn,b.checkOut)}</td>
                    <td className="px-4 py-3 text-xs text-center text-gray-500">{b.guests.adults}A{b.guests.children>0?` ${b.guests.children}C`:""}</td>
                    <td className="px-4 py-3 text-sm font-bold text-rose-500 whitespace-nowrap">{fmt(b.totalPrice)}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status}/></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {b.status==="pending" && (
                          <>
                            <button onClick={() => onConfirm(b._id)} className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 transition">✓</button>
                            <button onClick={() => onReject(b._id)}  className="px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full hover:bg-red-100 transition">✕</button>
                          </>
                        )}
                        {(b.status==="pending"||b.status==="confirmed") && (
                          <button onClick={() => onCancel(b._id)} className="px-2.5 py-1 text-xs font-semibold border border-gray-200 text-gray-500 rounded-full hover:border-gray-300 transition">Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  REVIEWS TAB
// ══════════════════════════════════════════════════════════════════════════════
function ReviewsTab({ reviews, loading }) {
  const avg  = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : "—";
  const dist = [5,4,3,2,1].map((n) => ({ n, count: reviews.filter((r)=>r.rating===n).length }));

  return (
    <div className="tab-content">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily:"'Fraunces',serif"}}>Guest Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">{reviews.length} reviews · avg {avg} ★</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Stats sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-5xl font-bold text-rose-500 mb-1" style={{fontFamily:"'Fraunces',serif"}}>{avg}</div>
            <div className="text-rose-400 text-xl mb-1">{"★".repeat(Math.round(Number(avg)||0))}</div>
            <div className="text-xs text-gray-400">{reviews.length} total reviews</div>
            <div className="mt-4 space-y-2">
              {dist.map((d) => (
                <div key={d.n} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-3">{d.n}</span>
                  <span className="text-amber-400 text-xs">★</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{width:`${reviews.length?(d.count/reviews.length)*100:0}%`}}/>
                  </div>
                  <span className="text-gray-400 w-4 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Breakdown</div>
            {[
              {label:"5 stars ✦",pct:Math.round((dist[0].count/(reviews.length||1))*100)},
              {label:"4 stars",  pct:Math.round((dist[1].count/(reviews.length||1))*100)},
              {label:"3 & below",pct:Math.round(((dist[2].count+dist[3].count+dist[4].count)/(reviews.length||1))*100)},
            ].map((r) => (
              <div key={r.label} className="flex justify-between text-xs mb-2">
                <span className="text-gray-500">{r.label}</span>
                <span className="font-semibold text-gray-800">{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews list */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-3"><SkeletonRow/><SkeletonRow/><SkeletonRow/></div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
              <div className="text-4xl mb-3">⭐</div>
              <p className="text-gray-500 font-medium">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start gap-3">
                    <img src={r.user.avatar} alt={r.user.fullname} className="w-9 h-9 rounded-full object-cover shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{r.user.fullname}</div>
                          <div className="text-xs text-gray-400">{r.listing?.title}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-400 text-xs">{starsStr(r.rating)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{fmtDate(r.createdAt)}</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed italic">"{r.review}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PROFILE TAB
// ══════════════════════════════════════════════════════════════════════════════
function ProfileTab({ user, onUpdate, showToast }) {
  const [form,       setForm]       = useState({ fullname:"", email:"", bio:"" });
  const [avatarFile, setFile]       = useState(null);
  const [avatarPrev, setPrev]       = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (user) setForm({ fullname:user.fullname||"", email:user.email||"", bio:user.bio||"" });
  }, [user]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f); setPrev(URL.createObjectURL(f));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setUploading(true);
    const fd = new FormData(); fd.append("avatar", avatarFile);
    try {
      const res = await MockAPI.updateUserAvatar(fd);
      const url = res.data?.data?.avatar || avatarPrev;
      onUpdate({ avatar: url });
      showToast("Profile photo updated!", "success");
      setFile(null); setPrev(null);
    } catch { showToast("Upload failed","error"); }
    finally { setUploading(false); }
  };

  const saveProfile = async () => {
    if (!form.fullname||!form.email) { showToast("Name and email are required","error"); return; }
    setSaving(true);
    try {
      await MockAPI.updateUserDetails(form);
      onUpdate(form);
      showToast("Profile updated successfully","success");
    } catch { showToast("Update failed","error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="tab-content space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily:"'Fraunces',serif"}}>Your Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">📷 Profile Photo</h2>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="relative">
            <img
              src={avatarPrev || user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname||"H")}&background=f43f5e&color=fff&size=100`}
              alt="avatar"
              className="w-24 h-24 rounded-2xl object-cover border-4 border-rose-50 shadow-sm"
            />
            {avatarPrev && <span className="absolute top-1 right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"/>}
          </div>
          <div>
            <input type="file" ref={fileRef} accept="image/*" onChange={handleFile} className="hidden"/>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => fileRef.current.click()}
                className="px-4 py-2 text-sm font-semibold rounded-full border border-gray-200 text-gray-700 hover:border-rose-300 hover:text-rose-500 transition flex items-center gap-1.5">
                ↑ Choose photo
              </button>
              {avatarPrev && (
                <button onClick={uploadAvatar} disabled={uploading}
                  className="px-4 py-2 text-sm font-semibold rounded-full bg-rose-500 text-white hover:bg-rose-600 transition disabled:opacity-50">
                  {uploading ? "Uploading…" : "Save photo"}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-5 flex items-center gap-2">👤 Personal Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
            <input value={form.fullname} onChange={(e) => setForm((p)=>({...p,fullname:e.target.value}))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address</label>
            <input type="email" value={form.email} onChange={(e) => setForm((p)=>({...p,email:e.target.value}))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition"/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Bio</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setForm((p)=>({...p,bio:e.target.value}))}
              placeholder="Tell guests a little about yourself as a host…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition resize-none"/>
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving}
          className="mt-5 px-6 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Host badge */}
      <div className="bg-rose-50 rounded-2xl border border-rose-100 p-5">
        <h3 className="text-sm font-semibold text-rose-700 mb-2">🏅 Host Status</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="font-bold text-rose-500">Superhost ✦</span>
          <span className="text-xs text-rose-400 self-center">Active since 2022</span>
          <span className="text-xs text-rose-400 self-center capitalize">Role: {user?.role}</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SECURITY TAB — PasswordField used from module level (no focus-loss bug)
// ══════════════════════════════════════════════════════════════════════════════
function SecurityTab({ showToast }) {
  const [form,     setForm]     = useState({ oldPassword:"", newPassword:"", confirmPassword:"" });
  const [show,     setShow]     = useState({ old:false, new:false, confirm:false });
  const [saving,   setSaving]   = useState(false);
  const [strength, setStrength] = useState(0);

  const calcStrength = (pw) => {
    let s=0;
    if(pw.length>=8)           s++;
    if(/[A-Z]/.test(pw))       s++;
    if(/[0-9]/.test(pw))       s++;
    if(/[^A-Za-z0-9]/.test(pw))s++;
    return s;
  };

  const handleChange = (field, val) => {
    setForm((p) => ({...p,[field]:val}));
    if(field==="newPassword") setStrength(calcStrength(val));
  };

  const sLabel = ["","Weak","Fair","Good","Strong"];
  const sColor = ["","bg-red-400","bg-amber-400","bg-blue-400","bg-emerald-500"];
  const sTxt   = ["","text-red-400","text-amber-500","text-blue-500","text-emerald-600"];

  const handleSubmit = async () => {
    if(!form.oldPassword||!form.newPassword||!form.confirmPassword){ showToast("All fields are required","error"); return; }
    if(form.newPassword!==form.confirmPassword){ showToast("Passwords do not match","error"); return; }
    if(strength<2){ showToast("Password is too weak","error"); return; }
    setSaving(true);
    try {
      await MockAPI.changePassword(form);
      showToast("Password changed successfully!","success");
      setForm({oldPassword:"",newPassword:"",confirmPassword:""});
      setStrength(0);
    } catch(err){ showToast(err?.response?.data?.message||"Failed to change password","error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="tab-content space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily:"'Fraunces',serif"}}>Security</h1>
        <p className="text-sm text-gray-500 mt-0.5">Keep your account safe and secure</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-5 flex items-center gap-2">🔒 Change Password</h2>
        <div className="space-y-4 max-w-md">
          <PasswordField label="Current Password"    field="oldPassword"     value={form.oldPassword}     show={show.old}     onToggleShow={() => setShow((p)=>({...p,old:!p.old}))}         onChange={handleChange}/>
          <PasswordField label="New Password"        field="newPassword"     value={form.newPassword}     show={show.new}     onToggleShow={() => setShow((p)=>({...p,new:!p.new}))}         onChange={handleChange}/>

          {form.newPassword && (
            <div>
              <div className="flex gap-1 mb-1">
                {[1,2,3,4].map((n) => (
                  <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${n<=strength?sColor[strength]:"bg-gray-100"}`}/>
                ))}
              </div>
              <p className={`text-xs font-medium ${sTxt[strength]}`}>{sLabel[strength]}</p>
            </div>
          )}

          <PasswordField label="Confirm New Password" field="confirmPassword" value={form.confirmPassword} show={show.confirm} onToggleShow={() => setShow((p)=>({...p,confirm:!p.confirm}))} onChange={handleChange}/>

          {form.confirmPassword && (
            <p className={`text-xs font-medium flex items-center gap-1 ${form.newPassword===form.confirmPassword?"text-emerald-600":"text-red-400"}`}>
              {form.newPassword===form.confirmPassword ? "✓ Passwords match" : "✕ Passwords don't match"}
            </p>
          )}

          <div className="pt-1">
            <button onClick={handleSubmit} disabled={saving}
              className="px-6 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition disabled:opacity-50">
              {saving ? "Changing…" : "Change password"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-rose-50 rounded-2xl border border-rose-100 p-5">
        <h3 className="text-sm font-semibold text-rose-700 mb-2">⚠️ Password Tips</h3>
        <ul className="text-xs text-rose-600 space-y-1">
          <li>• Use at least 8 characters</li>
          <li>• Include uppercase letters and numbers</li>
          <li>• Add special characters (!@#$) for extra strength</li>
          <li>• Never reuse passwords from other sites</li>
        </ul>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  LISTING FORM MODAL  (5-tab wizard: Basic · Location · Amenities · Photos · Pricing)
// ══════════════════════════════════════════════════════════════════════════════
function ListingFormModal({ listing, categories, amenities, onClose, onSave }) {
  const isEdit = !!listing;
  const [tab,    setTab]    = useState("basic");
  const [saving, setSaving] = useState(false);
  const [form,   setForm]   = useState({
    title:listing?.title||"",           description:listing?.description||"",
    price:listing?.price||"",           category:listing?.category?._id||"",
    maxGuests:listing?.maxGuests||1,    bedrooms:listing?.bedrooms||1,
    beds:listing?.beds||1,              bathrooms:listing?.bathrooms||1,
    cleaningFee:listing?.cleaningFee||0, weeklyDiscount:listing?.weeklyDiscount||0,
    monthlyDiscount:listing?.monthlyDiscount||0,
    street:listing?.location?.street||"",  city:listing?.location?.city||"",
    state:listing?.location?.state||"",    country:listing?.location?.country||"",
    lat:listing?.location?.coordinates?.lat||"", lng:listing?.location?.coordinates?.lng||"",
    selectedAmenities:listing?.amenities?.map((a)=>a._id||a)||[],
    previewUrls:listing?.images||[], imageFiles:[],
  });

  const set = (k,v) => setForm((f)=>({...f,[k]:v}));
  const toggleAmenity = (id) => set("selectedAmenities",
    form.selectedAmenities.includes(id)
      ? form.selectedAmenities.filter((a)=>a!==id)
      : [...form.selectedAmenities,id]
  );
  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    set("imageFiles",files); set("previewUrls",files.map((f)=>URL.createObjectURL(f)));
  };
  const handleSave = async () => {
    if(!form.title||!form.price||!form.category) return;
    setSaving(true);
    await new Promise((r)=>setTimeout(r,800)); // ← swap with real API
    onSave(form); setSaving(false);
  };

  const TABS = ["basic","location","amenities","photos","pricing"];
  const inp = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl my-8" style={{animation:"slideUp 0.25s ease"}}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900" style={{fontFamily:"'Fraunces',serif"}}>{isEdit?"Edit Listing":"New Listing"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400">✕</button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 px-3 text-sm font-semibold border-b-2 transition capitalize whitespace-nowrap ${tab===t?"border-rose-500 text-rose-500":"border-transparent text-gray-400 hover:text-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* BASIC */}
          {tab==="basic" && (
            <div className="space-y-4">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Title *</label>
                <input className={inp} value={form.title} onChange={(e)=>set("title",e.target.value)} placeholder="Stunning clifftop villa..."/></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Description</label>
                <textarea rows={3} className={`${inp} resize-none`} value={form.description} onChange={(e)=>set("description",e.target.value)} placeholder="Describe your space..."/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Category *</label>
                  <select className={inp} value={form.category} onChange={(e)=>set("category",e.target.value)}>
                    <option value="">Select…</option>
                    {categories.map((c)=><option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Max Guests</label>
                  <input type="number" min={1} className={inp} value={form.maxGuests} onChange={(e)=>set("maxGuests",e.target.value)}/></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Bedrooms</label>
                  <input type="number" min={0} className={inp} value={form.bedrooms} onChange={(e)=>set("bedrooms",e.target.value)}/></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Beds</label>
                  <input type="number" min={1} className={inp} value={form.beds} onChange={(e)=>set("beds",e.target.value)}/></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Bathrooms</label>
                  <input type="number" min={0} step={0.5} className={inp} value={form.bathrooms} onChange={(e)=>set("bathrooms",e.target.value)}/></div>
              </div>
            </div>
          )}

          {/* LOCATION */}
          {tab==="location" && (
            <div className="space-y-4">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Street Address</label>
                <input className={inp} value={form.street} onChange={(e)=>set("street",e.target.value)} placeholder="23 Caldera Way"/></div>
              <div className="grid grid-cols-2 gap-4">
                {[["City *","city","Santorini"],["State","state","South Aegean"],["Country *","country","Greece"]].map(([lbl,key,ph])=>(
                  <div key={key}><label className="block text-xs font-semibold text-gray-500 mb-1.5">{lbl}</label>
                    <input className={inp} value={form[key]} onChange={(e)=>set(key,e.target.value)} placeholder={ph}/></div>
                ))}
              </div>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600">📍 Coordinates required for map display and search</div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Latitude *</label>
                  <input type="number" step="any" className={inp} value={form.lat} onChange={(e)=>set("lat",e.target.value)} placeholder="36.3932"/></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Longitude *</label>
                  <input type="number" step="any" className={inp} value={form.lng} onChange={(e)=>set("lng",e.target.value)} placeholder="25.4615"/></div>
              </div>
            </div>
          )}

          {/* AMENITIES */}
          {tab==="amenities" && (
            <div>
              <p className="text-xs text-gray-400 mb-4">{form.selectedAmenities.length} selected</p>
              {["essentials","features","outdoor"].map((cat) => {
                const grp = amenities.filter((a)=>a.category===cat);
                if(!grp.length) return null;
                return (
                  <div key={cat} className="mb-5">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{cat}</div>
                    <div className="flex flex-wrap gap-2">
                      {grp.map((a) => (
                        <button key={a._id} onClick={() => toggleAmenity(a._id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition flex items-center gap-1 ${form.selectedAmenities.includes(a._id)?"bg-rose-50 border-rose-300 text-rose-600":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                          {a.icon} {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PHOTOS */}
          {tab==="photos" && (
            <div>
              <label className="block border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-rose-300 transition">
                <input type="file" multiple accept="image/*" onChange={handleImages} className="hidden"/>
                <div className="text-3xl mb-2">📷</div>
                <div className="text-sm font-semibold text-gray-700">Click to upload images</div>
                <div className="text-xs text-gray-400 mt-1">JPG, PNG up to 10MB · Max 10 photos</div>
              </label>
              {form.previewUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {form.previewUrls.map((u,i) => <img key={i} src={u} alt="" className="w-16 h-12 rounded-xl object-cover border border-gray-100"/>)}
                </div>
              )}
            </div>
          )}

          {/* PRICING */}
          {tab==="pricing" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Nightly Price (USD) *</label>
                  <input type="number" min={1} className={inp} value={form.price} onChange={(e)=>set("price",e.target.value)} placeholder="150"/></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Cleaning Fee (USD)</label>
                  <input type="number" min={0} className={inp} value={form.cleaningFee} onChange={(e)=>set("cleaningFee",e.target.value)}/></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Weekly Discount (%)</label>
                  <input type="number" min={0} max={100} className={inp} value={form.weeklyDiscount} onChange={(e)=>set("weeklyDiscount",e.target.value)}/></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Monthly Discount (%)</label>
                  <input type="number" min={0} max={100} className={inp} value={form.monthlyDiscount} onChange={(e)=>set("monthlyDiscount",e.target.value)}/></div>
              </div>
              {form.price > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <div className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">Earnings Estimate</div>
                  {[{label:"1 night",n:1,disc:0},{label:"7 nights",n:7,disc:form.weeklyDiscount},{label:"30 nights",n:30,disc:form.monthlyDiscount}].map((p) => {
                    const base = Number(form.price)*p.n + Number(form.cleaningFee);
                    const earn = base*(1-(Number(p.disc)||0)/100);
                    return (
                      <div key={p.label} className="flex justify-between text-sm mb-1.5">
                        <span className="text-rose-600 text-xs">{p.label}</span>
                        <span className="font-bold text-rose-700">{fmt(earn)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving||!form.title||!form.price||!form.category}
            className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-semibold hover:bg-rose-600 transition disabled:opacity-50">
            {saving?"Saving…":isEdit?"Update Listing":"Create Listing"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT — HostPanel
// ══════════════════════════════════════════════════════════════════════════════
export default function HostDashBoard() {
  // const navigate = useNavigate();

  const [activeTab,  setActiveTab]  = useState("dashboard");
  const [user,       setUser]       = useState(null);
  const [stats,      setStats]      = useState(null);
  const [listings,   setListings]   = useState([]);
  const [bookings,   setBookings]   = useState([]);
  const [reviews,    setReviews]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [amenities,  setAmenities]  = useState([]);
  const [loading,    setLoading]    = useState({});
  const [modal,      setModal]      = useState(null); // { type, payload }
  const [toast,      setToast]      = useState(null);

  const setLoad = (k,v) => setLoading((p)=>({...p,[k]:v}));
  const showToast = useCallback((msg, type="info") => setToast({msg,type}), []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      ["user","stats","listings","bookings","reviews"].forEach((k)=>setLoad(k,true));
      try {
        const [u,s,l,b,r,c,a] = await Promise.all([
          MockAPI.getCurrentUser(), MockAPI.getBookingStats(), MockAPI.getMyListings(),
          MockAPI.getMyBookings(),  MockAPI.getReviews(),      MockAPI.fetchCategories(),
          MockAPI.fetchAmenities(),
        ]);
        setUser(u.data.data); setStats(s.data.data); setListings(l.data.data);
        setBookings(b.data.data); setReviews(r.data.data);
        setCategories(c.data.data); setAmenities(a.data.data);
      } catch { showToast("Failed to load data","error"); }
      finally { ["user","stats","listings","bookings","reviews"].forEach((k)=>setLoad(k,false)); }
    };
    init();
  }, []);

  // ── Booking actions ───────────────────────────────────────────────────────
  const confirmBooking = async (id) => {
    await MockAPI.updateBookingStatus(id,"confirmed");
    setBookings((p)=>p.map((b)=>b._id===id?{...b,status:"confirmed"}:b));
    showToast("Booking confirmed — guest notified ✓","success");
  };
  const rejectBooking  = (id) => setModal({type:"reject",  payload:id});
  const cancelBooking  = (id) => setModal({type:"cancel",  payload:id});
  const deleteListing  = (id) => setModal({type:"delete",  payload:id});

  const doReject = async () => {
    await MockAPI.updateBookingStatus(modal.payload,"rejected");
    setBookings((p)=>p.map((b)=>b._id===modal.payload?{...b,status:"rejected"}:b));
    showToast("Booking rejected","info"); setModal(null);
  };
  const doCancel = async () => {
    await MockAPI.cancelBooking(modal.payload);
    setBookings((p)=>p.map((b)=>b._id===modal.payload?{...b,status:"cancelled"}:b));
    showToast("Booking cancelled — full refund issued","info"); setModal(null);
  };
  const doDelete = () => {
    setListings((p)=>p.filter((l)=>l._id!==modal.payload));
    showToast("Listing deleted","success"); setModal(null);
  };
  const saveListing = (form) => {
    if(modal?.payload?._id){
      setListings((p)=>p.map((l)=>l._id===modal.payload._id
        ?{...l,title:form.title,price:Number(form.price),location:{city:form.city,country:form.country}}:l));
      showToast("Listing updated","success");
    } else {
      setListings((p)=>[...p,{
        _id:`l${Date.now()}`, title:form.title, price:Number(form.price),
        location:{city:form.city,country:form.country},
        images:form.previewUrls.length?form.previewUrls:["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600"],
        maxGuests:form.maxGuests, bedrooms:form.bedrooms, beds:form.beds, bathrooms:form.bathrooms,
        averageRating:0, numberOfRatings:0, isActive:true,
        category:categories.find((c)=>c._id===form.category)||null,
        amenities:amenities.filter((a)=>form.selectedAmenities.includes(a._id)),
      }]);
      showToast("Listing created!","success");
    }
    setModal(null);
  };

  const handleLogout = async () => {
    try {
      await MockAPI.logoutUser();
      // navigate("/");   ← uncomment with real router
      showToast("Signed out","success");
    } catch { showToast("Sign out failed","error"); }
  };

  const pendingCount = bookings.filter((b)=>b.status==="pending").length;

  const NAV = [
    { id:"dashboard", label:"Dashboard", ico:"⊞"                              },
    { id:"listings",  label:"Listings",  ico:"🏠"                              },
    { id:"bookings",  label:"Bookings",  ico:"📋", badge:pendingCount||null    },
    { id:"reviews",   label:"Reviews",   ico:"⭐"                              },
    { id:"profile",   label:"Profile",   ico:"👤"                              },
    { id:"security",  label:"Security",  ico:"🔒"                              },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7]" style={{fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        .tab-content { animation: fadeIn 0.25s ease; }
        .nav-btn     { transition: all 0.15s; }
        ::-webkit-scrollbar       { width:5px;height:5px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:#e5e7eb;border-radius:3px }
      `}</style>

      {/* ── Top Bar ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* replace button onClick with navigate("/") */}
            <button className="flex items-center gap-1.5 text-gray-400 hover:text-rose-500 transition text-sm font-medium">← Home</button>
            <span className="text-gray-200">|</span>
            <span className="text-xl font-bold text-rose-500" style={{fontFamily:"'Fraunces',serif",letterSpacing:"-0.03em"}}>Afno Ghar</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <img
                  src={user.avatar||`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname)}&background=f43f5e&color=fff`}
                  alt={user.fullname}
                  className="w-8 h-8 rounded-full object-cover border-2 border-rose-100"
                />
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.fullname}</span>
              </>
            )}
            <span className="px-3 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-full uppercase tracking-wide border border-rose-100">Host</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-8">

        {/* ── Sidebar ── */}
        <aside className="md:w-64 shrink-0">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sticky top-24">

            {/* Host Card */}
            <div className="flex flex-col items-center pb-5 border-b border-gray-100 mb-5">
              <div className="relative">
                <img
                  src={user?.avatar||`https://ui-avatars.com/api/?name=Host&background=f43f5e&color=fff&size=80`}
                  alt="host"
                  className="w-20 h-20 rounded-full object-cover border-4 border-rose-100"
                />
                <button onClick={() => setActiveTab("profile")}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition shadow-lg text-xs">
                  📷
                </button>
              </div>
              <p className="mt-3 font-semibold text-gray-900 text-sm text-center" style={{fontFamily:"'Fraunces',serif"}}>
                {user?.fullname||"Host"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 text-center truncate max-w-full px-2">{user?.email}</p>
              <span className="mt-2 px-3 py-0.5 bg-rose-50 text-rose-600 text-xs font-semibold rounded-full border border-rose-100">
                Superhost ✦
              </span>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-1">
              {NAV.map(({id,label,ico,badge}) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`nav-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left ${
                    activeTab===id
                      ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}>
                  <span className="text-base">{ico}</span>
                  {label}
                  {badge ? <span className="ml-auto bg-white text-rose-500 text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span> : null}
                  {!badge && activeTab!==id && <span className="ml-auto text-gray-300 text-xs">›</span>}
                </button>
              ))}

              {/* Sign out */}
              <div className="border-t border-gray-100 mt-3 pt-3">
                <button onClick={handleLogout}
                  className="nav-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left text-red-400 hover:bg-red-50 hover:text-red-600">
                  🚪 Sign out
                </button>
              </div>
            </nav>

            {/* Quick stats */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Stats</div>
              <div className="space-y-2">
                {[
                  {lbl:"Listings",   val:listings.length},
                  {lbl:"Bookings",   val:bookings.length},
                  {lbl:"Revenue",    val:stats?.totalRevenue?fmt(stats.totalRevenue):"—", rose:true},
                ].map((s) => (
                  <div key={s.lbl} className="flex justify-between text-xs">
                    <span className="text-gray-500">{s.lbl}</span>
                    <span className={`font-bold ${s.rose?"text-rose-500":"text-gray-800"}`}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0">
          {activeTab==="dashboard" && <DashboardTab stats={stats} listings={listings} bookings={bookings} onTab={setActiveTab} onConfirm={confirmBooking} onReject={rejectBooking}/>}
          {activeTab==="listings"  && <ListingsTab  listings={listings} loading={loading.listings} onAdd={()=>setModal({type:"form",payload:null})} onEdit={(l)=>setModal({type:"form",payload:l})} onDelete={deleteListing}/>}
          {activeTab==="bookings"  && <BookingsTab  bookings={bookings} loading={loading.bookings} onConfirm={confirmBooking} onReject={rejectBooking} onCancel={cancelBooking}/>}
          {activeTab==="reviews"   && <ReviewsTab   reviews={reviews}   loading={loading.reviews}/>}
          {activeTab==="profile"   && <ProfileTab   user={user} onUpdate={(u)=>setUser((p)=>({...p,...u}))} showToast={showToast}/>}
          {activeTab==="security"  && <SecurityTab  showToast={showToast}/>}
        </main>
      </div>

      {/* ── Modals ── */}
      {modal?.type==="form" && (
        <ListingFormModal listing={modal.payload} categories={categories} amenities={amenities}
          onClose={()=>setModal(null)} onSave={saveListing}/>
      )}
      {modal?.type==="reject" && (
        <ConfirmDialog title="Reject Booking" msg="Reject this booking request? The guest will be notified and no charge will apply." confirmLabel="Reject Booking" danger
          onConfirm={doReject} onClose={()=>setModal(null)}/>
      )}
      {modal?.type==="cancel" && (
        <ConfirmDialog title="Cancel Booking" msg="As host, cancelling issues the guest a full refund. This cannot be undone." confirmLabel="Cancel Booking" danger
          onConfirm={doCancel} onClose={()=>setModal(null)}/>
      )}
      {modal?.type==="delete" && (
        <ConfirmDialog title="Delete Listing" msg="Permanently delete this listing? All data will be lost. This cannot be undone." confirmLabel="Delete" danger
          onConfirm={doDelete} onClose={()=>setModal(null)}/>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}