import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Globe, Shield, Home,
  Calendar, MessageSquare, Award, Heart, Loader2,
  AlertCircle, ChevronRight, Users, Languages,
  Quote, Verified, BadgeCheck
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════
   API HELPERS — wire to your actual service/api.js
══════════════════════════════════════════════════════════════════ */
// Replace these with your actual API calls:
// import { fetchUserById, fetchUserListings, fetchUserReviews } from '../service/api';

import { fetchUserById, fetchUserListings } from '../service/api';

/* ════════════════════════════════ ══════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */
const fmtJoined = d =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const ROLE_META = {
  host:  { label: 'Host',  color: '#f43f5e', bg: '#fff1f2', icon: <Home      size={12} /> },
  guest: { label: 'Guest', color: '#6366f1', bg: '#eef2ff', icon: <Users     size={12} /> },
  admin: { label: 'Admin', color: '#0ea5e9', bg: '#f0f9ff', icon: <Shield    size={12} /> },
};

const StarRow = ({ rating, size = 13 }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(s => (
      <Star key={s} size={size}
        className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   SKELETON LOADER
══════════════════════════════════════════════════════════════════ */
const Skeleton = ({ className }) => (
  <div className={`bg-gray-100 rounded-xl animate-pulse ${className}`} />
);

/* ══════════════════════════════════════════════════════════════════
   LISTING MINI CARD
══════════════════════════════════════════════════════════════════ */
function ListingCard({ listing, onClick }) {
  return (
    <div onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-100 hover:border-rose-200
        shadow-sm hover:shadow-md transition-all duration-300 bg-white">
      <div className="relative h-44 overflow-hidden">
        <img src={listing.images?.[0]} alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm
          rounded-full px-2 py-0.5 flex items-center gap-1">
          <Star size={11} className="fill-amber-400 text-amber-400" />
          <span className="text-xs font-bold">{Number(listing.averageRating || 0).toFixed(1)}</span>
        </div>
      </div>
      <div className="p-3.5">
        <p className="font-semibold text-sm text-gray-900 truncate leading-tight mb-0.5">{listing.title}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
          <MapPin size={10} className="shrink-0" />
          {listing.location?.city}, {listing.location?.country}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="font-bold text-sm">${listing.price}</span>
          <span className="text-gray-400 text-xs">/ night</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REVIEW MINI CARD
══════════════════════════════════════════════════════════════════ */
function ReviewMiniCard({ review }) {
  return (
    <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <img
          src={review.user?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.fullname || 'G')}&background=6366f1&color=fff&size=32`}
          alt="" className="w-8 h-8 rounded-full object-cover" />
        <div>
          <p className="text-xs font-semibold text-gray-900">{review.user?.fullname}</p>
          <StarRow rating={review.rating} size={11} />
        </div>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
        <Quote size={9} className="text-gray-300 inline mr-1 -mt-0.5" />
        {review.review}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STAT BOX
══════════════════════════════════════════════════════════════════ */
const StatBox = ({ icon, value, label }) => (
  <div className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
    <div className="text-rose-400">{icon}</div>
    <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
    <p className="text-xs text-gray-500 font-medium text-center leading-tight">{label}</p>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   ████  MAIN COMPONENT  ████
══════════════════════════════════════════════════════════════════ */
export default function UserProfile() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [user,     setUser]     = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews,  setReviews]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState('about'); // 'about' | 'listings' | 'reviews'

  /* Determine whose profile: if no userId param, show logged-in user */
  const profileId = userId || (() => {
    try { return JSON.parse(localStorage.getItem('user'))?._id; } catch { return null; }
  })();

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();

  const isOwnProfile = currentUser && (currentUser._id === profileId || currentUser.id === profileId);

  const loadProfile = useCallback(async () => {
    if (!profileId) { setError('User not found.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const [userRes, listingsRes] = await Promise.allSettled([
        fetchUserById(profileId),
        fetchUserListings(profileId),
      ]);

    if (userRes.status === 'fulfilled') {
        const data = userRes.value?.data;   // axios wraps in .data
        setUser(data?.data || data);        // your controller returns { success, data: user }
    } else {
        setError('Could not load this profile.');
        return;
      }

   if (listingsRes.status === 'fulfilled') {
    const data = listingsRes.value?.data;
    setListings(data?.data?.listings || data?.data || []);
    }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Header skeleton */}
      <div className="h-56 bg-gradient-to-br from-rose-100 via-amber-50 to-rose-50 animate-pulse" />
      <div className="max-w-4xl mx-auto px-4 -mt-16 pb-20">
        <div className="flex gap-6 items-end mb-8">
          <div className="w-32 h-32 rounded-3xl bg-gray-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-3 pb-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );

  /* ── Error ── */
  if (error || !user) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-600 px-4">
      <AlertCircle size={48} className="text-rose-400" />
      <p className="text-xl font-medium">{error || 'Profile not found.'}</p>
      <button onClick={() => navigate(-1)}
        className="px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition font-semibold">
        Go Back
      </button>
    </div>
  );

  const role        = ROLE_META[user.role] || ROLE_META.guest;
  const memberSince = user.createdAt ? fmtJoined(user.createdAt) : '—';
  const location    = [user.address?.city, user.address?.state, user.address?.country]
    .filter(Boolean).join(', ') || null;

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#fafaf8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Google Font ── */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ── HERO BANNER ── */}
      <div className="relative h-52 sm:h-64 overflow-hidden">
        {/* Layered gradient background — editorial, warm */}
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 100% at 20% -10%, #fda4af55 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 80% 110%, #fcd34d44 0%, transparent 60%),
              linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%)
            `
          }} />
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-white/5" />
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full border border-white/5" />
        <div className="absolute bottom-8 left-1/3 w-1 h-1 bg-rose-300 rounded-full shadow-lg shadow-rose-400" />
        <div className="absolute top-8 left-1/4 w-1.5 h-1.5 bg-amber-300/60 rounded-full" />

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="absolute top-5 left-5 flex items-center gap-2 text-white/80 hover:text-white
            bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full
            transition text-sm font-medium z-10">
          <ArrowLeft size={15} /> Back
        </button>

        {/* Edit profile shortcut */}
        {isOwnProfile && (
          <button
            className="absolute top-5 right-5 bg-white/10 hover:bg-white/20 backdrop-blur-sm
              text-white/80 hover:text-white px-4 py-1.5 rounded-full text-sm font-medium
              transition border border-white/10">
            Edit Profile
          </button>
        )}

        {/* Decorative heading in banner */}
        <div className="absolute bottom-10 right-8 text-right hidden sm:block">
          <p className="text-white/10 font-bold text-6xl leading-none select-none"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {user.fullname?.split(' ')[0] || 'Profile'}
          </p>
        </div>
      </div>

      {/* ── PROFILE CONTENT ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* ── AVATAR + NAME ROW ── */}
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-start sm:items-end -mt-14 sm:-mt-16 mb-7 relative z-10">

          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={user.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname || 'User')}&background=f43f5e&color=fff&size=128`}
              alt={user.fullname}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-[#fafaf8] shadow-xl"
            />
            {/* Role badge */}
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1
              px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm border border-white"
              style={{ backgroundColor: role.bg, color: role.color }}>
              {role.icon} {role.label}
            </span>
          </div>

          {/* Name + meta */}
          <div className="flex-1 pt-2 sm:pt-0 sm:pb-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {user.fullname}
              </h1>
              <BadgeCheck size={20} className="text-rose-400 shrink-0" />
            </div>
            <p className="text-gray-500 text-sm mb-2">@{user.username}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} className="text-rose-400" /> {location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-rose-400" /> Joined {memberSince}
              </span>
              {user.role === 'host' && (
                <span className="flex items-center gap-1">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {Number(user.hostAvgRating || 0).toFixed(1)} avg rating
                </span>
              )}
            </div>
          </div>

          {/* Contact button (only for other users) */}
          {!isOwnProfile && (
            <button className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white
              rounded-xl text-sm font-semibold hover:bg-gray-700 transition shadow-sm active:scale-[.97]">
              <MessageSquare size={14} /> Contact
            </button>
          )}
        </div>

        {/* ── STATS ROW (host only) ── */}
        {user.role === 'host' && (
          <div className="grid grid-cols-3 gap-3 mb-7">
            <StatBox
              icon={<Home size={18} />}
              value={user.hostListingCount || listings.length || 0}
              label="Listings" />
            <StatBox
              icon={<Star size={18} className="fill-rose-400" />}
              value={Number(user.hostAvgRating || 0).toFixed(1)}
              label="Avg Rating" />
            <StatBox
              icon={<Award size={18} />}
              value={user.hostListingCount > 0 ? 'Super' : 'New'}
              label="Host Status" />
          </div>
        )}

        {/* ── TABS ── */}
        <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm mb-6 w-fit">
          {['about', ...(user.role === 'host' ? ['listings'] : [])].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all
                ${tab === t
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════
            ABOUT TAB
        ════════════════════════════════════════════════════════ */}
        {tab === 'about' && (
          <div className="space-y-5 pb-20">

            {/* Bio */}
            {user.bio && (
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">About</h3>
                <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{user.bio}</p>
              </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Identity card */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Profile Details</h3>
                {[
                  { icon: <Users size={15} />, label: 'Full Name',  value: user.fullname },
                  { icon: <Globe size={15} />, label: 'Username',   value: `@${user.username}` },
                  { icon: <Shield size={15}/>, label: 'Role',       value: role.label },
                  ...(location ? [{ icon: <MapPin size={15} />, label: 'Location', value: location }] : []),
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center
                      text-rose-400 shrink-0 mt-0.5">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                      <p className="text-sm text-gray-800 font-medium truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust & verification */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user.fullname?.split(' ')[0]}'s Confirmations</h3>
                {[
                  { icon: <BadgeCheck size={15} className="text-emerald-500" />, label: 'Identity verified', done: true },
                  { icon: <Shield size={15} className="text-blue-400" />,        label: 'Email confirmed',   done: true },
                  { icon: <Globe size={15} className="text-amber-500" />,        label: 'Member since ' + memberSince, done: true },
                  ...(user.role === 'host'
                    ? [{ icon: <Award size={15} className="text-rose-400" />, label: 'Verified Host', done: user.hostListingCount > 0 }]
                    : []),
                ].map(({ icon, label, done }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                      ${done ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                      {icon}
                    </div>
                    <p className={`text-sm font-medium ${done ? 'text-gray-800' : 'text-gray-400'}`}>{label}</p>
                  </div>
                ))}

                {/* Languages */}
                {user.languages?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Languages</p>
                    <div className="flex flex-wrap gap-1.5">
                      {user.languages.map((lang, i) => (
                        <span key={i}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                          {typeof lang === 'object' ? lang.name : lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Listings preview (for hosts, inside About tab) */}
            {user.role === 'host' && listings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem' }}>
                    {user.fullname?.split(' ')[0]}'s Listings
                  </h3>
                  <button onClick={() => setTab('listings')}
                    className="text-sm text-rose-500 font-semibold flex items-center gap-1 hover:text-rose-700 transition">
                    See all <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {listings.slice(0, 3).map(l => (
                    <ListingCard key={l._id} listing={l}
                      onClick={() => navigate(`/listing/${l._id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for guests */}
            {user.role === 'guest' && (
              <div className="flex flex-col items-center gap-3 py-12 text-center
                rounded-2xl border border-dashed border-gray-200 bg-white">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <Heart size={24} className="text-rose-300" />
                </div>
                <p className="font-semibold text-gray-600">Guest Profile</p>
                <p className="text-sm text-gray-400 max-w-xs">
                  {isOwnProfile
                    ? "You're exploring listings as a guest. Ready to host? Switch to host mode in settings."
                    : `${user.fullname?.split(' ')[0]} is a guest on Afno Ghar.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            LISTINGS TAB
        ════════════════════════════════════════════════════════ */}
        {tab === 'listings' && (
          <div className="pb-20">
            {listings.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center
                rounded-2xl border border-dashed border-gray-200 bg-white">
                <Home size={32} className="text-gray-300" />
                <p className="text-gray-500 font-medium">No listings yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {listings.map(l => (
                  <ListingCard key={l._id} listing={l}
                    onClick={() => navigate(`/listing/${l._id}`)} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}