import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  fetchListingById, fetchSimilarListings, fetchListingReviews,
  createBookingApi, fetchAmenities, checkBookingEligibility,
  createReview, updateReview, deleteReview, fetchReviewStats,
} from '../service/api';
import {
  MapPin, Star, Heart, Share2, Home, ChevronLeft, ChevronRight,
  X, Check, Award, Clock, ArrowLeft, Minus, Plus, Loader2,
  AlertCircle, Pencil, Trash2, MessageSquare, RefreshCw, Quote,
  CheckCircle, ChevronDown, Calendar, Shield,
} from 'lucide-react';

/* ─── Leaflet icon fix ───────────────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
══════════════════════════════════════════════════════════════════ */
const RATING_META = [
  null,
  { label: 'Poor',      emoji: '😞', color: '#ef4444', bg: '#fef2f2' },
  { label: 'Fair',      emoji: '😐', color: '#f97316', bg: '#fff7ed' },
  { label: 'Good',      emoji: '🙂', color: '#eab308', bg: '#fefce8' },
  { label: 'Very Good', emoji: '😊', color: '#22c55e', bg: '#f0fdf4' },
  { label: 'Excellent', emoji: '🤩', color: '#f43f5e', bg: '#fff1f2' },
];

const fmtShort = d =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtRel = d => {
  const days = Math.floor((Date.now() - new Date(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/* ══════════════════════════════════════════════════════════════════
   STAR DISPLAY (read-only single star + number)
══════════════════════════════════════════════════════════════════ */
const StarDisplay = ({ rating, size = 14 }) => (
  <span className="flex items-center gap-1">
    <Star size={size} className="fill-yellow-400 text-yellow-400" />
    <span className="font-semibold">{Number(rating).toFixed(1)}</span>
  </span>
);

/* ══════════════════════════════════════════════════════════════════
   STAR ROW (read-only 5-star row)
══════════════════════════════════════════════════════════════════ */
const StarRow = ({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(s => (
      <Star key={s} size={size}
        className={s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   INTERACTIVE STAR PICKER
══════════════════════════════════════════════════════════════════ */
function StarPicker({ value, onChange, size = 32 }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button"
            onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            className="transition-transform hover:scale-110 focus:outline-none cursor-pointer">
            <Star size={size}
              className={`transition-colors ${n <= active ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
          </button>
        ))}
      </div>
      {active > 0 && (
        <span className="text-sm font-bold" style={{ color: RATING_META[active]?.color }}>
          {RATING_META[active]?.emoji} {RATING_META[active]?.label}
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RATING DISTRIBUTION BAR
══════════════════════════════════════════════════════════════════ */
const RatingBar = ({ star, count, total, active, onClick }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all ${active ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-white'}`}>
      <span className="w-3 text-xs text-gray-500 font-semibold text-right shrink-0">{star}</span>
      <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-5 text-right shrink-0">{count}</span>
    </button>
  );
};

/* ══════════════════════════════════════════════════════════════════
   REVIEW FORM — write & edit
══════════════════════════════════════════════════════════════════ */
function ReviewForm({ listingId, existingReview, onSuccess, onCancel, currentUser }) {
  const [rating,  setRating]  = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.review || '');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const isEdit = !!existingReview;
  const charOk = comment.trim().length >= 10;

  const handleSubmit = async e => {
    e.preventDefault();
    setErr('');
    if (!rating) return setErr('Please choose a star rating.');
    if (!charOk) return setErr('Your review needs at least 10 characters.');
    setSaving(true);
    try {
      if (isEdit) await updateReview(existingReview._id, { rating, review: comment.trim() });
      else        await createReview(listingId, { rating, review: comment.trim() });
      onSuccess();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Could not save your review. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit}
      className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/60 via-white to-amber-50/40 p-6 space-y-5 shadow-sm">
      <div className="flex items-center gap-3">
        <img src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.fullname || 'You')}&background=f43f5e&color=fff&size=40`}
          alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">{currentUser?.fullname || 'You'}</p>
          <p className="text-xs text-gray-400">{isEdit ? 'Updating your review' : 'Writing a review'}</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Rating *</p>
        <StarPicker value={rating} onChange={setRating} size={32} />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your review *</p>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} maxLength={1000}
          placeholder="What made this stay special? How was the host? Any tips for future guests?"
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm leading-relaxed
            placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all resize-none" />
        <div className="flex justify-between mt-1.5">
          <p className={`text-xs font-medium transition-colors ${comment.length > 0 && !charOk ? 'text-rose-400' : 'text-gray-400'}`}>
            {comment.length > 0 && !charOk
              ? `${10 - comment.trim().length} more character${10 - comment.trim().length !== 1 ? 's' : ''} needed`
              : 'Min. 10 characters'}
          </p>
          <p className={`text-xs font-medium ${comment.length > 900 ? 'text-amber-500' : 'text-gray-300'}`}>{comment.length}/1000</p>
        </div>
      </div>
      {err && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{err}</span>
        </div>
      )}
      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving}
            className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
        )}
        <button type="submit" disabled={saving || !rating || !charOk}
          className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-bold
            hover:from-rose-600 hover:to-rose-700 disabled:opacity-40 disabled:cursor-not-allowed
            shadow-lg shadow-rose-100 hover:shadow-rose-200 transition-all flex items-center justify-center gap-2 active:scale-[.98]">
          {saving && <RefreshCw size={14} className="animate-spin" />}
          {saving ? 'Saving…' : isEdit ? 'Update Review' : 'Publish Review'}
        </button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SINGLE REVIEW CARD
══════════════════════════════════════════════════════════════════ */
function ReviewCard({ review, isOwn, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (review.review || '').length > 200;
  const meta   = RATING_META[review.rating];
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md bg-white ${isOwn ? 'border-rose-200 ring-1 ring-rose-100' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <img src={review.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.fullname || 'G')}&background=6366f1&color=fff&size=40`}
            alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-gray-900 text-sm">{review.user?.fullname}</p>
              {isOwn && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full leading-none">Your review</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{fmtRel(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StarRow rating={review.rating} size={13} />
          {isOwn && (
            <div className="flex gap-0.5 ml-1">
              <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition"><Pencil size={12} /></button>
              <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"><Trash2 size={12} /></button>
            </div>
          )}
        </div>
      </div>
      <span className="inline-flex items-center gap-1 mb-3 px-2 py-0.5 rounded-full text-xs font-bold"
        style={{ backgroundColor: meta?.bg, color: meta?.color }}>
        {meta?.emoji} {meta?.label}
      </span>
      <div className={`relative ${!expanded && isLong ? 'max-h-[72px] overflow-hidden' : ''}`}>
        <p className="text-sm text-gray-700 leading-relaxed">
          <Quote size={11} className="text-gray-300 inline mr-1 -mt-0.5" />{review.review}
        </p>
        {!expanded && isLong && <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white pointer-events-none" />}
      </div>
      {isLong && (
        <button onClick={() => setExpanded(p => !p)} className="mt-1 text-xs font-semibold text-rose-500 hover:text-rose-700 transition flex items-center gap-1">
          <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DELETE CONFIRM DIALOG
══════════════════════════════════════════════════════════════════ */
function DeleteDialog({ open, onClose, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full z-10 space-y-4">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">Delete this review?</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">Your review will be permanently removed.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            Keep it
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <RefreshCw size={14} className="animate-spin" />}
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   GUEST COUNTER
══════════════════════════════════════════════════════════════════ */
const GuestCounter = ({ label, sublabel, value, onAdd, onSubtract, min = 0 }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div>
      <p className="font-medium text-sm">{label}</p>
      <p className="text-gray-500 text-xs">{sublabel}</p>
    </div>
    <div className="flex items-center gap-3">
      <button onClick={onSubtract} disabled={value <= min}
        className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:border-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition">
        <Minus size={14} />
      </button>
      <span className="w-4 text-center font-medium text-sm">{value}</span>
      <button onClick={onAdd}
        className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:border-gray-900 transition">
        <Plus size={14} />
      </button>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   ████  MAIN COMPONENT  ████
══════════════════════════════════════════════════════════════════ */
const ListingDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  /* ── Core data ────────────────────────────────────────────────── */
  const [listing,      setListing]      = useState(null);
  const [host,         setHost]         = useState(null);
  const [reviews,      setReviews]      = useState([]);
  const [reviewMeta,   setReviewMeta]   = useState({ total: 0, totalPages: 1, page: 1 });
  const [similar,      setSimilar]      = useState([]);
  const [allAmenities, setAllAmenities] = useState([]);

  /*
   * ─── RATING STATE ────────────────────────────────────────────
   * FIX: Separate live rating state that is kept in sync after
   * every review mutation (create / update / delete).
   *
   * liveRating      — the listing's current averageRating (number, e.g. 4.3)
   * liveReviewCount — total review count from pagination.total
   * ratingDist      — full distribution [{star, count}] fetched from
   *                   /reviews/:id/stats so bars are always accurate,
   *                   not just based on the first page of reviews.
   * ─────────────────────────────────────────────────────────────
   */
  const [liveRating,      setLiveRating]      = useState(0);
  const [liveReviewCount, setLiveReviewCount] = useState(0);
  const [ratingDist,      setRatingDist]      = useState([]); // [{star, count}]

  /* ── Auth ─────────────────────────────────────────────────────── */
  const [currentUser,     setCurrentUser]     = useState(null);
  const [eligState,       setEligState]       = useState('idle');
  const [eligibleBooking, setEligibleBooking] = useState(null);
  const [myReview,        setMyReview]        = useState(null);

  /* ── Review form UI ───────────────────────────────────────────── */
  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [reviewToast,  setReviewToast]  = useState('');

  /* ── Listing UI ───────────────────────────────────────────────── */
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [bookingLoading,   setBookingLoading]   = useState(false);
  const [bookingError,     setBookingError]     = useState('');
  const [bookingSuccess,   setBookingSuccess]   = useState('');
  const [isWishlisted,     setIsWishlisted]     = useState(false);
  const [imgIndex,         setImgIndex]         = useState(0);
  const [showPhotos,       setShowPhotos]       = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showGuests,       setShowGuests]       = useState(false);
  const [showFullDesc,     setShowFullDesc]     = useState(false);
  const [ratingFilter,     setRatingFilter]     = useState(0);
  const [bookingData, setBookingData] = useState({
    checkIn: '', checkOut: '',
    guests: { adults: 1, children: 0, infants: 0 },
  });

  /* ══════════════════════════════════════════════════════════════
     FIX: refreshRatingStats
     ──────────────────────────────────────────────────────────────
     After every review mutation we:
       1. Re-fetch the listing to get the fresh DB averageRating
          (syncListingRating on backend already updated it)
       2. Re-fetch review stats to get accurate distribution bars
       3. Re-fetch paginated reviews page 1 to keep the list fresh

     Previously this only fetched the listing and updated state,
     but the distribution bars were computed from the partial
     reviews array — now we fetch them separately from /stats.
  ══════════════════════════════════════════════════════════════ */
  const refreshRatingStats = useCallback(async (targetId) => {
    try {
      const [listingRes, statsRes, reviewsRes] = await Promise.allSettled([
        fetchListingById(targetId),
        fetchReviewStats(targetId),
        fetchListingReviews(targetId, 1, 6),
      ]);

      // ── 1. Update live rating from fresh listing data ──
      if (listingRes.status === 'fulfilled') {
        const data = listingRes.value.data?.data;
        if (data) {
          // FIX: always parse as float; guard against null/undefined/"0"
          const newRating = parseFloat(data.averageRating);
          const newCount  = Number(data.numberOfRatings) || 0;
          setLiveRating(isNaN(newRating) ? 0 : newRating);
          setLiveReviewCount(newCount);
          setListing(prev => ({
            ...prev,
            averageRating:   data.averageRating,
            numberOfRatings: data.numberOfRatings,
          }));
        }
      }

      // ── 2. Update distribution from stats endpoint ──
      // FIX: distribution was previously computed from partial reviews[].
      // Now it comes from the dedicated stats API → always complete.
      if (statsRes.status === 'fulfilled') {
        const raw = statsRes.value.data?.data?.statistics?.ratingDistribution || [];
        const dist = [5,4,3,2,1].map(star => ({
          star,
          count: raw.find(d => d._id === star)?.count || 0,
        }));
        setRatingDist(dist);
      }

      // ── 3. Refresh first page of reviews ──
      if (reviewsRes.status === 'fulfilled') {
        const { reviews: rv, pagination } = reviewsRes.value.data.data;
        const refreshedReviews = rv || [];
        setReviews(refreshedReviews);
        setReviewMeta(pagination || { total: 0, totalPages: 1, page: 1 });
        // Use pagination.total as the authoritative count
        if (pagination?.total != null) setLiveReviewCount(pagination.total);
        // Safety net: recalculate from reviews if listing doc is still stale
        if (refreshedReviews.length > 0) {
          const avg = refreshedReviews.reduce((s, r) => s + r.rating, 0) / refreshedReviews.length;
          setLiveRating(prev => (prev === 0 ? parseFloat(avg.toFixed(1)) : prev));
        } else {
          // No reviews left (e.g. after delete) — reset to 0
          setLiveRating(0);
          setLiveReviewCount(0);
        }
      }
    } catch { /* silent — keeps last known values */ }
  }, []);

  /* ── 1. Read user from localStorage ──────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) { setEligState('idle'); return; }
      let parsed = JSON.parse(raw);
      if (parsed?.user?._id || parsed?.user?.id) parsed = parsed.user;
      if (parsed && (parsed._id || parsed.id)) {
        setCurrentUser(parsed);
      } else {
        setEligState('idle');
      }
    } catch {
      setEligState('idle');
    }
  }, []);

  /* ── 2. Load listing, reviews, similar, stats ────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [listingRes, reviewsRes, similarRes, statsRes] = await Promise.allSettled([
        fetchListingById(id),
        fetchListingReviews(id, 1, 6),
        fetchSimilarListings(id, 4),
        fetchReviewStats(id),   // FIX: fetch stats on initial load too
      ]);

      if (listingRes.status === 'fulfilled') {
        const data = listingRes.value.data.data;
        setListing(data);
        if (data.host && typeof data.host === 'object') setHost(data.host);

        // FIX: parse properly — averageRating may be 0, "0", null or a float
        const parsedRating = parseFloat(data.averageRating);
        setLiveRating(isNaN(parsedRating) ? 0 : parsedRating);
        setLiveReviewCount(Number(data.numberOfRatings) || 0);
      } else {
        setError('Failed to load listing. It may have been removed.'); return;
      }

      if (reviewsRes.status === 'fulfilled') {
        const { reviews: rv, pagination } = reviewsRes.value.data.data;
        const loadedReviews = rv || [];
        setReviews(loadedReviews);
        setReviewMeta(pagination || { total: 0, totalPages: 1, page: 1 });
        // pagination.total is the authoritative count
        if (pagination?.total != null) setLiveReviewCount(pagination.total);
        // Safety net: if listing document averageRating is 0 but reviews exist,
        // calculate it directly from the reviews so the UI never shows "No reviews yet"
        // when there are actual reviews
        if (loadedReviews.length > 0) {
          const avg = loadedReviews.reduce((s, r) => s + r.rating, 0) / loadedReviews.length;
          setLiveRating(prev => (prev === 0 ? parseFloat(avg.toFixed(1)) : prev));
        }
      }

      if (similarRes.status === 'fulfilled') setSimilar(similarRes.value.data.data || []);

      // FIX: seed distribution from stats endpoint, not from partial reviews[]
      if (statsRes.status === 'fulfilled') {
        const raw = statsRes.value.data?.data?.statistics?.ratingDistribution || [];
        const dist = [5,4,3,2,1].map(star => ({
          star,
          count: raw.find(d => d._id === star)?.count || 0,
        }));
        setRatingDist(dist);
      }
    } catch { setError('Something went wrong. Please try again.'); }
    finally  { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── 3. Amenities ─────────────────────────────────────────────── */
  useEffect(() => {
    fetchAmenities().then(d => setAllAmenities(d.data || [])).catch(() => {});
  }, []);

  /* ── 4. Eligibility check ─────────────────────────────────────── */
  const runEligibilityCheck = useCallback(async (user, targetListingId) => {
    if (!user || !targetListingId) return;
    setEligState('checking');
    try {
      // FIX: also fetch fresh listing so liveRating is never stale
      const [eligRes, reviewsRes, listingRes] = await Promise.allSettled([
        checkBookingEligibility(targetListingId),
        fetchListingReviews(targetListingId, 1, 100),
        fetchListingById(targetListingId),
      ]);

      // ── Update liveRating from freshly fetched listing document ──
      if (listingRes.status === 'fulfilled') {
        const data = listingRes.value.data?.data;
        if (data) {
          const parsed = parseFloat(data.averageRating);
          if (!isNaN(parsed)) setLiveRating(parsed);
          if (data.numberOfRatings != null) setLiveReviewCount(Number(data.numberOfRatings));
        }
      }

      let freshReviews = [];
      if (reviewsRes.status === 'fulfilled') {
        const { reviews: rv, pagination } = reviewsRes.value.data.data;
        freshReviews = rv || [];
        setReviews(freshReviews);
        setReviewMeta(pagination || { total: 0, totalPages: 1, page: 1 });
        // pagination.total is the ground truth for the count
        if (pagination?.total != null) setLiveReviewCount(pagination.total);
        // Safety net: if listing document still shows 0, derive from actual reviews
        if (freshReviews.length > 0) {
          const avg = freshReviews.reduce((s, r) => s + r.rating, 0) / freshReviews.length;
          setLiveRating(prev => (prev === 0 ? parseFloat(avg.toFixed(1)) : prev));
        }
      }

      if (eligRes.status !== 'fulfilled') { setEligState('not_eligible'); return; }
      const payload = eligRes.value?.data?.data;
      if (!payload?.eligible) { setEligState('not_eligible'); return; }

      setEligibleBooking(payload.booking);
      const uid  = String(user._id || user.id || '').trim();
      const mine = freshReviews.find(r => {
        const rid = String(r.user?._id || r.user?.id || r.user || '').trim();
        return rid.length > 0 && rid === uid;
      });

      if (mine) { setMyReview(mine); setEligState('reviewed'); }
      else       { setMyReview(null); setEligState('can_review'); }
    } catch { setEligState('not_eligible'); }
  }, []);

  const listingId = listing?._id;

  useEffect(() => {
    if (!currentUser || !listingId) return;
    runEligibilityCheck(currentUser, listingId);
  }, [currentUser, listingId, runEligibilityCheck]);

  /* ── Derived values ───────────────────────────────────────────── */
  const safeImages = listing?.images?.length > 0
    ? listing.images
    : ['https://placehold.co/800x600?text=No+Image'];

  /*
   * safeRating + displayReviewCount — SINGLE SOURCE OF TRUTH
   *
   * FIX: Previously liveRating could be left at null (shown as "0.0")
   * because liveRating was initialised to null and only updated after
   * the listing fetch. Now it's initialised to 0 and always set from
   * parseFloat(data.averageRating) so it's always a valid number.
   */
  const safeRating         = liveRating;      // always a number ≥ 0
  const displayReviewCount = liveReviewCount; // always a number ≥ 0

  /* ── 5. Photo modal keyboard nav ─────────────────────────────── */
  useEffect(() => {
    if (!showPhotos) return;
    document.body.style.overflow = 'hidden';
    const onKey = e => {
      if (e.key === 'Escape')     setShowPhotos(false);
      if (e.key === 'ArrowRight') setImgIndex(p => p === safeImages.length - 1 ? 0 : p + 1);
      if (e.key === 'ArrowLeft')  setImgIndex(p => p === 0 ? safeImages.length - 1 : p - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [showPhotos, safeImages.length]);

  /* ── Review handlers ─────────────────────────────────────────── */
  const loadMoreReviews = async () => {
    if (reviewMeta.page >= reviewMeta.totalPages) return;
    try {
      const res = await fetchListingReviews(id, reviewMeta.page + 1, 6);
      const { reviews: rv, pagination } = res.data.data;
      setReviews(prev => [...prev, ...(rv || [])]);
      setReviewMeta(pagination);
    } catch { /* silent */ }
  };

  const handleReviewSuccess = async () => {
    const msg = editTarget ? 'Review updated ✨' : 'Review published! Thank you 🎉';
    setReviewToast(msg);
    setTimeout(() => setReviewToast(''), 5000);
    setShowForm(false); setEditTarget(null);
    if (currentUser && listingId) {
      await Promise.all([
        runEligibilityCheck(currentUser, listingId),
        refreshRatingStats(listingId),
      ]);
    }
  };

  const handleEdit = review => {
    setEditTarget(review); setShowForm(true);
    setTimeout(() => document.getElementById('review-write-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteReview(deleteTarget._id);
      setDeleteTarget(null);
      setReviewToast('Review deleted.');
      setTimeout(() => setReviewToast(''), 3000);
      if (currentUser && listingId) {
        await Promise.all([
          runEligibilityCheck(currentUser, listingId),
          refreshRatingStats(listingId),
        ]);
      }
    } catch {
      setReviewToast('Could not delete review. Please try again.');
      setTimeout(() => setReviewToast(''), 4000);
    } finally { setDeleting(false); }
  };

  /* ── Booking helpers ─────────────────────────────────────────── */
  const updateGuests = (type, op) =>
    setBookingData(prev => ({
      ...prev,
      guests: {
        ...prev.guests,
        [type]: op === 'add'
          ? prev.guests[type] + 1
          : Math.max(type === 'adults' ? 1 : 0, prev.guests[type] - 1),
      },
    }));

  const totalGuests  = bookingData.guests.adults + bookingData.guests.children;
  const nights = (() => {
    if (!bookingData.checkIn || !bookingData.checkOut) return 0;
    const n = Math.ceil((new Date(bookingData.checkOut) - new Date(bookingData.checkIn)) / 86_400_000);
    return n > 0 ? n : 0;
  })();
  const nightlyTotal = listing ? listing.price * nights : 0;
  const cleaningFee  = listing?.cleaningFee || 0;
  const grandTotal   = nightlyTotal + cleaningFee;

  const handleReserve = async () => {
    setBookingError(''); setBookingSuccess('');
    if (!bookingData.checkIn || !bookingData.checkOut)
      return setBookingError('Please select check-in and check-out dates.');
    if (totalGuests > listing.maxGuests)
      return setBookingError(`Maximum ${listing.maxGuests} guests allowed.`);
    setBookingLoading(true);
    try {
      await createBookingApi({
        listingId:    listing._id,
        listingOwner: host?._id || listing.host,
        checkIn:      bookingData.checkIn,
        checkOut:     bookingData.checkOut,
        guests:       bookingData.guests,
      });
      setBookingSuccess('Booking created! Redirecting…');
      setTimeout(() => {
        const u = JSON.parse(localStorage.getItem('user'));
        navigate(u?.role === 'host' ? '/host-panel' : '/');
      }, 1500);
    } catch (err) {
      setBookingError(err?.response?.data?.message || 'Booking failed. Please try again.');
    } finally { setBookingLoading(false); }
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: listing?.title, url: window.location.href });
    else navigator.clipboard.writeText(window.location.href);
  };

  const displayAmenities = useMemo(() => {
    const matched = (listing?.amenities || [])
      .map(a => { const aid = typeof a === 'object' ? a._id : a; return allAmenities.find(x => x._id === aid); })
      .filter(Boolean);
    return showAllAmenities ? matched : matched.slice(0, 10);
  }, [listing?.amenities, allAmenities, showAllAmenities]);

  const mapCoords = listing?.location?.coordinates;
  const hasMap    = mapCoords?.lat && mapCoords?.lng;

  /*
   * FIX: dist now reads from ratingDist state (fetched from /stats endpoint)
   * instead of being computed from the partial reviews[] array.
   * This means the bars are always accurate regardless of pagination.
   */
  const dist = ratingDist.length > 0
    ? ratingDist
    : [5,4,3,2,1].map(star => ({ star, count: reviews.filter(r => r.rating === star).length }));

  const filteredReviews = useMemo(
    () => ratingFilter > 0 ? reviews.filter(r => r.rating === ratingFilter) : reviews,
    [reviews, ratingFilter]
  );

  const currentUid = String(currentUser?._id || currentUser?.id || '').trim();

  const isOwner = useMemo(() => {
    if (!currentUser || !listing) return false;
    const uid = String(currentUser._id || currentUser.id || '');
    const hid = String(listing.host?._id || listing.host || '');
    return uid.length > 0 && uid === hid;
  }, [currentUser, listing]);

  /* ── Loading / error ─────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-full w-2/3 mb-3" />
        <div className="h-4 bg-gray-100 rounded-full w-1/3 mb-8" />
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[420px] mb-8">
          <div className="col-span-2 row-span-2 bg-gray-200" />
          {[0,1,2,3].map(i => <div key={i} className="bg-gray-100" />)}
        </div>
      </div>
    </div>
  );

  if (error || !listing) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-600 px-4">
      <AlertCircle size={48} className="text-red-400" />
      <p className="text-xl font-medium">{error || 'Listing not found.'}</p>
      <button onClick={() => navigate('/')} className="px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition">
        Back to listings
      </button>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-white">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition">
          <ArrowLeft size={18} />
          <span className="hidden sm:inline text-sm font-medium">Back to listings</span>
        </button>
        <span className="font-bold text-rose-500 text-lg">Afno Ghar</span>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-full transition">
            <Share2 size={15} /> Share
          </button>
          <button onClick={() => setIsWishlisted(p => !p)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-full transition">
            <Heart size={15} className={isWishlisted ? 'fill-rose-500 text-rose-500' : ''} />
            {isWishlisted ? 'Saved' : 'Save'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-6">

        {/* TITLE
            FIX: Only show rating if safeRating > 0 to avoid "0.0" being
            shown for new listings with no reviews yet.
        */}
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">

            {/* Rating + count — kept together in one flex item so they never split */}
            {safeRating > 0 ? (
              <span className="flex items-center gap-1">
                <Star size={14} className="fill-yellow-400 text-yellow-400 shrink-0" />
                <span className="font-semibold">{safeRating.toFixed(1)}</span>
                <span className="text-gray-400 ml-0.5">
                  ({displayReviewCount} {displayReviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </span>
            ) : (
              <span className="text-gray-400 text-sm italic">No reviews yet</span>
            )}

            <span className="text-gray-300 select-none">·</span>

            {/* Location — kept together in one flex item */}
            <span className="flex items-center gap-1">
              <MapPin size={14} className="shrink-0" />
              <span>{listing.location.city}, {listing.location.state}, {listing.location.country}</span>
            </span>

            {listing.isGuestFavourite && (
              <>
                <span className="text-gray-300 select-none">·</span>
                <span className="flex items-center gap-1 text-rose-600 font-medium">
                  <Award size={14} className="shrink-0" /> Guest Favourite
                </span>
              </>
            )}
          </div>
        </div>

        {/* GALLERY */}
        <div className="relative mb-8">
          <div className={`grid gap-2 rounded-2xl overflow-hidden h-[420px]
            ${safeImages.length === 1 ? 'grid-cols-1' : safeImages.length <= 3 ? 'grid-cols-2' : 'grid-cols-4'} grid-rows-2`}>
            <div className={`${safeImages.length > 1 ? 'col-span-2 row-span-2' : 'col-span-full row-span-full'} cursor-pointer`}
              onClick={() => setShowPhotos(true)}>
              <img src={safeImages[0]} alt={listing.title} className="w-full h-full object-cover hover:opacity-95 transition" />
            </div>
            {safeImages.slice(1, 5).map((img, i) => (
              <div key={i} className="relative cursor-pointer overflow-hidden"
                onClick={() => { setImgIndex(i + 1); setShowPhotos(true); }}>
                <img src={img} alt="" className="w-full h-full object-cover hover:opacity-95 transition" />
                {i === 3 && safeImages.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                    +{safeImages.length - 5} photos
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setShowPhotos(true)}
            className="absolute bottom-4 right-4 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow text-sm font-medium hover:bg-gray-50 transition">
            Show all photos
          </button>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* ─── LEFT COLUMN ─── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Host row */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold">Hosted by {host?.fullname || 'Unknown'}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {listing.maxGuests} guests · {listing.bedrooms} bedrooms · {listing.beds} beds · {listing.bathrooms} bathrooms
                </p>
              </div>
              <img src={host?.avatar || `https://ui-avatars.com/api/?name=${host?.fullname || 'Host'}&background=10b981&color=fff`}
                alt={host?.fullname || 'Host'} onClick={() => navigate(`/profile/${host?._id}`)}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 cursor-pointer" />
            </div>

            {/* Highlights */}
            <div className="space-y-4 pb-6 border-b border-gray-200">
              {[
                { icon: <Home size={24}/>, title: `Entire ${listing.category?.name || 'place'}`, sub: "You'll have the entire place to yourself" },
                { icon: <Check size={24}/>, title: 'Enhanced Clean', sub: 'This host committed to enhanced cleaning process' },
                { icon: <Clock size={24}/>, title: 'Free cancellation', sub: 'Full refund if cancelled 24 hours before check-in' },
              ].map(({ icon, title, sub }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="text-gray-700 mt-0.5">{icon}</div>
                  <div><p className="font-medium">{title}</p><p className="text-gray-500 text-sm">{sub}</p></div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="pb-6 border-b border-gray-200">
              <div className={`relative overflow-hidden transition-all duration-300 ${!showFullDesc && listing.description?.length > 300 ? 'max-h-32' : ''}`}>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{listing.description}</p>
                {!showFullDesc && listing.description?.length > 300 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white pointer-events-none" />
                )}
              </div>
              {listing.description?.length > 300 && (
                <button onClick={() => setShowFullDesc(p => !p)}
                  className="mt-2 text-sm font-semibold text-gray-900 underline hover:no-underline transition flex items-center gap-1">
                  {showFullDesc ? 'Show less' : 'Show more'}
                  <ChevronDown size={14} className={`transition-transform ${showFullDesc ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Tags */}
            {listing.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-6 border-b border-gray-200">
                {listing.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">#{tag}</span>
                ))}
              </div>
            )}

            {/* Amenities */}
            <div className="pb-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold mb-4">What this place offers</h3>
              {listing.amenities.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No amenities listed yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {displayAmenities.map(amenity => (
                    <div key={amenity._id} className="flex items-center gap-3 text-gray-700">
                      <span className="text-xl w-7 text-center">{amenity.icon}</span>
                      <span className="text-sm">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {listing.amenities.length > 10 && (
                <button onClick={() => setShowAllAmenities(p => !p)}
                  className="mt-4 px-6 py-3 border border-gray-900 rounded-lg hover:bg-gray-50 transition font-medium text-sm">
                  {showAllAmenities ? 'Show less' : `Show all ${listing.amenities.length} amenities`}
                </button>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════
                REVIEWS SECTION
            ══════════════════════════════════════════════════════════ */}
            <div className="pb-8 border-b border-gray-200" id="reviews-section">

              {/* Section header — rating + count in one flex item so · never orphans */}
              <div className="flex items-center gap-2 mb-6">
                {safeRating > 0 ? (
                  <span className="flex items-center gap-2 text-xl font-semibold">
                    <Star size={20} className="fill-yellow-400 text-yellow-400 shrink-0" />
                    <span>{safeRating.toFixed(1)}</span>
                    <span className="text-gray-300 font-normal">·</span>
                    <span>{displayReviewCount} {displayReviewCount === 1 ? 'review' : 'reviews'}</span>
                  </span>
                ) : (
                  <span className="text-xl font-semibold text-gray-800">
                    {displayReviewCount > 0
                      ? `${displayReviewCount} ${displayReviewCount === 1 ? 'review' : 'reviews'}`
                      : 'Reviews'}
                  </span>
                )}
              </div>

              {/* Rating overview panel
                  FIX: dist comes from ratingDist state (stats API), not
                  partial reviews[]. Large number shows safeRating (live).
              */}
              {displayReviewCount > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex flex-col justify-center">
                    <p className="text-5xl font-bold text-gray-900 leading-none mb-2">
                      {safeRating > 0 ? safeRating.toFixed(1) : '—'}
                    </p>
                    <StarRow rating={Math.round(safeRating)} size={16} />
                    <p className="text-sm text-gray-500 mt-1.5">
                      {displayReviewCount} {displayReviewCount === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {dist.map(({ star, count }) => (
                      <RatingBar key={star} star={star} count={count} total={displayReviewCount}
                        active={ratingFilter === star}
                        onClick={() => setRatingFilter(ratingFilter === star ? 0 : star)} />
                    ))}
                    {ratingFilter > 0 && (
                      <button onClick={() => setRatingFilter(0)}
                        className="text-xs text-rose-500 font-semibold hover:text-rose-700 transition mt-1 flex items-center gap-1 pl-2">
                        <X size={11} /> Clear filter
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Write-review area */}
              <div id="review-write-area" className="mb-8">

                {!currentUser && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Have you stayed here?</p>
                      <p className="text-xs text-gray-500 mt-0.5">Log in to share your experience</p>
                    </div>
                    <button onClick={() => navigate('/login')}
                      className="shrink-0 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition ml-3">
                      Log in
                    </button>
                  </div>
                )}

                {eligState === 'checking' && (
                  <div className="animate-pulse flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded-full w-48" />
                      <div className="h-2.5 bg-gray-100 rounded-full w-32" />
                    </div>
                  </div>
                )}

                {currentUser && eligState === 'not_eligible' && !isOwner && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Book first to leave a review</p>
                      <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                        Only guests with a completed booking can review this listing.
                      </p>
                    </div>
                  </div>
                )}

                {eligState === 'can_review' && !showForm && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4
                    p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400
                        flex items-center justify-center shadow-md shadow-amber-100 shrink-0">
                        <Star size={20} className="text-white fill-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight">You stayed here — share your experience!</p>
                        {eligibleBooking && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                            <Calendar size={11} className="shrink-0" />
                            {fmtShort(eligibleBooking.checkIn)} → {fmtShort(eligibleBooking.checkOut)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { setEditTarget(null); setShowForm(true); }}
                      className="shrink-0 flex items-center gap-2 px-5 py-2.5
                        bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl
                        text-sm font-bold hover:from-amber-600 hover:to-rose-600
                        shadow-md shadow-amber-200 transition-all active:scale-[.97]">
                      <Pencil size={14} /> Write a Review
                    </button>
                  </div>
                )}

                {showForm && (
                  <ReviewForm listingId={id} existingReview={editTarget}
                    onSuccess={handleReviewSuccess}
                    onCancel={() => { setShowForm(false); setEditTarget(null); }}
                    currentUser={currentUser} />
                )}

                {eligState === 'reviewed' && !showForm && myReview && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <CheckCircle size={14} className="text-emerald-600" />
                        </div>
                        <p className="text-sm font-bold text-emerald-800">Your review</p>
                        <span className="text-emerald-400">·</span>
                        <p className="text-xs text-emerald-600">{fmtRel(myReview.createdAt)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(myReview)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition">
                          <Pencil size={11} /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(myReview)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <StarRow rating={myReview.rating} size={15} />
                      <span className="text-xs font-bold" style={{ color: RATING_META[myReview.rating]?.color }}>
                        {RATING_META[myReview.rating]?.emoji} {RATING_META[myReview.rating]?.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <Quote size={11} className="text-gray-300 inline mr-1" />{myReview.review}
                    </p>
                  </div>
                )}

                {reviewToast && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700">
                    <CheckCircle size={15} /> {reviewToast}
                  </div>
                )}
              </div>

              {/* Public reviews list */}
              {filteredReviews.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm font-medium">
                    {ratingFilter > 0 ? `No ${ratingFilter}-star reviews yet.` : 'No reviews yet. Be the first to leave one!'}
                  </p>
                  {ratingFilter > 0 && (
                    <button onClick={() => setRatingFilter(0)} className="mt-2 text-xs text-rose-500 font-semibold hover:text-rose-700 transition">
                      Clear filter
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {ratingFilter > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-500">
                        Showing {filteredReviews.length} {ratingFilter}★ review{filteredReviews.length !== 1 ? 's' : ''}
                      </span>
                      <button onClick={() => setRatingFilter(0)} className="text-xs text-rose-500 font-semibold flex items-center gap-0.5 hover:text-rose-700">
                        <X size={11} /> Clear
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredReviews.map(review => {
                      const rid = String(review.user?._id || review.user?.id || review.user || '').trim();
                      const isOwn = currentUid.length > 0 && rid === currentUid &&
                        (eligState === 'can_review' || eligState === 'reviewed');
                      return (
                        <ReviewCard key={review._id} review={review} isOwn={isOwn}
                          onEdit={() => handleEdit(review)} onDelete={() => setDeleteTarget(review)} />
                      );
                    })}
                  </div>
                  {reviewMeta.page < reviewMeta.totalPages && ratingFilter === 0 && (
                    <button onClick={loadMoreReviews}
                      className="mt-6 px-6 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition font-semibold text-sm">
                      Show more reviews ({displayReviewCount - reviews.length} remaining)
                    </button>
                  )}
                </>
              )}
            </div>

            {/* MAP */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Where you'll be</h3>
              <p className="text-gray-700 mb-1">{listing.location.city}, {listing.location.state}, {listing.location.country}</p>
              <p className="text-gray-500 text-sm mb-4">{listing.location.street}, {listing.location.zipCode}</p>
              {hasMap ? (
                <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <MapContainer center={[mapCoords.lat, mapCoords.lng]} zoom={14}
                    style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                    <Marker position={[mapCoords.lat, mapCoords.lng]}>
                      <Popup>
                        <p className="font-semibold text-sm">{listing.title}</p>
                        <p className="text-gray-500 text-xs">{listing.location.city}, {listing.location.country}</p>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              ) : (
                <div className="w-full h-56 bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 border border-gray-200">
                  <MapPin size={28} /><p className="font-medium">Map unavailable</p>
                  <p className="text-sm">No coordinates for this listing</p>
                </div>
              )}
              <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
                <MapPin size={12} /> Exact location provided after booking
              </p>
            </div>
          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">

              {/* Booking card */}
              <div id="booking-card" className="border border-gray-200 rounded-2xl shadow-lg p-6">
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">${listing.price}</span>
                    <span className="text-gray-500 text-sm">/ night</span>
                  </div>
                  {/* FIX: show listing rating in booking card too */}
                  {safeRating > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{safeRating.toFixed(1)}</span>
                      <span className="text-gray-400 text-xs">({displayReviewCount})</span>
                    </div>
                  )}
                </div>
                <div className="border border-gray-300 rounded-xl overflow-hidden mb-3">
                  <div className="grid grid-cols-2 divide-x divide-gray-300">
                    <div className="p-3">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1">Check-in</label>
                      <input type="date" value={bookingData.checkIn}
                        onChange={e => setBookingData(p => ({ ...p, checkIn: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full text-sm focus:outline-none bg-transparent" />
                    </div>
                    <div className="p-3">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1">Checkout</label>
                      <input type="date" value={bookingData.checkOut}
                        onChange={e => setBookingData(p => ({ ...p, checkOut: e.target.value }))}
                        min={bookingData.checkIn
                          ? new Date(new Date(bookingData.checkIn).getTime() + 86_400_000).toISOString().split('T')[0]
                          : new Date().toISOString().split('T')[0]}
                        className="w-full text-sm focus:outline-none bg-transparent" />
                    </div>
                  </div>
                  <div className="border-t border-gray-300">
                    <button onClick={() => setShowGuests(p => !p)} className="w-full p-3 text-left hover:bg-gray-50 transition">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1">Guests</p>
                      <p className="text-sm">
                        {totalGuests} {totalGuests === 1 ? 'guest' : 'guests'}
                        {bookingData.guests.infants > 0 && `, ${bookingData.guests.infants} infant${bookingData.guests.infants > 1 ? 's' : ''}`}
                      </p>
                    </button>
                    {showGuests && (
                      <div className="p-4 border-t border-gray-200">
                        <GuestCounter label="Adults" sublabel="Ages 13+" value={bookingData.guests.adults}
                          onAdd={() => updateGuests('adults','add')} onSubtract={() => updateGuests('adults','subtract')} min={1} />
                        <GuestCounter label="Children" sublabel="Ages 2–12" value={bookingData.guests.children}
                          onAdd={() => updateGuests('children','add')} onSubtract={() => updateGuests('children','subtract')} />
                        <GuestCounter label="Infants" sublabel="Under 2" value={bookingData.guests.infants}
                          onAdd={() => updateGuests('infants','add')} onSubtract={() => updateGuests('infants','subtract')} />
                        <button onClick={() => setShowGuests(false)}
                          className="w-full mt-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm font-medium">Close</button>
                      </div>
                    )}
                  </div>
                </div>

                {bookingError && <p className="text-rose-500 text-sm mb-3 flex items-center gap-1"><AlertCircle size={14} /> {bookingError}</p>}
                {bookingSuccess && <p className="text-green-600 text-sm mb-3 flex items-center gap-1"><Check size={14} /> {bookingSuccess}</p>}

                {isOwner ? (
                  <div className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium text-center">This is your listing</div>
                ) : !currentUser ? (
                  <button onClick={() => navigate('/login')} className="w-full py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition">
                    Log in to Reserve
                  </button>
                ) : (
                  <button onClick={handleReserve} disabled={bookingLoading}
                    className="w-full py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 active:scale-[.98] transition disabled:opacity-60 flex items-center justify-center gap-2">
                    {bookingLoading && <Loader2 size={16} className="animate-spin" />} Reserve
                  </button>
                )}
                <p className="text-center text-gray-500 text-sm mt-2">You won't be charged yet</p>

                {nights > 0 && (
                  <div className="mt-4 space-y-2 pt-4 border-t border-gray-100 text-sm">
                    <div className="flex justify-between">
                      <span className="underline">${listing.price} × {nights} nights</span><span>${nightlyTotal}</span>
                    </div>
                    {cleaningFee > 0 && (
                      <div className="flex justify-between"><span className="underline">Cleaning fee</span><span>${cleaningFee}</span></div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
                      <span>Total</span><span>${grandTotal}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Host card
                  FIX: Show BOTH safeRating (star average) AND displayReviewCount
                  so the host card reflects the real listing rating, not just count.
              */}
              <div className="border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <img src={host?.avatar || `https://ui-avatars.com/api/?name=${host?.fullname || 'Host'}&background=10b981&color=fff`}
                    alt={host?.fullname || 'Host'}
                    className="w-12 h-12 rounded-full object-cover cursor-pointer"
                    onClick={() => navigate(`/profile/${host?._id}`)} />
                  <div>
                    <p className="font-semibold">{host?.fullname || 'Unknown Host'}</p>
                    <p className="text-gray-500 text-xs">Hosting since {host?.createdAt ? new Date(host.createdAt).getFullYear() : '...'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {/*
                    FIX: Left cell now shows the listing's star average rating
                    (safeRating) — previously it only showed review count with
                    a star icon which was misleading (looked like a rating but
                    was actually the count number).

                    Right cell still shows "Verified" identity badge.
                  */}
                  <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="font-bold text-base leading-none">
                        {safeRating > 0 ? safeRating.toFixed(1) : '—'}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">{displayReviewCount} {displayReviewCount === 1 ? 'Review' : 'Reviews'}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
                    <Shield size={16} className="text-green-500 mb-1" />
                    <span className="font-semibold text-xs">Verified</span>
                    <span className="text-gray-500 text-xs">Identity</span>
                  </div>
                </div>

                {eligState === 'can_review' && (
                  <button onClick={() => { setEditTarget(null); setShowForm(true); document.getElementById('review-write-area')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl text-sm font-bold
                      hover:from-amber-600 hover:to-rose-600 transition flex items-center justify-center gap-2 shadow-sm active:scale-[.97]">
                    <Star size={14} className="fill-white" /> Write a Review
                  </button>
                )}

                {eligState === 'reviewed' && (
                  <button onClick={() => document.getElementById('review-write-area')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-2">
                    <CheckCircle size={14} /> View your review
                  </button>
                )}

                <button className="w-full py-2.5 border border-gray-900 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Contact Host
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* SIMILAR LISTINGS */}
        {similar.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-2xl font-semibold mb-6">Similar listings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map(item => (
                <div key={item._id} onClick={() => navigate(`/listing/${item._id}`)} className="cursor-pointer group">
                  <div className="rounded-xl overflow-hidden aspect-[4/3] mb-2">
                    <img src={item.images?.[0]} alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  </div>
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.location?.city}, {item.location?.country}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-sm font-semibold">${item.price}</span>
                    <span className="font-normal text-gray-500 text-sm"> night</span>
                    {item.averageRating > 0 && (
                      <span className="ml-auto flex items-center gap-0.5 text-xs text-gray-500">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-gray-700">{Number(item.averageRating).toFixed(1)}</span>
                        <span className="text-gray-400">({item.numberOfRatings ?? 0})</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* PHOTO MODAL */}
      {showPhotos && (
        <div className="fixed inset-0 z-50 bg-black overflow-y-auto" role="dialog" aria-modal="true">
          <div className="sticky top-0 bg-black/80 backdrop-blur px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-semibold">All Photos</h2>
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-sm">{imgIndex + 1} / {safeImages.length}</span>
              <button onClick={() => setShowPhotos(false)} className="text-white p-2 hover:bg-white/10 rounded-full transition"><X size={20} /></button>
            </div>
          </div>
          <div className="relative max-w-4xl mx-auto px-4 py-6">
            <img src={safeImages[imgIndex]} alt="" className="w-full rounded-xl object-contain max-h-[75vh]" />
            <button onClick={() => setImgIndex(p => p === 0 ? safeImages.length - 1 : p - 1)}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition" aria-label="Previous photo">
              <ChevronLeft />
            </button>
            <button onClick={() => setImgIndex(p => p === safeImages.length - 1 ? 0 : p + 1)}
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition" aria-label="Next photo">
              <ChevronRight />
            </button>
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-10 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {safeImages.map((img, i) => (
              <img key={i} src={img} alt="" onClick={() => setImgIndex(i)}
                className={`w-full aspect-square object-cover rounded-lg cursor-pointer transition ${i === imgIndex ? 'ring-2 ring-white opacity-100' : 'opacity-60 hover:opacity-100'}`} />
            ))}
          </div>
        </div>
      )}

      {/* MOBILE STICKY BAR */}
      {!isOwner && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-4 shadow-lg">
          <div>
            <span className="text-lg font-bold">${listing.price}</span>
            <span className="text-gray-500 text-sm"> / night</span>
            {safeRating > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                <span className="font-semibold">{safeRating.toFixed(1)}</span>
                <span>· {displayReviewCount} {displayReviewCount === 1 ? 'review' : 'reviews'}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => !currentUser ? navigate('/login') : document.getElementById('booking-card')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition text-sm">
            {!currentUser ? 'Log in to Reserve' : 'Reserve'}
          </button>
        </div>
      )}

      {/* DELETE DIALOG */}
      <DeleteDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm} loading={deleting} />
    </div>
  );
};

export default ListingDetail;