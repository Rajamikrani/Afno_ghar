import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Globe, Shield, Home,
  Calendar, MessageSquare, Award, Heart,
  AlertCircle, ChevronRight, Users,
  Quote, BadgeCheck,
} from 'lucide-react';

import {
  fetchUserById,
  fetchHostListings,
  fetchHostReviews,
  fetchHostStats,
} from '../service/api';

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */
const fmtJoined = d =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const ROLE_META = {
  host:  { label: 'Host',  color: '#e11d48', bg: '#fff1f2', icon: <Home  size={11} /> },
  guest: { label: 'Guest', color: '#6366f1', bg: '#eef2ff', icon: <Users size={11} /> },
  admin: { label: 'Admin', color: '#0ea5e9', bg: '#f0f9ff', icon: <Shield size={11} /> },
};

const StarRow = ({ rating, size = 13 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} size={size}
        className={s <= Math.round(rating)
          ? 'fill-amber-400 text-amber-400'
          : 'fill-gray-200 text-gray-200'} />
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════ */
const Skeleton = ({ className }) => (
  <div className={`rounded-2xl animate-pulse ${className}`}
    style={{ background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)', backgroundSize: '200% 100%' }} />
);

/* ══════════════════════════════════════════════════════════════════
   LISTING CARD
══════════════════════════════════════════════════════════════════ */
function ListingCard({ listing, onClick }) {
  return (
    <div onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300"
      style={{ background: '#fff', border: '1px solid #f0ece8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
      <div className="relative h-44 overflow-hidden" style={{ background: '#f5f1ee' }}>
        {listing.images?.[0]
          ? <img src={listing.images[0]} alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          : <div className="w-full h-full flex items-center justify-center">
              <Home size={28} style={{ color: '#d4c9be' }} />
            </div>
        }
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}>
          <Star size={11} className="fill-amber-400 text-amber-400" />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#1a1612' }}>
            {Number(listing.averageRating || 0).toFixed(1)}
          </span>
        </div>
      </div>
      <div className="p-4">
        <p style={{ fontWeight: 600, fontSize: '13px', color: '#1a1612', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {listing.title}
        </p>
        <p className="flex items-center gap-1 mb-3" style={{ fontSize: '11px', color: '#9b8f85' }}>
          <MapPin size={10} className="shrink-0" />
          {listing.location?.city}, {listing.location?.country}
        </p>
        <div className="flex items-baseline gap-1">
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1612' }}>${listing.price}</span>
          <span style={{ fontSize: '11px', color: '#b8aca2' }}>/ night</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REVIEW CARD
══════════════════════════════════════════════════════════════════ */
function ReviewCard({ review }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: '#fff', border: '1px solid #f0ece8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-3 mb-3.5">
        <img
          src={review.user?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.fullname || 'G')}&background=6366f1&color=fff&size=40`}
          alt=""
          className="w-9 h-9 rounded-full object-cover shrink-0"
          style={{ border: '2px solid #f0ece8' }} />
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1612', marginBottom: '2px' }}>
            {review.user?.fullname || 'Guest'}
          </p>
          <div className="flex items-center gap-2">
            <StarRow rating={review.rating} size={11} />
            <span style={{ fontSize: '10px', color: '#b8aca2' }}>
              {review.createdAt
                ? new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : ''}
            </span>
          </div>
        </div>
      </div>

      {review.listing && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl w-fit"
          style={{ background: '#faf7f5', border: '1px solid #ede9e5' }}>
          {review.listing.images?.[0] && (
            <img src={review.listing.images[0]} alt=""
              className="w-5 h-5 rounded-lg object-cover shrink-0" />
          )}
          <span style={{ fontSize: '11px', color: '#9b8f85', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {review.listing.title}
          </span>
        </div>
      )}

      <div className="relative pl-4">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: '#f0ece8' }} />
        <p style={{ fontSize: '12px', color: '#6b5f56', lineHeight: '1.7', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {review.review}
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STAT BOX
══════════════════════════════════════════════════════════════════ */
const StatBox = ({ icon, value, label }) => (
  <div className="flex flex-col items-center gap-2 p-5 rounded-2xl text-center"
    style={{ background: '#fff', border: '1px solid #f0ece8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
    <div style={{ color: '#e11d48', opacity: 0.8 }}>{icon}</div>
    <p style={{ fontSize: '26px', fontWeight: 800, color: '#1a1612', lineHeight: 1, fontFamily: "'Fraunces', serif" }}>{value}</p>
    <p style={{ fontSize: '11px', color: '#9b8f85', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   INFO ROW
══════════════════════════════════════════════════════════════════ */
const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: '#fdf5f0', color: '#e11d48' }}>
      {icon}
    </div>
    <div className="min-w-0 flex-1 pt-0.5">
      <p style={{ fontSize: '10px', fontWeight: 700, color: '#b8aca2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1612', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function UserProfile() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [user,        setUser]        = useState(null);
  const [listings,    setListings]    = useState([]);
  const [reviewsData, setReviewsData] = useState({ reviews: [], total: 0 });
  const [stats,       setStats]       = useState({ totalListings: 0, avgRating: '0.0' });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [tab,         setTab]         = useState('about');

  const profileId = userId || (() => {
    try { return JSON.parse(localStorage.getItem('user'))?._id; } catch { return null; }
  })();

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();

  const isOwnProfile =
    currentUser && (currentUser._id === profileId || currentUser.id === profileId);

  const loadProfile = useCallback(async () => {
    if (!profileId) { setError('User not found.'); setLoading(false); return; }
    setLoading(true);
    setError('');

    try {
      const [userRes, listingsRes, statsRes, reviewsRes] = await Promise.allSettled([
        fetchUserById(profileId),
        fetchHostListings(profileId),
        fetchHostStats(profileId),
        fetchHostReviews(profileId),
      ]);

      if (userRes.status === 'fulfilled') {
        const d = userRes.value?.data;
        setUser(d?.data || d);
      } else {
        setError('Could not load this profile.');
        return;
      }

      if (listingsRes.status === 'fulfilled') {
        const d = listingsRes.value?.data;
        setListings(d?.data?.listings || d?.data || []);
      }

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value?.data;
        setStats(d?.data || { totalListings: 0, avgRating: '0.0' });
      }

      if (reviewsRes.status === 'fulfilled') {
        const d = reviewsRes.value?.data;
        setReviewsData(d?.data || { reviews: [], total: 0 });
      }

    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /* ══════════════════════════════════════════════════════════════
     LOADING STATE
  ══════════════════════════════════════════════════════════════ */
  if (loading) return (
    <div className="min-h-screen" style={{ background: '#faf7f5' }}>
      <div className="max-w-3xl mx-auto px-5 py-10">
        {/* Profile header skeleton */}
        <div className="flex gap-6 items-start mb-8 p-6 rounded-3xl" style={{ background: '#fff', border: '1px solid #f0ece8' }}>
          <Skeleton className="w-24 h-24 rounded-2xl shrink-0" style={{ borderRadius: '16px' }} />
          <div className="flex-1 space-y-3 pt-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     ERROR STATE
  ══════════════════════════════════════════════════════════════ */
  if (error || !user) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4"
      style={{ background: '#faf7f5', color: '#6b5f56' }}>
      <AlertCircle size={40} style={{ color: '#e11d48' }} />
      <p style={{ fontSize: '18px', fontWeight: 600, color: '#1a1612' }}>{error || 'Profile not found.'}</p>
      <button onClick={() => navigate(-1)}
        className="px-6 py-3 rounded-xl text-white font-semibold transition"
        style={{ background: '#1a1612' }}
        onMouseEnter={e => e.target.style.background = '#2d2520'}
        onMouseLeave={e => e.target.style.background = '#1a1612'}>
        Go Back
      </button>
    </div>
  );

  const role        = ROLE_META[user.role] || ROLE_META.guest;
  const memberSince = user.createdAt ? fmtJoined(user.createdAt) : '—';
  const location    = [user.address?.city, user.address?.state, user.address?.country]
    .filter(Boolean).join(', ') || null;
  const firstName   = (user.fullname || '').split(' ')[0] || 'User';
  const isHost      = user.role === 'host';
  const tabList     = ['about', ...(isHost ? ['listings', 'reviews'] : [])];

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: '#faf7f5', fontFamily: "'Instrument Sans', 'DM Sans', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Instrument+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ══ TOP NAV ══ */}
      <div className="sticky top-0 z-20" style={{ background: 'rgba(250,247,245,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #ede9e5' }}>
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 transition-opacity hover:opacity-60"
            style={{ fontSize: '13px', fontWeight: 600, color: '#1a1612' }}>
            <ArrowLeft size={16} /> Back
          </button>
          {isOwnProfile && (
            <button
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition"
              style={{ background: '#1a1612', color: '#fff', fontSize: '12px' }}
              onMouseEnter={e => e.target.style.background = '#2d2520'}
              onMouseLeave={e => e.target.style.background = '#1a1612'}>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8">

        {/* ══ PROFILE HEADER CARD ══ */}
        <div className="rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden"
          style={{ background: '#fff', border: '1px solid #ede9e5', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* Subtle background texture */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle at 90% 10%, #fdf0f3 0%, transparent 50%), radial-gradient(circle at 10% 90%, #fdf8f0 0%, transparent 40%)`,
          }} />

          <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-7 items-start">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden"
                style={{ border: '3px solid #f0ece8', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                <img
                  src={user.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname || 'User')}&background=e11d48&color=fff&size=128`}
                  alt={user.fullname || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Role badge */}
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{
                  background: role.bg,
                  color: role.color,
                  fontSize: '10px',
                  fontWeight: 700,
                  border: `1px solid ${role.color}22`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  letterSpacing: '0.04em',
                }}>
                {role.icon} {role.label}
              </span>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 sm:pt-1">
              {/* Full name — prominently displayed */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 'clamp(22px, 4vw, 30px)',
                  fontWeight: 700,
                  color: '#1a1612',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                }}>
                  {user.fullname || 'Unknown User'}
                </h1>
                <BadgeCheck size={18} style={{ color: '#e11d48', flexShrink: 0 }} />
              </div>

              <p style={{ fontSize: '13px', color: '#9b8f85', fontWeight: 500, marginBottom: '14px' }}>
                @{user.username}
              </p>

              {/* Meta pills */}
              <div className="flex flex-wrap gap-2">
                {location && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: '#faf7f5', border: '1px solid #ede9e5', fontSize: '11px', color: '#6b5f56', fontWeight: 500 }}>
                    <MapPin size={10} style={{ color: '#e11d48' }} />
                    {location}
                  </span>
                )}
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: '#faf7f5', border: '1px solid #ede9e5', fontSize: '11px', color: '#6b5f56', fontWeight: 500 }}>
                  <Calendar size={10} style={{ color: '#e11d48' }} />
                  Joined {memberSince}
                </span>
                {isHost && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: '#fffbeb', border: '1px solid #fde68a', fontSize: '11px', color: '#92400e', fontWeight: 500 }}>
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    {stats.avgRating} avg rating
                  </span>
                )}
              </div>
            </div>

            {/* Contact button */}
            {!isOwnProfile && (
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shrink-0"
                style={{ background: '#1a1612', color: '#fff', fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#2d2520'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1a1612'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <MessageSquare size={14} /> Contact
              </button>
            )}
          </div>

          {/* Bio inline in card */}
          {user.bio && (
            <div className="relative mt-6 pt-5" style={{ borderTop: '1px solid #f0ece8' }}>
              <p style={{ fontSize: '13px', color: '#6b5f56', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {user.bio}
              </p>
            </div>
          )}
        </div>

        {/* ══ STATS (hosts only) ══ */}
        {isHost && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatBox icon={<Home size={17} />} value={stats.totalListings} label="Listings" />
            <StatBox icon={<Star size={17} className="fill-rose-400" />} value={stats.avgRating} label="Avg Rating" />
            <StatBox icon={<Award size={17} />} value={stats.totalListings > 0 ? 'Super' : 'New'} label="Host Status" />
          </div>
        )}

        {/* ══ TABS ══ */}
        <div className="flex items-center gap-1 mb-6"
          style={{ background: '#fff', border: '1px solid #ede9e5', borderRadius: '14px', padding: '4px', width: 'fit-content', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {tabList.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="relative px-5 py-2 rounded-xl capitalize font-semibold transition-all flex items-center gap-1.5"
              style={{
                fontSize: '12px',
                background: tab === t ? '#1a1612' : 'transparent',
                color: tab === t ? '#fff' : '#9b8f85',
                letterSpacing: '0.02em',
              }}>
              {t}
              {t === 'reviews' && reviewsData.total > 0 && (
                <span className="px-1.5 py-0.5 rounded-full"
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    background: tab === 'reviews' ? 'rgba(255,255,255,0.2)' : '#fdf0f3',
                    color: tab === 'reviews' ? '#fff' : '#e11d48',
                    lineHeight: 1,
                  }}>
                  {reviewsData.total}
                </span>
              )}
              {t === 'listings' && listings.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full"
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    background: tab === 'listings' ? 'rgba(255,255,255,0.2)' : '#f5f1ee',
                    color: tab === 'listings' ? '#fff' : '#9b8f85',
                    lineHeight: 1,
                  }}>
                  {listings.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════
            ABOUT TAB
        ════════════════════════════════════════════════════════ */}
        {tab === 'about' && (
          <div className="space-y-5 pb-20">

            {/* Details row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Profile Details */}
              <div className="p-5 rounded-2xl space-y-4"
                style={{ background: '#fff', border: '1px solid #ede9e5', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#b8aca2', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Profile Details
                </p>
                {[
                  { icon: <Users size={14} />,  label: 'Full Name', value: user.fullname || '—' },
                  { icon: <Globe size={14} />,  label: 'Username',  value: `@${user.username}` },
                  { icon: <Shield size={14} />, label: 'Role',      value: role.label },
                  ...(location
                    ? [{ icon: <MapPin size={14} />, label: 'Location', value: location }]
                    : []),
                ].map(({ icon, label, value }) => (
                  <InfoRow key={label} icon={icon} label={label} value={value} />
                ))}
              </div>

              {/* Confirmations */}
              <div className="p-5 rounded-2xl space-y-4"
                style={{ background: '#fff', border: '1px solid #ede9e5', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#b8aca2', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {firstName}'s Confirmations
                </p>
                {[
                  { icon: <BadgeCheck size={14} style={{ color: '#10b981' }} />, label: 'Identity verified',      done: true, accent: '#ecfdf5' },
                  { icon: <Shield     size={14} style={{ color: '#3b82f6' }} />, label: 'Email confirmed',        done: true, accent: '#eff6ff' },
                  { icon: <Globe      size={14} style={{ color: '#f59e0b' }} />, label: `Member since ${memberSince}`, done: true, accent: '#fffbeb' },
                  ...(isHost
                    ? [{ icon: <Award size={14} style={{ color: '#e11d48' }} />, label: 'Verified Host', done: stats.totalListings > 0, accent: '#fff1f2' }]
                    : []),
                ].map(({ icon, label, done, accent }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: done ? accent : '#f5f1ee' }}>
                      {icon}
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: done ? '#1a1612' : '#b8aca2' }}>
                      {label}
                    </p>
                  </div>
                ))}

                {user.languages?.length > 0 && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#b8aca2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                      Languages
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {user.languages.map((lang, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full"
                          style={{ background: '#eef2ff', color: '#4f46e5', fontSize: '11px', fontWeight: 600 }}>
                          {typeof lang === 'object' ? lang.name : lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Listings preview */}
            {isHost && listings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '19px', fontWeight: 600, color: '#1a1612', letterSpacing: '-0.01em' }}>
                    {firstName}'s Listings
                  </h3>
                  <button onClick={() => setTab('listings')}
                    className="flex items-center gap-1 transition-opacity hover:opacity-60"
                    style={{ fontSize: '12px', color: '#e11d48', fontWeight: 600 }}>
                    See all <ChevronRight size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {listings.slice(0, 3).map(l => (
                    <ListingCard key={l._id} listing={l}
                      onClick={() => navigate(`/listing/${l._id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* Reviews preview */}
            {isHost && reviewsData.reviews.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '19px', fontWeight: 600, color: '#1a1612', letterSpacing: '-0.01em' }}>
                    Recent Reviews
                  </h3>
                  <button onClick={() => setTab('reviews')}
                    className="flex items-center gap-1 transition-opacity hover:opacity-60"
                    style={{ fontSize: '12px', color: '#e11d48', fontWeight: 600 }}>
                    See all <ChevronRight size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {reviewsData.reviews.slice(0, 2).map(r => (
                    <ReviewCard key={r._id} review={r} />
                  ))}
                </div>
              </div>
            )}

            {/* Guest empty state */}
            {!isHost && (
              <div className="flex flex-col items-center gap-3 py-14 text-center rounded-2xl"
                style={{ border: '1.5px dashed #ede9e5', background: '#fff' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: '#fdf0f3' }}>
                  <Heart size={22} style={{ color: '#fba4b4' }} />
                </div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a1612' }}>Guest Profile</p>
                <p style={{ fontSize: '13px', color: '#9b8f85', maxWidth: '260px', lineHeight: 1.6 }}>
                  {isOwnProfile
                    ? "You're exploring as a guest. Ready to host? Switch to host mode in settings."
                    : `${firstName} is a guest on Afno Ghar.`}
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
              <div className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl"
                style={{ border: '1.5px dashed #ede9e5', background: '#fff' }}>
                <Home size={28} style={{ color: '#d4c9be' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a1612' }}>No listings yet</p>
                <p style={{ fontSize: '13px', color: '#9b8f85' }}>
                  {isOwnProfile ? 'Create your first listing to start hosting.' : 'This host has no active listings.'}
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '11px', color: '#b8aca2', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
                  {listings.length} listing{listings.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {listings.map(l => (
                    <ListingCard key={l._id} listing={l}
                      onClick={() => navigate(`/listing/${l._id}`)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            REVIEWS TAB
        ════════════════════════════════════════════════════════ */}
        {tab === 'reviews' && (
          <div className="pb-20">
            {reviewsData.reviews.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl"
                style={{ border: '1.5px dashed #ede9e5', background: '#fff' }}>
                <Star size={28} style={{ color: '#d4c9be' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a1612' }}>No reviews yet</p>
                <p style={{ fontSize: '13px', color: '#9b8f85' }}>Reviews from guests will appear here.</p>
              </div>
            ) : (
              <>
                {/* Rating summary */}
                <div className="flex items-center gap-6 p-6 rounded-2xl mb-5"
                  style={{ background: '#fff', border: '1px solid #ede9e5', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="text-center shrink-0">
                    <p style={{ fontFamily: "'Fraunces', serif", fontSize: '52px', fontWeight: 700, color: '#1a1612', lineHeight: 1, marginBottom: '6px' }}>
                      {stats.avgRating}
                    </p>
                    <StarRow rating={Number(stats.avgRating)} size={14} />
                    <p style={{ fontSize: '11px', color: '#b8aca2', marginTop: '6px', fontWeight: 500 }}>
                      {reviewsData.total} review{reviewsData.total !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="w-px self-stretch" style={{ background: '#f0ece8' }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1612', marginBottom: '4px' }}>
                      {firstName} is a {Number(stats.avgRating) >= 4.5 ? 'top-rated' : 'reviewed'} host
                    </p>
                    <p style={{ fontSize: '12px', color: '#9b8f85', lineHeight: 1.7, maxWidth: '220px' }}>
                      Based on {reviewsData.total} guest review{reviewsData.total !== 1 ? 's' : ''} across {stats.totalListings} listing{stats.totalListings !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {reviewsData.reviews.map(r => (
                    <ReviewCard key={r._id} review={r} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}