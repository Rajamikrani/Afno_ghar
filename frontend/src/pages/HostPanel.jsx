import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleLogout } from '../utils/logout';
import {
  Home, Calendar, Star, Lock, LogOut, ChevronRight, MapPin,
  Clock, CheckCircle, XCircle, AlertCircle, Camera, Eye, EyeOff,
  X, Upload, Bed, Bath, Users, ArrowLeft, Edit2, Trash2,
  Search, DollarSign, Plus, BarChart2, Package, RefreshCw,
  ExternalLink, User, Bell, FileText, Phone, Mail, MessageSquare,
  AlertTriangle, Info, ThumbsUp, Pencil, StarOff, MessageCircle,
  Filter, SortAsc, TrendingUp, Award, ChevronDown, Quote
} from 'lucide-react';
import {
  getCurrentUser, logoutUser, updateUserDetails, updateUserAvatar,
  changePassword, getMyBookings, getMyListings,
  getHostBookingRequests, updateBookingStatus, cancelBooking,
  fetchListingReviews, createReview, deleteReview, updateReview,
  /* FIX: import deleteListing which was previously missing */
  deleteListing,
} from '../service/api';

/* ─────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────── */
const fmt    = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtRel = d => {
  const diff = Date.now() - new Date(d);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return fmt(d);
};
const nights     = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
const guestCount = g => { if (!g) return 1; if (typeof g === 'number') return g; return (g.adults || 1) + (g.children || 0); };
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/* ─────────────────────────────────────────────────────────────────────
   ATTACH REVIEWS TO BOOKINGS
───────────────────────────────────────────────────────────────────── */
const attachReviewsToBookings = async (bookings, currentUserId = null) => {
  if (!bookings.length) return bookings;

  const eligible = bookings.filter(
    b => b.status === 'confirmed' && new Date(b.checkOut) < new Date()
  );
  if (!eligible.length) return bookings;

  const listingIds = [...new Set(eligible.map(b => String(b.listing?._id || b.listing)))];

  const reviewFetches = listingIds.map(lid =>
    fetchListingReviews(lid, 1, 100)
      .then(r => ({ lid, reviews: r.data?.data?.reviews || [] }))
      .catch(() => ({ lid, reviews: [] }))
  );
  const results   = await Promise.all(reviewFetches);
  const reviewMap = {};
  results.forEach(({ lid, reviews }) => { reviewMap[lid] = reviews; });

  return bookings.map(b => {
    const lid     = String(b.listing?._id || b.listing);
    const reviews = reviewMap[lid] || [];

    const guestId = String(b.user?._id         || b.user);
    const hostId  = String(b.listingOwner?._id || b.listingOwner);

    const gr = reviews.find(r => String(r.user?._id || r.user) === guestId);
    const hr = reviews.find(r => String(r.user?._id || r.user) === hostId);

    return {
      ...b,
      guestReview: gr
        ? { _id: gr._id, rating: gr.rating, review: gr.review, createdAt: gr.createdAt }
        : null,
      hostReview: hr
        ? { _id: hr._id, rating: hr.rating, review: hr.review, createdAt: hr.createdAt }
        : null,
    };
  });
};

/* ─────────────────────────────────────────────────────────────────────
   STAR PICKER
───────────────────────────────────────────────────────────────────── */
function StarPicker({ value, onChange, size = 'w-7 h-7', readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" disabled={readonly}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange(n)}
          className={`focus:outline-none transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}>
          <Star className={`${size} transition-colors ${n <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}`} />
        </button>
      ))}
    </div>
  );
}

const Stars = ({ rating, size = 'w-3.5 h-3.5' }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(s => (
      <Star key={s} className={`${size} ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}`} />
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────────────────────────────── */
const StatusBadge = ({ status, size = 'sm' }) => {
  const MAP = {
    pending:   { label: 'Pending',   cls: 'bg-amber-50   text-amber-700   border-amber-200',   Icon: Clock        },
    confirmed: { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle  },
    cancelled: { label: 'Cancelled', cls: 'bg-red-50     text-red-600     border-red-200',     Icon: XCircle      },
    rejected:  { label: 'Rejected',  cls: 'bg-gray-50    text-gray-600    border-gray-200',    Icon: AlertCircle  },
    active:    { label: 'Active',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle  },
    completed: { label: 'Completed', cls: 'bg-blue-50    text-blue-700    border-blue-200',    Icon: CheckCircle  },
  };
  const { label, cls, Icon } = MAP[status] || MAP.pending;
  const pad = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 ${pad} rounded-full font-semibold border ${cls}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   TOAST
───────────────────────────────────────────────────────────────────── */
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const MAP = {
    success: { bg: 'bg-emerald-600', Icon: CheckCircle  },
    error:   { bg: 'bg-red-600',     Icon: XCircle      },
    info:    { bg: 'bg-rose-500',    Icon: Info          },
    warning: { bg: 'bg-amber-500',   Icon: AlertTriangle },
  };
  const { bg, Icon } = MAP[type] || MAP.info;
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl ${bg}`}
      style={{ animation: 'slideUp .3s ease' }}>
      <Icon className="w-4 h-4 shrink-0" />{msg}
      <button onClick={onClose}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   MODAL SHELL
───────────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, children, maxW = 'max-w-2xl' }) {
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className={`relative bg-white rounded-3xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()} style={{ animation: 'modalIn .25s cubic-bezier(.34,1.56,.64,1)' }}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   CONFIRM DIALOG
───────────────────────────────────────────────────────────────────── */
function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" style={{ animation: 'modalIn .2s ease' }}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-semibold rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 text-sm font-semibold rounded-full text-white transition disabled:opacity-50 flex items-center gap-2 ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   ALREADY REVIEWED DIALOG
───────────────────────────────────────────────────────────────────── */
function AlreadyReviewedDialog({ open, onClose, onEdit, existingReview, isHost }) {
  if (!open || !existingReview) return null;
  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6" style={{ animation: 'modalIn .25s cubic-bezier(.34,1.56,.64,1)' }}>
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4 mx-auto">
          <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1 text-center" style={{ fontFamily: "'Fraunces', serif" }}>
          You've already reviewed this {isHost ? 'guest' : 'stay'}
        </h3>
        <p className="text-sm text-gray-400 text-center mb-5">
          Your review was submitted {fmtRel(existingReview.createdAt)}
        </p>
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Stars rating={existingReview.rating} size="w-4 h-4" />
            <span className="text-sm font-bold text-amber-700">{RATING_LABELS[existingReview.rating]}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            <Quote className="w-3.5 h-3.5 text-amber-300 inline mr-1" />
            {existingReview.review}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Keep it</button>
          <button onClick={onEdit} className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl text-sm font-bold hover:from-rose-600 hover:to-rose-700 transition shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
            <Pencil className="w-3.5 h-3.5" />Edit review
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   REVIEW WRITE / EDIT MODAL
───────────────────────────────────────────────────────────────────── */
function ReviewWriteModal({ open, onClose, booking, isHost, onSubmitted, showToast }) {
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving]   = useState(false);

  const existing = isHost ? booking?.hostReview : booking?.guestReview;

  useEffect(() => {
    if (open) {
      setRating(existing?.rating || 0);
      setComment(existing?.review || '');
    }
  }, [open, booking, isHost]);

  if (!booking) return null;
  const listing = booking.listing;
  const guest   = booking.user || booking.guest;

  const handleSubmit = async () => {
    if (!rating)                    return showToast('Please select a star rating', 'error');
    if (comment.trim().length < 10) return showToast('Comment must be at least 10 characters', 'error');
    setSaving(true);
    try {
      const listingId = booking?.listing?._id || booking?.listing;
      if (!listingId) return showToast('Listing not found', 'error');
      const res = await createReview(listingId, { rating, review: comment.trim() });
      const saved = res.data?.data;
      onSubmitted(booking._id, { _id: saved?._id, rating, review: comment.trim() }, isHost);
      onClose();
      showToast(existing ? 'Review updated!' : 'Review published!', 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to submit review', 'error');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} maxW="max-w-lg"
      title={existing ? (isHost ? 'Edit guest review' : 'Edit your review') : (isHost ? 'Review this guest' : 'Rate your stay')}>
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          {isHost ? (
            <>
              <img src={guest?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest?.fullname||'G')}&background=6366f1&color=fff&size=40`}
                alt={guest?.fullname} className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
              <div>
                <p className="font-semibold text-gray-900">{guest?.fullname}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{fmt(booking.checkIn)} → {fmt(booking.checkOut)}</p>
              </div>
            </>
          ) : (
            <>
              {listing?.images?.[0] && <img src={listing.images[0]} alt={listing?.title} className="w-12 h-12 rounded-xl object-cover border border-gray-100" />}
              <div>
                <p className="font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>{listing?.title}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{listing?.location?.city}, {listing?.location?.country}</p>
              </div>
            </>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            {isHost ? 'How was this guest?' : 'Overall rating'}
          </label>
          <div className="flex items-center gap-3">
            <StarPicker value={rating} onChange={setRating} size="w-8 h-8" />
            {rating > 0 && <span className="text-sm font-semibold text-amber-600">{RATING_LABELS[rating]}</span>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            {isHost ? 'Leave a note about this guest' : 'Share details of your experience'}
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} maxLength={1000}
            placeholder={isHost ? 'Was the guest respectful, clean, communicative?' : 'What did you love? Any suggestions?'}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition resize-none" />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-400">Minimum 10 characters</p>
            <p className={`text-xs ${comment.length > 900 ? 'text-amber-500' : 'text-gray-400'}`}>{comment.length}/1000</p>
          </div>
        </div>
        {existing && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />Submitting will update your existing review.
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !rating}
            className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-semibold hover:bg-rose-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Submitting…' : (existing ? 'Update review' : 'Submit review')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   BOOKING DETAIL MODAL
───────────────────────────────────────────────────────────────────── */
function BookingDetailModal({ booking, open, onClose, isHost, onConfirm, onReject, onCancel, actionLoading, onOpenReview, onDeleteReview }) {
  if (!booking) return null;
  const listing  = booking.listing;
  const images   = Array.isArray(listing?.images) ? listing.images.flatMap(img => img?.includes(',') ? img.split(',') : [img]) : [];
  const n        = nights(booking.checkIn, booking.checkOut);
  const guest    = booking.user || booking.guest;
  const pricePer = listing?.price || (booking.totalPrice / n);
  const isPast   = new Date(booking.checkOut) < new Date();
  const canReview = booking.status === 'confirmed' && isPast;
  const myReview  = isHost ? booking.hostReview : booking.guestReview;

  return (
    <Modal open={open} onClose={onClose} title="Booking Details">
      {images[0] && (
        <div className="relative -mx-6 -mt-6 mb-6 h-48 overflow-hidden rounded-t-2xl">
          <img src={images[0]} alt={listing?.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4"><StatusBadge status={booking.status} size="lg" /></div>
        </div>
      )}
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Property</p>
          <h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Fraunces', serif" }}>{listing?.title || 'Listing removed'}</h3>
          {listing?.location && (
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5 text-rose-400" />{listing.location.city}, {listing.location.country}</p>
          )}
        </div>
        <div className="h-px bg-gray-100" />
        {isHost && guest && (
          <>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Guest</p>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <img src={guest.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest.fullname||'G')}&background=6366f1&color=fff&size=56`}
                  alt={guest.fullname} className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-sm" />
                <div>
                  <p className="font-semibold text-gray-900">{guest.fullname}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5"><Mail className="w-3.5 h-3.5" />{guest.email}</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-gray-100" />
          </>
        )}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Stay Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100"><p className="text-xs text-emerald-600 font-medium mb-0.5">Check-in</p><p className="font-bold text-emerald-700">{fmt(booking.checkIn)}</p></div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100"><p className="text-xs text-red-600 font-medium mb-0.5">Check-out</p><p className="font-bold text-red-700">{fmt(booking.checkOut)}</p></div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-xs text-gray-400 mb-0.5">Nights</p><p className="font-bold text-gray-900">{n}</p></div>
            <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-xs text-gray-400 mb-0.5">Guests</p><p className="font-bold text-gray-900">{guestCount(booking.guests)}</p></div>
            <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-xs text-gray-400 mb-0.5">Booked</p><p className="font-bold text-gray-900 text-xs">{fmt(booking.createdAt)}</p></div>
          </div>
        </div>
        <div className="h-px bg-gray-100" />
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Price</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600"><span>${pricePer?.toFixed(2)} × {n} nights</span><span>${(pricePer * n).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100"><span>Total</span><span>${booking.totalPrice?.toFixed(2)}</span></div>
          </div>
        </div>
        {(booking.guestReview || booking.hostReview) && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Reviews</p>
              {booking.guestReview && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />Guest review</p>
                    <Stars rating={booking.guestReview.rating} />
                  </div>
                  <p className="text-sm text-gray-700">{booking.guestReview.review}</p>
                </div>
              )}
              {booking.hostReview && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5"><ThumbsUp className="w-3.5 h-3.5" />Host review</p>
                    <Stars rating={booking.hostReview.rating} />
                  </div>
                  <p className="text-sm text-gray-700">{booking.hostReview.review}</p>
                </div>
              )}
            </div>
          </>
        )}
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-400">Booking ID</p><p className="text-xs font-mono text-gray-600 mt-0.5 break-all">{booking._id}</p></div>
        <div className="space-y-3 pt-1">
          {isHost && booking.status === 'pending' && (
            <div className="flex gap-3">
              <button onClick={() => onConfirm(booking._id)} disabled={!!actionLoading}
                className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading === `confirm-${booking._id}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Confirm
              </button>
              <button onClick={() => onReject(booking._id)} disabled={!!actionLoading}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading === `reject-${booking._id}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Reject
              </button>
            </div>
          )}
          {/* FIX: was onCancel={() => {}} for host, now properly wired */}
          {!isHost && (booking.status === 'pending' || (booking.status === 'confirmed' && !isPast)) && (
            <button onClick={() => onCancel(booking._id)} disabled={!!actionLoading}
              className="w-full py-3 border border-red-300 text-red-500 font-semibold rounded-xl hover:bg-red-50 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {actionLoading === `cancel-${booking._id}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Cancel Booking
            </button>
          )}
          {canReview && (
            <div className="flex gap-2">
              <button onClick={() => { onClose(); onOpenReview(booking, isHost); }}
                className={`flex-1 py-3 font-semibold rounded-xl transition flex items-center justify-center gap-2 ${myReview ? 'border border-amber-300 text-amber-600 hover:bg-amber-50' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200'}`}>
                <Star className={`w-4 h-4 ${myReview ? 'fill-amber-400 text-amber-400' : ''}`} />
                {myReview ? (isHost ? 'Edit guest review' : 'Edit your review') : (isHost ? 'Review this guest' : 'Rate your stay')}
              </button>
              {myReview && onDeleteReview && (
                <button onClick={() => { onClose(); onDeleteReview(booking._id, myReview._id, isHost); }}
                  className="py-3 px-4 border border-red-300 text-red-500 font-semibold rounded-xl hover:bg-red-50 transition flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   PASSWORD FIELD
───────────────────────────────────────────────────────────────────── */
function PasswordField({ label, field, value, show, onToggle, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(field, e.target.value)}
          className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition"
          placeholder={`Enter ${label.toLowerCase()}`} />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, color = 'rose', delay = 0 }) => {
  const colors = { rose: 'bg-rose-50 text-rose-500', emerald: 'bg-emerald-50 text-emerald-500', amber: 'bg-amber-50 text-amber-500', blue: 'bg-blue-50 text-blue-500', purple: 'bg-purple-50 text-purple-500' };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ animation: `fadeUp .4s ease ${delay}ms both` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}><Icon className="w-5 h-5" /></div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   INLINE REVIEW MODAL
═══════════════════════════════════════════════════════════════════ */
function InlineReviewModal({ open, onClose, booking, isHost, onSubmitted, showToast }) {
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [alreadyOpen, setAlreadyOpen] = useState(false);
  const [editMode,    setEditMode]    = useState(false);

  const existing = isHost ? booking?.hostReview : booking?.guestReview;

  useEffect(() => {
    if (open) {
      setRating(existing?.rating || 0);
      setComment(existing?.review || '');
      if (existing && !editMode) {
        setAlreadyOpen(true);
      } else {
        setAlreadyOpen(false);
      }
    } else {
      setEditMode(false);
      setAlreadyOpen(false);
    }
  }, [open, booking, isHost]);

  const handleGoEdit = () => {
    setAlreadyOpen(false);
    setEditMode(true);
    setRating(existing?.rating || 0);
    setComment(existing?.review || '');
  };

  const handleAlreadyClose = () => {
    setAlreadyOpen(false);
    onClose();
  };

  if (!booking) return null;
  const listing = booking.listing;
  const guest   = booking.user || booking.guest;

  const submit = async () => {
    if (!rating) return showToast('Select a rating first', 'error');
    if (comment.trim().length < 10) return showToast('Review must be at least 10 characters', 'error');

    const listingId = booking?.listing?._id || booking?.listing;
    if (!listingId) return showToast('Listing not found', 'error');

    setSaving(true);
    try {
      const res   = await createReview(listingId, { rating, review: comment.trim() });
      const saved = res.data?.data;
      onSubmitted(booking._id, { _id: saved?._id, rating, review: comment.trim() }, isHost);
      setEditMode(false);
      onClose();
      showToast(existing ? 'Review updated! ✨' : 'Review published! 🎉', 'success');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to submit review', 'error');
    } finally { setSaving(false); }
  };

  const ratingMeta = [
    null,
    { label: 'Poor',      emoji: '😞', color: 'text-red-500'    },
    { label: 'Fair',      emoji: '😐', color: 'text-orange-400' },
    { label: 'Good',      emoji: '🙂', color: 'text-yellow-500' },
    { label: 'Very good', emoji: '😊', color: 'text-emerald-500'},
    { label: 'Excellent', emoji: '🤩', color: 'text-rose-500'   },
  ];

  if (alreadyOpen) {
    return (
      <AlreadyReviewedDialog
        open={alreadyOpen}
        onClose={handleAlreadyClose}
        onEdit={handleGoEdit}
        existingReview={existing}
        isHost={isHost}
      />
    );
  }

  const showForm = !existing || editMode;
  if (!showForm) return null;

  return (
    <Modal open={open} onClose={() => { setEditMode(false); onClose(); }} maxW="max-w-lg"
      title={existing
        ? (isHost ? '✏️ Edit guest review' : '✏️ Edit your review')
        : (isHost ? '📝 Review this guest'  : '⭐ Rate your stay')}>
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
          {isHost ? (
            <>
              <img src={guest?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest?.fullname||'G')}&background=6366f1&color=fff&size=48`}
                alt={guest?.fullname} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow" />
              <div>
                <p className="font-bold text-gray-900">{guest?.fullname}</p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{fmt(booking.checkIn)} → {fmt(booking.checkOut)}
                </p>
              </div>
            </>
          ) : (
            <>
              {listing?.images?.[0]
                ? <img src={listing.images[0]} alt={listing?.title} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow" />
                : <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center"><Home className="w-6 h-6 text-rose-400" /></div>
              }
              <div>
                <p className="font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>{listing?.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{listing?.location?.city}, {listing?.location?.country}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            {isHost ? 'Rate this guest' : 'Overall rating'}
          </p>
          <div className="flex justify-center gap-2 mb-3">
            <StarPicker value={rating} onChange={setRating} size="w-10 h-10" />
          </div>
          {rating > 0 ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">{ratingMeta[rating].emoji}</span>
              <span className={`text-base font-bold ${ratingMeta[rating].color}`}>{ratingMeta[rating].label}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Click a star to rate</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">
            {isHost ? 'Your thoughts on this guest' : 'Tell us about your experience'}
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={5} maxLength={1000}
            placeholder={isHost
              ? 'Was the guest clean, respectful, and communicative? Would you welcome them again?'
              : 'What made this stay special? What could be improved? Help future guests decide…'}
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition resize-none" />
          <div className="flex justify-between items-center mt-2">
            <p className={`text-xs font-medium ${comment.trim().length < 10 && comment.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {comment.trim().length < 10 && comment.length > 0
                ? `${10 - comment.trim().length} more characters needed`
                : 'Minimum 10 characters'}
            </p>
            <p className={`text-xs font-medium ${comment.length > 900 ? 'text-amber-500' : 'text-gray-400'}`}>
              {comment.length}/1000
            </p>
          </div>
        </div>

        {existing && (
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>This will <strong>update</strong> your existing review from {fmtRel(existing.createdAt)}.</span>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => { setEditMode(false); onClose(); }} disabled={saving}
            className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !rating || comment.trim().length < 10}
            className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl text-sm font-bold hover:from-rose-600 hover:to-rose-700 transition disabled:opacity-40 shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Submitting…' : existing ? 'Update review' : 'Publish review'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RECEIVED REVIEWS MODAL
═══════════════════════════════════════════════════════════════════ */
function ReceivedReviewsModal({ open, onClose, hostBookings }) {
  const reviews = hostBookings
    .filter(b => b.guestReview)
    .sort((a, b) => new Date(b.guestReview.createdAt) - new Date(a.guestReview.createdAt));

  return (
    <Modal open={open} onClose={onClose} maxW="max-w-2xl" title="⭐ Reviews received on your listings">
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <StarOff className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No guest reviews yet on your listings</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(b => {
            const listing = b.listing;
            const guest   = b.user || b.guest;
            const images  = Array.isArray(listing?.images)
              ? listing.images.flatMap(img => img?.includes(',') ? img.split(',') : [img])
              : [];
            return (
              <div key={b._id} className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                <div className="flex gap-3 mb-3">
                  <img src={guest?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest?.fullname||'G')}&background=6366f1&color=fff&size=40`}
                    alt={guest?.fullname} className="w-10 h-10 rounded-xl object-cover shrink-0 ring-2 ring-white" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <p className="font-semibold text-gray-900 text-sm">{guest?.fullname}</p>
                      <p className="text-xs text-gray-400">{fmtRel(b.guestReview.createdAt)}</p>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      {images[0] && <img src={images[0]} alt="" className="w-4 h-4 rounded object-cover" />}
                      <span className="truncate" style={{ fontFamily: "'Fraunces', serif" }}>{listing?.title}</span>
                    </p>
                  </div>
                </div>
                <Stars rating={b.guestReview.rating} />
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  <Quote className="w-3 h-3 text-amber-300 inline mr-1" />
                  {b.guestReview.review}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   REVIEWS TAB
═══════════════════════════════════════════════════════════════════ */
function ReviewsTab({ myBookings, hostBookings, showToast, onReviewUpdated, onReviewDeleted }) {
  const [view, setView] = useState('my-stays');
  const [filterRating,  setFilterRating]  = useState(0);
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [sort,          setSort]          = useState('newest');
  const [search,        setSearch]        = useState('');
  const [writeTarget,   setWriteTarget]   = useState(null);
  const [writeOpen,     setWriteOpen]     = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [receivedOpen,  setReceivedOpen]  = useState(false);
  const [expanded,      setExpanded]      = useState(null);

  const isHost     = view === 'as-host';
  const isReceived = view === 'received';

  const completedGuestBookings = myBookings.filter(
    b => b.status === 'confirmed' && new Date(b.checkOut) < new Date()
  );
  const completedHostBookings = hostBookings.filter(
    b => b.status === 'confirmed' && new Date(b.checkOut) < new Date()
  );

  const rawRows = isHost
    ? completedHostBookings.map(b => ({
        bookingId: b._id, booking: b,
        listing:   b.listing,
        guest:     b.user || b.guest,
        review:    b.hostReview  || null,
        reviewKey: 'hostReview',
        date:      b.hostReview?.createdAt  || b.checkOut,
      }))
    : completedGuestBookings.map(b => ({
        bookingId: b._id, booking: b,
        listing:   b.listing,
        guest:     null,
        review:    b.guestReview || null,
        reviewKey: 'guestReview',
        date:      b.guestReview?.createdAt || b.checkOut,
      }));

  const receivedRows = completedHostBookings
    .filter(b => b.guestReview)
    .map(b => ({
      bookingId: b._id, booking: b,
      listing:   b.listing,
      guest:     b.user || b.guest,
      review:    b.guestReview,
      date:      b.guestReview.createdAt,
    }));

  const displayRows = isReceived ? receivedRows : rawRows;

  const filtered = displayRows
    .filter(r => {
      if (filterRating > 0 && r.review?.rating !== filterRating) return false;
      if (!isReceived) {
        if (filterStatus === 'written' && !r.review) return false;
        if (filterStatus === 'pending' && r.review)  return false;
      }
      if (search.trim()) {
        const q   = search.toLowerCase();
        const strs = [
          r.listing?.title, r.listing?.location?.city,
          r.review?.review,
          r.guest?.fullname, r.guest?.email,
        ].map(s => (s || '').toLowerCase());
        if (!strs.some(s => s.includes(q))) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'newest')  return new Date(b.date) - new Date(a.date);
      if (sort === 'oldest')  return new Date(a.date) - new Date(b.date);
      if (sort === 'highest') return (b.review?.rating || 0) - (a.review?.rating || 0);
      if (sort === 'lowest')  return (a.review?.rating || 0) - (b.review?.rating || 0);
      return 0;
    });

  const written    = rawRows.filter(r =>  r.review);
  const pending    = rawRows.filter(r => !r.review);
  const avgWritten = written.length
    ? (written.reduce((s, r) => s + r.review.rating, 0) / written.length)
    : 0;
  const avgReceived = receivedRows.length
    ? (receivedRows.reduce((s, r) => s + r.review.rating, 0) / receivedRows.length)
    : 0;

  const dist = [5,4,3,2,1].map(star => ({
    star,
    count: written.filter(r => r.review?.rating === star).length,
    pct:   written.length
      ? Math.round(written.filter(r => r.review?.rating === star).length / written.length * 100)
      : 0,
  }));

  const openWrite = (booking) => { setWriteTarget(booking); setWriteOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { bookingId, reviewId, key } = deleteTarget;
      if (reviewId) await deleteReview(reviewId);
      onReviewDeleted(bookingId, key === 'hostReview');
      showToast('Review deleted', 'success');
      setDeleteTarget(null);
    } catch {
      showToast('Failed to delete review', 'error');
    } finally { setDeleting(false); }
  };

  useEffect(() => {
    setFilterRating(0); setFilterStatus('all'); setSearch(''); setSort('newest');
  }, [view]);

  return (
    <div className="tab-content space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage all reviews — written by you and received on your listings</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Stays eligible',   value: completedGuestBookings.length + completedHostBookings.length, sub: 'across both roles', Icon: Calendar, color: 'rose' },
          { label: 'Reviews written',  value: written.length, sub: pending.length > 0 ? `${pending.length} still pending` : 'all complete 🎉', Icon: Pencil, color: 'emerald' },
          { label: 'Avg you gave',     value: avgWritten ? avgWritten.toFixed(1) + '★' : '—', sub: 'your average rating', Icon: Star, color: 'amber' },
          { label: 'Avg received',     value: avgReceived ? avgReceived.toFixed(1) + '★' : '—', sub: `${receivedRows.length} guest review${receivedRows.length !== 1 ? 's' : ''}`, Icon: ThumbsUp, color: 'purple' },
        ].map(({ label, value, sub, Icon, color }, i) => (
          <StatCard key={label} label={label} value={value} sub={sub} icon={Icon} color={color} delay={i * 60} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        {[
          { id: 'my-stays', label: 'My stay reviews',           Icon: Star,          count: completedGuestBookings.length,
            badge: pending.filter(r => r.reviewKey === 'guestReview').length },
          { id: 'as-host',  label: 'Reviews I wrote on guests', Icon: ThumbsUp,      count: completedHostBookings.length,
            badge: rawRows.filter(r => r.reviewKey === 'hostReview' && !r.review).length },
          { id: 'received', label: 'Received on listings',      Icon: MessageCircle, count: receivedRows.length, badge: 0 },
        ].map(({ id, label, Icon, count, badge }) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex-1 justify-center ${
              view === id ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}>
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
              view === id
                ? badge > 0 ? 'bg-white text-rose-500' : 'bg-white/20 text-white'
                : badge > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {badge > 0 ? badge + ' pending' : count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-5 flex-col lg:flex-row">
        <div className="lg:w-64 shrink-0 space-y-4">
          {!isReceived && written.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />Rating breakdown
              </p>
              <div className="space-y-2.5">
                {dist.map(({ star, count, pct }) => (
                  <button key={star} onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all ${filterRating === star ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-gray-50'}`}>
                    <span className="text-xs font-bold text-gray-400 w-3 shrink-0">{star}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-4 text-right shrink-0">{count}</span>
                  </button>
                ))}
              </div>
              {filterRating > 0 && (
                <button onClick={() => setFilterRating(0)} className="mt-3 w-full text-xs text-rose-500 font-semibold hover:text-rose-700 transition text-center">Clear ×</button>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-3xl font-bold text-amber-500" style={{ fontFamily: "'Fraunces', serif" }}>
                  {avgWritten ? avgWritten.toFixed(1) : '—'}
                </p>
                {avgWritten > 0 && <Stars rating={Math.round(avgWritten)} size="w-3.5 h-3.5" />}
                <p className="text-xs text-gray-400 mt-1">average rating given</p>
              </div>
            </div>
          )}

          {receivedRows.length > 0 && (
            <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl border border-rose-100 p-5">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />Guest reviews on you
              </p>
              <p className="text-3xl font-bold text-rose-600 mb-0.5" style={{ fontFamily: "'Fraunces', serif" }}>
                {avgReceived.toFixed(1)}
              </p>
              <Stars rating={Math.round(avgReceived)} size="w-3.5 h-3.5" />
              <p className="text-xs text-rose-500 mt-1">{receivedRows.length} total review{receivedRows.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setReceivedOpen(true)}
                className="mt-3 w-full py-2 text-xs font-bold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-100 transition flex items-center justify-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />See all received
              </button>
            </div>
          )}

          {!isReceived && pending.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />{pending.length} pending
              </p>
              <div className="space-y-2">
                {pending.slice(0, 3).map(r => {
                  const thumb = r.listing?.images?.[0];
                  return (
                    <div key={r.bookingId} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-amber-100">
                      {thumb
                        ? <img src={thumb} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"><Star className="w-4 h-4 text-amber-400" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate" style={{ fontFamily: "'Fraunces', serif" }}>
                          {isHost ? (r.guest?.fullname || 'Guest') : (r.listing?.title || 'Stay')}
                        </p>
                        <p className="text-xs text-gray-400">{fmtRel(r.booking.checkOut)}</p>
                      </div>
                      <button onClick={() => openWrite(r.booking)}
                        className="shrink-0 px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition">
                        Write
                      </button>
                    </div>
                  );
                })}
                {pending.length > 3 && (
                  <p className="text-xs text-amber-600 font-medium text-center">+{pending.length - 3} more pending</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={isReceived ? 'Search by guest or comment…' : isHost ? 'Search by guest or listing…' : 'Search by listing or comment…'}
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              )}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm font-medium cursor-pointer">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </div>

          {!isReceived && (
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
                {[
                  { id: 'all',     label: 'All',     count: rawRows.length  },
                  { id: 'written', label: 'Written',  count: written.length  },
                  { id: 'pending', label: 'Pending',  count: pending.length  },
                ].map(({ id, label, count }) => (
                  <button key={id} onClick={() => setFilterStatus(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterStatus === id ? 'bg-rose-500 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                    {label} <span className="ml-0.5 opacity-60">({count})</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {[0,5,4,3,2,1].map(s => (
                  <button key={s} onClick={() => setFilterRating(filterRating === s ? 0 : s)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${filterRating === s ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-500'}`}>
                    {s === 0 ? 'All ★' : `${s}★`}
                  </button>
                ))}
              </div>
              {(search || filterRating > 0 || filterStatus !== 'all') && (
                <button onClick={() => { setSearch(''); setFilterRating(0); setFilterStatus('all'); }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-rose-500 transition flex items-center gap-1">
                  <X className="w-3 h-3" />Clear all
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 font-medium">
              Showing <span className="text-gray-700 font-bold">{filtered.length}</span> {filtered.length === 1 ? 'entry' : 'entries'}
              {filterRating > 0 && ` · filtered by ${filterRating}★`}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-14 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <StarOff className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-700 font-semibold mb-1">
                {displayRows.length === 0
                  ? isReceived ? 'No guest reviews received yet'
                    : isHost ? 'No completed guest stays yet' : 'No completed stays yet'
                  : 'No reviews match your filters'}
              </p>
              <p className="text-sm text-gray-400">
                {displayRows.length === 0
                  ? isReceived ? 'Guests will be able to review stays once completed' : 'Reviews become available after checkout'
                  : 'Try adjusting your filters or search terms'}
              </p>
              {(search || filterRating > 0 || filterStatus !== 'all') && (
                <button onClick={() => { setSearch(''); setFilterRating(0); setFilterStatus('all'); }}
                  className="mt-4 px-5 py-2 text-sm font-semibold text-rose-500 border border-rose-200 rounded-full hover:bg-rose-50 transition">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(r => {
                const isExpd    = expanded === r.bookingId;
                const images    = Array.isArray(r.listing?.images)
                  ? r.listing.images.flatMap(img => img?.includes(',') ? img.split(',') : [img])
                  : [];
                const thumbSrc  = images[0];
                const reviewText = r.review?.review || '';
                const longComment = reviewText.length > 160;
                const ratingColor = ['', 'text-red-500', 'text-orange-400', 'text-yellow-500', 'text-emerald-500', 'text-rose-500'][r.review?.rating || 0];

                return (
                  <div key={r.bookingId}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden card-hover ${
                      !isReceived && !r.review ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    {!isReceived && !r.review && (
                      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
                    )}
                    <div className="p-5">
                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden bg-gray-100">
                            {thumbSrc
                              ? <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Home className="w-7 h-7 text-gray-300" /></div>}
                          </div>
                          {(isHost || isReceived) && r.guest && (
                            <img
                              src={r.guest.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.guest.fullname||'G')}&background=6366f1&color=fff&size=36`}
                              alt={r.guest.fullname}
                              className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 truncate" style={{ fontFamily: "'Fraunces', serif" }}>
                                {(isHost || isReceived) ? (r.guest?.fullname || 'Guest') : (r.listing?.title || 'Listing removed')}
                              </p>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{r.listing?.location?.city}, {r.listing?.location?.country}</span>
                              </p>
                              {(isHost || isReceived) && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate" style={{ fontFamily: "'Fraunces', serif" }}>
                                  <Home className="w-3 h-3 shrink-0" />{r.listing?.title}
                                </p>
                              )}
                            </div>
                            {!isReceived && (
                              r.review ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700 shrink-0">
                                  <CheckCircle className="w-3 h-3" />Reviewed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-600 shrink-0">
                                  <Clock className="w-3 h-3" />Pending
                                </span>
                              )
                            )}
                          </div>

                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1.5">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {fmt(r.booking.checkIn)} → {fmt(r.booking.checkOut)}
                            <span className="text-gray-300 mx-1">·</span>
                            {nights(r.booking.checkIn, r.booking.checkOut)}n
                            <span className="text-gray-300 mx-1">·</span>
                            <span className="text-gray-400">{fmtRel(r.booking.checkOut)}</span>
                          </p>

                          {r.review ? (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Stars rating={r.review.rating} size="w-3.5 h-3.5" />
                                <span className={`text-xs font-bold ${ratingColor}`}>{RATING_LABELS[r.review.rating]}</span>
                                <span className="text-xs text-gray-300 mx-1">·</span>
                                <span className="text-xs text-gray-400">{fmtRel(r.review.createdAt)}</span>
                              </div>
                              <div className={`relative ${!isExpd && longComment ? 'max-h-14 overflow-hidden' : ''}`}>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  <Quote className="w-3.5 h-3.5 text-gray-300 inline mr-1 -mt-0.5 shrink-0" />
                                  {reviewText}
                                </p>
                                {!isExpd && longComment && (
                                  <div className="absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-t from-white pointer-events-none" />
                                )}
                              </div>
                              {longComment && (
                                <button onClick={() => setExpanded(isExpd ? null : r.bookingId)}
                                  className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition">
                                  {isExpd ? '↑ Show less' : '↓ Read more'}
                                </button>
                              )}
                            </div>
                          ) : (
                            !isReceived && (
                              <div className="mt-3 flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-dashed border-amber-200">
                                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                  <Star className="w-4 h-4 text-amber-500" />
                                </div>
                                <p className="text-xs text-amber-700 font-medium flex-1">
                                  {isHost
                                    ? 'Share feedback to help future hosts make informed decisions.'
                                    : 'Your honest review helps other travellers choose wisely.'}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {!isReceived && (
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 gap-2 flex-wrap">
                          <p className="text-xs text-gray-400">
                            {r.review ? `Last updated ${fmtRel(r.review.createdAt)}` : `Stay ended ${fmtRel(r.booking.checkOut)}`}
                          </p>
                          <div className="flex gap-2">
                            {r.review ? (
                              <>
                                <button onClick={() => openWrite(r.booking)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 transition">
                                  <Pencil className="w-3.5 h-3.5" />Edit
                                </button>
                                <button onClick={() => setDeleteTarget({ bookingId: r.bookingId, reviewId: r.review._id, key: r.reviewKey })}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition">
                                  <Trash2 className="w-3.5 h-3.5" />Delete
                                </button>
                              </>
                            ) : (
                              <button onClick={() => openWrite(r.booking)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-200 transition">
                                <Star className="w-3.5 h-3.5" />
                                {isHost ? 'Review guest' : 'Rate your stay'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <InlineReviewModal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        booking={writeTarget}
        isHost={isHost}
        onSubmitted={(bookingId, data) => onReviewUpdated(bookingId, data, isHost)}
        showToast={showToast}
      />

      <ReceivedReviewsModal
        open={receivedOpen}
        onClose={() => setReceivedOpen(false)}
        hostBookings={hostBookings}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this review?"
        message="This permanently removes your review. You can always write a new one — your experience matters!"
        confirmLabel="Yes, delete it"
        danger
        loading={deleting}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN HOST PANEL
═══════════════════════════════════════════════════════════════════ */
export default function HostPanel() {
  const navigate = useNavigate();
  const [activeTab,       setActiveTab]       = useState('dashboard');
  const [user,            setUser]            = useState(null);
  const [toast,           setToast]           = useState(null);
  const [myListings,      setMyListings]      = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [myBookings,      setMyBookings]      = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [hostBookings,    setHostBookings]    = useState([]);
  const [loadingHost,     setLoadingHost]     = useState(true);
  const [actionLoading,   setActionLoading]   = useState(null);

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewOpen,   setReviewOpen]   = useState(false);

  const [globalDeleteTarget, setGlobalDeleteTarget] = useState(null);
  const [globalDeleting,     setGlobalDeleting]     = useState(false);

  const showToast = (msg, type = 'info') => setToast({ msg, type });

  const openReviewModal = (booking, isHostReviewing) => {
    setReviewTarget({ booking, isHost: isHostReviewing });
    setReviewOpen(true);
  };

  const handleReviewUpdated = useCallback((bookingId, reviewData, isHostReviewing) => {
    const payload = reviewData
      ? { _id: reviewData._id, rating: reviewData.rating, review: reviewData.review, createdAt: new Date().toISOString() }
      : null;
    const patch = bk => bk._id === bookingId
      ? { ...bk, [isHostReviewing ? 'hostReview' : 'guestReview']: payload }
      : bk;
    setMyBookings(prev   => prev.map(patch));
    setHostBookings(prev => prev.map(patch));
  }, []);

  const handleReviewDeleted = useCallback((bookingId, isHostReviewing) => {
    const patch = bk => bk._id === bookingId
      ? { ...bk, [isHostReviewing ? 'hostReview' : 'guestReview']: null }
      : bk;
    setMyBookings(prev   => prev.map(patch));
    setHostBookings(prev => prev.map(patch));
  }, []);

  const handleGlobalDeleteReview = (bookingId, reviewId, isHostReviewing) => {
    setGlobalDeleteTarget({ bookingId, reviewId, isHostReviewing });
  };

  const confirmGlobalDelete = async () => {
    if (!globalDeleteTarget) return;
    setGlobalDeleting(true);
    try {
      const { bookingId, reviewId, isHostReviewing } = globalDeleteTarget;
      if (reviewId) await deleteReview(reviewId);
      handleReviewDeleted(bookingId, isHostReviewing);
      showToast('Review deleted', 'success');
      setGlobalDeleteTarget(null);
    } catch {
      showToast('Failed to delete review', 'error');
    } finally { setGlobalDeleting(false); }
  };

  useEffect(() => {
    getCurrentUser().then(r => { if (r.data?.data) setUser(r.data.data); }).catch(() => {});
  }, []);

  const loadListings = () => {
    setLoadingListings(true);
    getMyListings()
      .then(r => {
        const d = r.data?.data || [];
        setMyListings(d.map(l => ({
          ...l,
          images: Array.isArray(l.images)
            ? l.images.flatMap(img => img?.includes(',') ? img.split(',') : [img])
            : [],
        })));
      })
      .catch(() => showToast('Failed to load listings', 'error'))
      .finally(() => setLoadingListings(false));
  };

  const loadBookings = () => {
    setLoadingBookings(true);
    getMyBookings()
      .then(async r => {
        const d = r.data?.data;
        let bookings = Array.isArray(d) ? d : d?.booking ?? [];
        bookings = await attachReviewsToBookings(bookings);
        setMyBookings(bookings);
      })
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  };

  const loadHostBookings = () => {
    setLoadingHost(true);
    if (typeof getHostBookingRequests !== 'function') { setLoadingHost(false); return; }
    getHostBookingRequests()
      .then(async r => {
        const d = r.data?.data;
        let bookings = Array.isArray(d) ? d : d?.bookings ?? [];
        bookings = await attachReviewsToBookings(bookings);
        setHostBookings(bookings);
      })
      .catch(() => showToast('Failed to load booking requests', 'error'))
      .finally(() => setLoadingHost(false));
  };

  useEffect(() => { loadListings(); loadBookings(); loadHostBookings(); }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadBookings();
        loadHostBookings();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const onReview = () => { loadBookings(); loadHostBookings(); };
    window.addEventListener('reviewSubmitted', onReview);
    return () => window.removeEventListener('reviewSubmitted', onReview);
  }, []);

  /* FIX: was commented out — now calls real deleteListing API */
  const handleDeleteListing = async (id) => {
    try {
      await deleteListing(id);
      showToast('Listing deleted', 'success');
      loadListings();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete listing', 'error');
    }
  };

  const handleConfirm = async (bookingId, closeModal) => {
    setActionLoading(`confirm-${bookingId}`);
    try {
      await updateBookingStatus(bookingId, 'confirmed');
      showToast('Booking confirmed!', 'success');
      setHostBookings(p => p.map(b => b._id === bookingId ? { ...b, status: 'confirmed' } : b));
      closeModal?.();
    } catch (err) { showToast(err?.response?.data?.message || 'Failed to confirm', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (bookingId, closeModal) => {
    setActionLoading(`reject-${bookingId}`);
    try {
      await updateBookingStatus(bookingId, 'rejected');
      showToast('Booking rejected', 'info');
      setHostBookings(p => p.map(b => b._id === bookingId ? { ...b, status: 'rejected' } : b));
      closeModal?.();
    } catch (err) { showToast(err?.response?.data?.message || 'Failed to reject', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (bookingId, closeModal) => {
    setActionLoading(`cancel-${bookingId}`);
    try {
      await cancelBooking(bookingId);
      showToast('Booking cancelled', 'info');
      setMyBookings(p => p.map(b => b._id === bookingId ? { ...b, status: 'cancelled' } : b));
      closeModal?.();
    } catch (err) { showToast(err?.response?.data?.message || 'Failed to cancel', 'error'); }
    finally { setActionLoading(null); }
  };

  const confirmedBookings = myBookings.filter(b => b.status === 'confirmed');
  const pendingRequests   = hostBookings.filter(b => b.status === 'pending');
  const totalRevenue      = confirmedBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);
  const avgRating         = myListings.length
    ? (myListings.reduce((s, l) => s + (l.averageRating || 0), 0) / myListings.length).toFixed(1)
    : '—';

  const pendingGuestReviews = myBookings.filter(b => b.status === 'confirmed' && new Date(b.checkOut) < new Date() && !b.guestReview).length;
  const pendingHostReviews  = hostBookings.filter(b => b.status === 'confirmed' && new Date(b.checkOut) < new Date() && !b.hostReview).length;
  const totalPendingReviews = pendingGuestReviews + pendingHostReviews;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard',       Icon: BarChart2, badge: null                  },
    { id: 'listings',  label: 'My Listings',      Icon: Home,      badge: null                  },
    { id: 'requests',  label: 'Booking Requests', Icon: Bell,      badge: pendingRequests.length },
    { id: 'bookings',  label: 'My Trips',         Icon: Calendar,  badge: null                  },
    { id: 'reviews',   label: 'Reviews',          Icon: Star,      badge: totalPendingReviews   },
    { id: 'profile',   label: 'Profile',          Icon: User,      badge: null                  },
    { id: 'security',  label: 'Security',         Icon: Lock,      badge: null                  },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes modalIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        .tab-content { animation: fadeUp .25s ease; }
        .card-hover  { transition: box-shadow .2s, transform .2s; }
        .card-hover:hover { box-shadow: 0 12px 40px rgba(0,0,0,.09); transform: translateY(-2px); }
      `}</style>

      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-rose-500 transition text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />Home
            </button>
            <span className="text-gray-200">|</span>
            <span className="text-lg font-bold text-rose-500" style={{ fontFamily: "'Fraunces', serif", letterSpacing: '-0.03em' }}>Host Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {pendingRequests.length > 0 && (
              <button onClick={() => setActiveTab('requests')} className="relative p-2 text-gray-500 hover:text-amber-500 transition">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingRequests.length > 9 ? '9+' : pendingRequests.length}
                </span>
              </button>
            )}
            <button onClick={() => navigate('/list-your-home')}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition shadow-md shadow-rose-100">
              <Plus className="w-4 h-4" />Add listing
            </button>
            {user && <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname)}&background=f43f5e&color=fff`} alt={user.fullname} className="w-9 h-9 rounded-full object-cover border-2 border-rose-100" />}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-8">
        <aside className="md:w-60 shrink-0">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sticky top-24">
            <div className="flex flex-col items-center pb-5 border-b border-gray-100 mb-5">
              <div className="relative mb-3">
                <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname||'H')}&background=f43f5e&color=fff&size=80`}
                  alt="avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-100 shadow-sm" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <p className="font-semibold text-gray-900 text-sm text-center" style={{ fontFamily: "'Fraunces', serif" }}>{user?.fullname || 'Host'}</p>
              <p className="text-xs text-gray-400 mt-0.5 text-center truncate max-w-full">{user?.email}</p>
              <span className="mt-2 px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-full">Host</span>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map(({ id, label, Icon, badge }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium w-full text-left transition ${activeTab === id ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge > 0
                    ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-white text-rose-500' : 'bg-amber-100 text-amber-700'}`}>{badge}</span>
                    : activeTab !== id && <ChevronRight className="w-3.5 h-3.5 opacity-30" />}
                </button>
              ))}
              <div className="border-t border-gray-100 mt-3 pt-3">
                <button onClick={() => handleLogout().then(() => navigate('/')).catch(() => navigate('/'))}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium w-full text-left text-red-500 hover:bg-red-50 transition">
                  <LogOut className="w-4 h-4" />Sign out
                </button>
              </div>
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardTab user={user} myListings={myListings} myBookings={myBookings}
              hostBookings={hostBookings} loadingListings={loadingListings}
              pendingRequests={pendingRequests} avgRating={avgRating}
              totalRevenue={totalRevenue} actionLoading={actionLoading}
              onConfirm={handleConfirm} onReject={handleReject}
              navigate={navigate} setActiveTab={setActiveTab}
              loadAll={() => { loadListings(); loadBookings(); loadHostBookings(); showToast('Data refreshed', 'success'); }} />
          )}
          {activeTab === 'listings' && (
            <ListingsTab listings={myListings} loading={loadingListings}
              onDelete={handleDeleteListing} onRefresh={loadListings} navigate={navigate} />
          )}
          {activeTab === 'requests' && (
            <BookingRequestsTab bookings={hostBookings} loading={loadingHost}
              onRefresh={loadHostBookings} onConfirm={handleConfirm} onReject={handleReject}
              actionLoading={actionLoading} showToast={showToast} onOpenReview={openReviewModal}
              onDeleteReview={handleGlobalDeleteReview}
              onReviewUpdated={handleReviewUpdated} />
          )}
          {activeTab === 'bookings' && (
            <TripsTab bookings={myBookings} loading={loadingBookings}
              navigate={navigate} onCancel={handleCancel}
              actionLoading={actionLoading} showToast={showToast} onOpenReview={openReviewModal}
              onDeleteReview={handleGlobalDeleteReview} />
          )}
          {activeTab === 'reviews' && (
            <ReviewsTab
              myBookings={myBookings}
              hostBookings={hostBookings}
              showToast={showToast}
              onReviewUpdated={handleReviewUpdated}
              onReviewDeleted={handleReviewDeleted}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileTab user={user}
              onUpdate={updated => { setUser(p => ({ ...p, ...updated })); showToast('Profile updated', 'success'); }}
              showToast={showToast} />
          )}
          {activeTab === 'security' && <SecurityTab showToast={showToast} />}
        </main>
      </div>

      <ReviewWriteModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        booking={reviewTarget?.booking}
        isHost={reviewTarget?.isHost}
        onSubmitted={(bookingId, data, isHost) => handleReviewUpdated(bookingId, data, isHost)}
        showToast={showToast}
      />

      <ConfirmDialog
        open={!!globalDeleteTarget}
        onClose={() => setGlobalDeleteTarget(null)}
        onConfirm={confirmGlobalDelete}
        title="Delete this review?"
        message="This will permanently remove your review. You can always write a new one afterwards."
        confirmLabel="Yes, delete it"
        danger
        loading={globalDeleting}
      />

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD TAB
═══════════════════════════════════════════════════════════════════ */
function DashboardTab({ user, myListings, myBookings, hostBookings, loadingListings,
  pendingRequests, avgRating, totalRevenue, actionLoading, onConfirm, onReject,
  navigate, setActiveTab, loadAll }) {
  return (
    <div className="tab-content space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>
          Welcome back{user?.fullname ? `, ${user.fullname.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's your hosting overview</p>
      </div>
      {pendingRequests.length > 0 && (
        <button onClick={() => setActiveTab('requests')}
          className="w-full flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition text-left">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0"><Bell className="w-5 h-5 text-amber-600" /></div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">{pendingRequests.length} pending booking request{pendingRequests.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-amber-600 mt-0.5">Review and confirm or reject requests from guests</p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
        </button>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Listings"   value={myListings.length}            icon={Home}       color="rose"    delay={0}   />
        <StatCard label="Pending Requests" value={pendingRequests.length}        icon={Bell}       color="amber"   delay={80}  sub="awaiting response" />
        <StatCard label="Avg. Rating"      value={avgRating}                     icon={Star}       color="purple"  delay={160} sub="across all listings" />
        <StatCard label="Revenue"          value={`$${totalRevenue.toFixed(0)}`} icon={DollarSign} color="emerald" delay={240} sub="confirmed bookings" />
      </div>
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" />Recent Requests</h2>
            <button onClick={() => setActiveTab('requests')} className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition">View all <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingRequests.slice(0, 3).map(booking => {
              const guest = booking.user || booking.guest;
              const n = nights(booking.checkIn, booking.checkOut);
              return (
                <div key={booking._id} className="flex items-center gap-4 px-6 py-4">
                  <img src={guest?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest?.fullname||'G')}&background=6366f1&color=fff&size=40`} alt={guest?.fullname} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{guest?.fullname || 'Guest'}</p>
                    <p className="text-xs text-gray-400 truncate">{booking.listing?.title} · {n} nights</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => onConfirm(booking._id)} disabled={!!actionLoading} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full hover:bg-emerald-100 transition disabled:opacity-50">Confirm</button>
                    <button onClick={() => onReject(booking._id)} disabled={!!actionLoading} className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold rounded-full hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50">Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Package className="w-4 h-4 text-rose-400" />My Listings</h2>
          <button onClick={() => setActiveTab('listings')} className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition">View all <ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
        {loadingListings ? (
          <div className="p-6 space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="flex gap-3 animate-pulse"><div className="w-14 h-14 bg-gray-200 rounded-xl shrink-0"/><div className="flex-1 space-y-2"><div className="h-3 bg-gray-200 rounded w-2/3"/><div className="h-3 bg-gray-100 rounded w-1/2"/></div></div>)}</div>
        ) : myListings.length === 0 ? (
          <div className="p-10 text-center">
            <Home className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4">No listings yet.</p>
            <button onClick={() => navigate('/list-your-home')} className="px-5 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition">+ Add your first listing</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {myListings.slice(0, 4).map(listing => (
              <div key={listing._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition">
                <img src={listing.images[0]||'https://placehold.co/56x56?text=?'} alt={listing.title} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate" style={{ fontFamily: "'Fraunces', serif" }}>{listing.title}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/>{listing.location?.city}, {listing.location?.country}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-gray-900">${listing.price}<span className="text-xs text-gray-400 font-normal">/night</span></p>
                  {listing.averageRating > 0 && <p className="text-xs text-gray-400 flex items-center justify-end gap-0.5 mt-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400"/>{Number(listing.averageRating).toFixed(1)}</p>}
                </div>
                <button onClick={() => navigate(`/listing/${listing._id}`)} className="ml-2 p-1.5 text-gray-400 hover:text-rose-500 transition"><ExternalLink className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Plus,      label: 'Add new listing', desc: 'Publish a new property',  action: () => navigate('/list-your-home'), color: 'bg-rose-500 text-white' },
          { icon: Calendar,  label: 'Browse stays',    desc: 'Book as a guest',          action: () => navigate('/'),             color: 'bg-white border border-gray-200 text-gray-700' },
          { icon: RefreshCw, label: 'Refresh data',    desc: 'Sync latest bookings',     action: loadAll,                         color: 'bg-white border border-gray-200 text-gray-700' },
        ].map(({ icon: Icon, label, desc, action, color }) => (
          <button key={label} onClick={action} className={`${color} rounded-2xl p-5 text-left hover:shadow-md transition-all flex items-center gap-4`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.includes('rose') ? 'bg-white/20' : 'bg-gray-100'}`}><Icon className="w-5 h-5"/></div>
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className={`text-xs mt-0.5 ${color.includes('rose') ? 'text-white/70' : 'text-gray-400'}`}>{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BOOKING REQUESTS TAB
═══════════════════════════════════════════════════════════════════ */
function BookingRequestsTab({ bookings, loading, onRefresh, onConfirm, onReject, actionLoading, showToast, onOpenReview, onDeleteReview, onReviewUpdated }) {
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = bookings
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => {
      if (!search.trim()) return true;
      const q = search.toLowerCase(); const guest = b.user || b.guest;
      return b.listing?.title?.toLowerCase().includes(q) || b.listing?.location?.city?.toLowerCase().includes(q) ||
        guest?.fullname?.toLowerCase().includes(q) || guest?.email?.toLowerCase().includes(q);
    });

  const counts = {
    pending:   bookings.filter(b=>b.status==='pending').length,
    confirmed: bookings.filter(b=>b.status==='confirmed').length,
    rejected:  bookings.filter(b=>b.status==='rejected').length,
  };

  return (
    <div className="tab-content space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Booking Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage incoming reservations</p>
        </div>
        <button onClick={onRefresh} className="p-2.5 border border-gray-200 rounded-full text-gray-500 hover:text-rose-500 hover:border-rose-300 transition"><RefreshCw className="w-4 h-4"/></button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          {label:'Pending',count:counts.pending,color:'border-amber-200 bg-amber-50 text-amber-700',dot:'bg-amber-400'},
          {label:'Confirmed',count:counts.confirmed,color:'border-emerald-200 bg-emerald-50 text-emerald-700',dot:'bg-emerald-400'},
          {label:'Rejected',count:counts.rejected,color:'border-gray-200 bg-gray-50 text-gray-600',dot:'bg-gray-400'},
        ].map(({label,count,color,dot}) => (
          <button key={label} onClick={() => setFilter(label.toLowerCase())}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border font-semibold text-sm transition ${color} ${filter===label.toLowerCase()?'ring-2 ring-offset-1 ring-current':'opacity-80 hover:opacity-100'}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`}/>{label}<span className="ml-auto font-bold">{count}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by guest, listing or city…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm"/>
          {search && <button onClick={()=>setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-4 h-4"/></button>}
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1">
          {['all','pending','confirmed','rejected','cancelled'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition capitalize ${filter===f?'bg-rose-500 text-white shadow':'text-gray-500 hover:text-gray-800'}`}>{f}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="bg-white rounded-2xl p-5 animate-pulse flex gap-4"><div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0"/><div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-1/2"/><div className="h-3 bg-gray-100 rounded w-1/3"/></div></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
          <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-500 font-medium">{search||filter!=='all'?'No requests match your filter':'No booking requests yet'}</p>
          {(search||filter!=='all') && <button onClick={()=>{setFilter('all');setSearch('');}} className="mt-4 text-sm text-rose-500 font-semibold">Clear filters</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => {
            const listing  = booking.listing;
            const guest    = booking.user||booking.guest;
            const images   = Array.isArray(listing?.images)?listing.images.flatMap(img=>img?.includes(',')?img.split(','):[img]):[];
            const n        = nights(booking.checkIn, booking.checkOut);
            const isPast   = new Date(booking.checkOut)<new Date();
            const canReview = booking.status==='confirmed' && isPast;
            const hasReview = !!booking.hostReview;
            return (
              <div key={booking._id} className={`card-hover bg-white rounded-2xl border shadow-sm overflow-hidden ${booking.status==='pending'?'border-amber-200':'border-gray-100'}`}>
                {booking.status==='pending' && <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400"/>}
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-start gap-3">
                      <img src={guest?.avatar||`https://ui-avatars.com/api/?name=${encodeURIComponent(guest?.fullname||'G')}&background=6366f1&color=fff&size=44`} alt={guest?.fullname} className="w-11 h-11 rounded-xl object-cover border border-gray-100 shrink-0"/>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{guest?.fullname||'Guest'}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3"/>{guest?.email}</p>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          {images[0] && <img src={images[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100"/>}
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate" style={{fontFamily:"'Fraunces', serif"}}>{listing?.title||'Listing removed'}</p>
                            {listing?.location && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3"/>{listing.location.city}, {listing.location.country}</p>}
                          </div>
                        </div>
                        <StatusBadge status={booking.status}/>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-rose-400"/>{fmt(booking.checkIn)} → {fmt(booking.checkOut)}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-rose-400"/>{n} night{n!==1?'s':''}</span>
                        <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-400"/><span className="font-bold text-gray-700">${booking.totalPrice?.toFixed(2)}</span></span>
                      </div>
                    </div>
                  </div>
                  {hasReview && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                          <ThumbsUp className="w-3.5 h-3.5"/>Your review
                        </p>
                        <Stars rating={booking.hostReview.rating} size="w-3 h-3"/>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{booking.hostReview.review}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 gap-3 flex-wrap">
                    <button onClick={()=>{setSelected(booking);setDetailOpen(true);}} className="text-xs font-semibold text-gray-500 hover:text-rose-500 flex items-center gap-1 transition">
                      <FileText className="w-3.5 h-3.5"/>View full details
                    </button>
                    <div className="flex gap-2 flex-wrap">
                      {booking.status==='pending' && (
                        <>
                          <button onClick={()=>onReject(booking._id)} disabled={!!actionLoading} className="px-4 py-2 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition disabled:opacity-50 flex items-center gap-1.5">
                            {actionLoading===`reject-${booking._id}`?<RefreshCw className="w-3 h-3 animate-spin"/>:<XCircle className="w-3.5 h-3.5"/>}Reject
                          </button>
                          <button onClick={()=>onConfirm(booking._id)} disabled={!!actionLoading} className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-emerald-200">
                            {actionLoading===`confirm-${booking._id}`?<RefreshCw className="w-3 h-3 animate-spin"/>:<CheckCircle className="w-3.5 h-3.5"/>}Confirm
                          </button>
                        </>
                      )}
                      {canReview && (
                        <>
                          <button onClick={()=>onOpenReview(booking,true)}
                            className={`px-4 py-2 text-xs font-semibold rounded-full flex items-center gap-1.5 transition ${hasReview?'border border-amber-300 text-amber-600 hover:bg-amber-50':'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200'}`}>
                            <Star className={`w-3.5 h-3.5 ${hasReview?'fill-amber-400 text-amber-400':''}`}/>
                            {hasReview?'Edit review':'Review guest'}
                          </button>
                          {hasReview && (
                            <button onClick={()=>onDeleteReview(booking._id, booking.hostReview?._id, true)}
                              className="px-3 py-2 text-xs font-semibold rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition flex items-center gap-1.5">
                              <Trash2 className="w-3.5 h-3.5"/>Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* FIX: onCancel wired to onReject for host context */}
      <BookingDetailModal booking={selected} open={detailOpen} onClose={()=>setDetailOpen(false)}
        isHost onConfirm={(id)=>onConfirm(id,()=>setDetailOpen(false))}
        onReject={(id)=>onReject(id,()=>setDetailOpen(false))}
        onCancel={(id)=>onReject(id,()=>setDetailOpen(false))}
        actionLoading={actionLoading} onOpenReview={onOpenReview} onDeleteReview={onDeleteReview}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TRIPS TAB
═══════════════════════════════════════════════════════════════════ */
function TripsTab({ bookings, loading, navigate, onCancel, actionLoading, showToast, onOpenReview, onDeleteReview }) {
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelId,   setCancelId]   = useState(null);

  const filtered = bookings
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return b.listing?.title?.toLowerCase().includes(q) || b.listing?.location?.city?.toLowerCase().includes(q) || b.status?.toLowerCase().includes(q);
    });

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b=>b.status==='pending').length,
    confirmed: bookings.filter(b=>b.status==='confirmed').length,
    cancelled: bookings.filter(b=>b.status==='cancelled').length,
  };
  const pendingReviewCount = bookings.filter(b=>b.status==='confirmed'&&new Date(b.checkOut)<new Date()&&!b.guestReview).length;

  return (
    <div className="tab-content space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>My Trips</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bookings you've made as a guest</p>
        </div>
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-full p-1">
          {['all','pending','confirmed','cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition capitalize ${filter===f?'bg-rose-500 text-white shadow':'text-gray-500 hover:text-gray-800'}`}>
              {f} {counts[f] > 0 && <span className={`ml-0.5 ${filter===f?'opacity-70':'opacity-50'}`}>({counts[f]})</span>}
            </button>
          ))}
        </div>
      </div>
      {pendingReviewCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0"><Star className="w-4 h-4 text-amber-600"/></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">{pendingReviewCount} stay{pendingReviewCount>1?'s':''} waiting for your review</p>
            <p className="text-xs text-amber-600 mt-0.5">Share your experience to help other travellers</p>
          </div>
          <button onClick={() => setFilter('confirmed')} className="text-xs font-bold text-amber-700 hover:text-amber-900 transition whitespace-nowrap">View →</button>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by listing, city or status…"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm"/>
        {search && <button onClick={()=>setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-4 h-4"/></button>}
      </div>
      {loading ? (
        <div className="grid gap-4">{[...Array(3)].map((_,i)=><div key={i} className="bg-white rounded-2xl p-5 animate-pulse flex gap-4"><div className="w-28 h-24 bg-gray-200 rounded-xl shrink-0"/><div className="flex-1 space-y-3"><div className="h-4 bg-gray-200 rounded w-1/2"/><div className="h-3 bg-gray-100 rounded w-1/3"/></div></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3"/>
          <p className="text-gray-500 font-medium">{search?`No trips found for "${search}"`:'No trips yet'}</p>
          <button onClick={()=>navigate('/')} className="mt-4 px-5 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition">Browse listings</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(booking => {
            const listing   = booking.listing;
            const images    = Array.isArray(listing?.images)?listing.images.flatMap(img=>img?.includes(',')?img.split(','):[img]):[];
            const checkOut  = new Date(booking.checkOut);
            const checkIn   = new Date(booking.checkIn);
            const n         = Math.round((checkOut-checkIn)/86400000);
            const isPast    = checkOut < new Date();
            const isActive  = checkIn<=new Date()&&checkOut>=new Date();
            const canCancel = booking.status==='pending'||(booking.status==='confirmed'&&!isPast);
            const canReview = booking.status==='confirmed'&&isPast;
            const hasReview = !!booking.guestReview;
            const displayStatus = (booking.status==='confirmed'&&isPast)?'completed':booking.status;

            return (
              <div key={booking._id} className={`card-hover bg-white rounded-2xl border shadow-sm overflow-hidden ${canReview&&!hasReview?'border-amber-300 ring-2 ring-amber-100 shadow-amber-100':'border-gray-100'}`}>
                {canReview&&!hasReview && <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400"/>}
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-36 h-36 sm:h-auto bg-gray-100 shrink-0 relative">
                    {images[0]?<img src={images[0]} alt={listing?.title} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center"><Home className="w-8 h-8 text-gray-300"/></div>}
                    {isPast&&booking.status==='confirmed'&&<div className="absolute inset-0 bg-black/25 flex items-center justify-center"><span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-full">Completed</span></div>}
                    {isActive&&<div className="absolute top-2 left-2"><span className="text-white text-xs font-bold bg-emerald-500 px-2 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>Active</span></div>}
                  </div>
                  <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate" style={{fontFamily:"'Fraunces', serif"}}>{listing?.title||'Listing removed'}</h3>
                          {listing?.location&&<p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/>{listing.location.city}, {listing.location.country}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={displayStatus}/>
                          {canReview && !hasReview && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400"/>Review needed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-rose-400"/>{fmt(booking.checkIn)} → {fmt(booking.checkOut)}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-rose-400"/>{n} night{n!==1?'s':''}</span>
                      </div>
                      {canReview && (
                        <div className="mt-4">
                          {hasReview ? (
                            <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400"/>
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-amber-800 block">Your review</span>
                                    <Stars rating={booking.guestReview.rating} size="w-3 h-3"/>
                                  </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <button onClick={()=>onOpenReview(booking,false)} title="Edit review"
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 rounded-lg transition border border-amber-200">
                                    <Pencil className="w-3 h-3"/>Edit
                                  </button>
                                  <button onClick={()=>onDeleteReview(booking._id, booking.guestReview?._id, false)} title="Delete review"
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition border border-red-200">
                                    <Trash2 className="w-3 h-3"/>Delete
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 pl-9">
                                {booking.guestReview.review}
                              </p>
                            </div>
                          ) : (
                            <button onClick={()=>onOpenReview(booking,false)}
                              className="w-full mt-1 flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl text-white shadow-md shadow-amber-200 transition-all hover:shadow-lg hover:shadow-amber-300 hover:-translate-y-0.5 active:translate-y-0 group">
                              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/30 transition">
                                <Star className="w-4 h-4 text-white"/>
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-bold leading-tight">Rate &amp; review your stay</p>
                                <p className="text-xs text-amber-100 mt-0.5">Share your experience to help other travellers</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-amber-200 group-hover:translate-x-0.5 transition-transform"/>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">${booking.totalPrice?.toFixed(2)}<span className="text-xs text-gray-400 font-normal ml-1">total</span></p>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={()=>{setSelected(booking);setDetailOpen(true);}} className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500 transition flex items-center gap-1"><FileText className="w-3 h-3"/>Details</button>
                        {listing&&<button onClick={()=>navigate(`/listing/${listing._id}`)} className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500 transition flex items-center gap-1"><ExternalLink className="w-3 h-3"/>Listing</button>}
                        {canCancel&&<button onClick={()=>setCancelId(booking._id)} disabled={!!actionLoading} className="px-3 py-1.5 text-xs font-semibold rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50 flex items-center gap-1"><XCircle className="w-3 h-3"/>Cancel</button>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <BookingDetailModal booking={selected} open={detailOpen} onClose={()=>setDetailOpen(false)}
        isHost={false} onConfirm={()=>{}} onReject={()=>{}}
        onCancel={id=>onCancel(id,()=>setDetailOpen(false))} actionLoading={actionLoading}
        onOpenReview={onOpenReview} onDeleteReview={onDeleteReview}/>
      <ConfirmDialog open={!!cancelId} onClose={()=>setCancelId(null)}
        onConfirm={async()=>{await onCancel(cancelId);setCancelId(null);}}
        title="Cancel this booking?" message="Are you sure? Cancellation policies may apply."
        confirmLabel="Yes, cancel" danger loading={actionLoading===`cancel-${cancelId}`}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LISTINGS TAB  — FIX: Edit button now navigates to /edit-listing/:id
═══════════════════════════════════════════════════════════════════ */
function ListingsTab({ listings, loading, onDelete, onRefresh, navigate }) {
  const [search,    setSearch]    = useState('');
  const [deleting,  setDeleting]  = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const filtered = listings.filter(l =>
    !search.trim() ||
    l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.location?.city?.toLowerCase().includes(search.toLowerCase())
  );

  /* FIX: actually awaits the API call */
  const handleDelete = async (id) => {
    setDeleting(id);
    await onDelete(id);
    setDeleting(null);
    setConfirmId(null);
  };

  return (
    <div className="tab-content space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>My Listings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{listings.length} propert{listings.length!==1?'ies':'y'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2.5 border border-gray-200 rounded-full text-gray-500 hover:text-rose-500 hover:border-rose-300 transition"><RefreshCw className="w-4 h-4"/></button>
          <button onClick={()=>navigate('/list-your-home')} className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition shadow-md shadow-rose-100"><Plus className="w-4 h-4"/>New listing</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your listings…"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm"/>
        {search && <button onClick={()=>setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-4 h-4"/></button>}
      </div>

      {loading ? (
        <div className="grid gap-4">{[...Array(3)].map((_,i)=><div key={i} className="bg-white rounded-2xl p-5 animate-pulse flex gap-4"><div className="w-28 h-24 bg-gray-200 rounded-xl shrink-0"/><div className="flex-1 space-y-3"><div className="h-4 bg-gray-200 rounded w-1/2"/><div className="h-3 bg-gray-100 rounded w-1/3"/></div></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
          <Home className="w-10 h-10 text-gray-300 mx-auto mb-3"/>
          <p className="text-gray-500 font-medium">{search?`No listings match "${search}"`:'No listings yet'}</p>
          {!search&&<button onClick={()=>navigate('/list-your-home')} className="mt-4 px-5 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition">+ Add your first listing</button>}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(listing => (
            <div key={listing._id} className="card-hover bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-40 h-40 sm:h-auto bg-gray-100 shrink-0">
                  {listing.images[0]
                    ? <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center"><Home className="w-8 h-8 text-gray-300"/></div>}
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate" style={{fontFamily:"'Fraunces', serif"}}>{listing.title}</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/>{listing.location?.city}, {listing.location?.country}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        listing.status === 'approved'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        listing.status === 'rejected'  ? 'bg-red-50 text-red-600 border-red-200' :
                        listing.status === 'inactive'  ? 'bg-gray-100 text-gray-400 border-gray-200' :
                                                         'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {listing.status === 'approved'  && <CheckCircle className="w-3 h-3" />}
                        {listing.status === 'pending'   && <Clock className="w-3 h-3" />}
                        {listing.status === 'rejected'  && <XCircle className="w-3 h-3" />}
                        {listing.status}
                      </span>
                    </div>

                    {/* Admin rejection note */}
                    {listing.status === 'rejected' && listing.adminNote && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{listing.adminNote}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3"/>{listing.maxGuests} guests</span>
                      <span className="flex items-center gap-1"><Bed className="w-3 h-3"/>{listing.bedrooms} bed</span>
                      <span className="flex items-center gap-1"><Bath className="w-3 h-3"/>{listing.bathrooms} bath</span>
                      {listing.averageRating>0&&<span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400"/>{Number(listing.averageRating).toFixed(1)} ({listing.numberOfRatings})</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">${listing.price}<span className="text-xs text-gray-400 font-normal ml-1">/ night</span></p>
                    <div className="flex gap-2">
                      <button onClick={()=>navigate(`/listing/${listing._id}`)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500 transition flex items-center gap-1">
                        <ExternalLink className="w-3 h-3"/>View
                      </button>
                      {/* FIX: navigates to /edit-listing/:id — matches App.jsx route */}
                      <button onClick={()=>navigate(`/edit-listing/${listing._id}`)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-500 transition flex items-center gap-1">
                        <Edit2 className="w-3 h-3"/>Edit
                      </button>
                      <button onClick={()=>setConfirmId(listing._id)} disabled={deleting===listing._id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-40 flex items-center gap-1">
                        {deleting===listing._id
                          ? <><RefreshCw className="w-3 h-3 animate-spin"/>Deleting…</>
                          : <><Trash2 className="w-3 h-3"/>Delete</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onClose={()=>setConfirmId(null)}
        onConfirm={()=>handleDelete(confirmId)}
        title="Delete this listing?"
        message="This action cannot be undone. All bookings associated with this listing may be affected."
        confirmLabel="Delete listing"
        danger
        loading={!!deleting}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROFILE TAB
═══════════════════════════════════════════════════════════════════ */
function ProfileTab({ user, onUpdate, showToast }) {
  const [form,      setForm]      = useState({ fullname: '', email: '', bio: '' });
  const [avatar,    setAvatar]    = useState(null);
  const [preview,   setPrev]      = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (user) setForm({ fullname: user.fullname||'', email: user.email||'', bio: user.bio||'' });
  }, [user]);

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setAvatar(f);
    setPrev(URL.createObjectURL(f));
  };

  const uploadAvatar = async () => {
    if (!avatar) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('avatar', avatar);
    try {
      const res = await updateUserAvatar(fd);
      const newAvatar = res.data?.data?.avatar || res.data?.data?.user?.avatar;
      if (newAvatar) {
        onUpdate({ avatar: newAvatar });
      } else {
        const u = await getCurrentUser();
        if (u.data?.data?.avatar) onUpdate({ avatar: u.data.data.avatar });
      }
      showToast('Avatar updated!', 'success');
      setAvatar(null);
      setPrev(null);
    } catch(err) {
      showToast(err?.response?.data?.message || 'Upload failed', 'error');
    } finally { setUploading(false); }
  };

  const saveProfile = async () => {
    if (!form.fullname || !form.email) { showToast('Name and email required', 'error'); return; }
    setSaving(true);
    try {
      await updateUserDetails(form);
      onUpdate(form);
      showToast('Profile saved!', 'success');
    } catch(err) {
      showToast(err?.response?.data?.message || 'Update failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="tab-content space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily:"'Fraunces', serif"}}>Your Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Camera className="w-4 h-4 text-rose-400"/>Profile Photo</h2>
        <div className="flex items-center gap-5 flex-wrap">
          <img
            src={preview || user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname||'H')}&background=f43f5e&color=fff&size=100`}
            alt="avatar" className="w-24 h-24 rounded-2xl object-cover border-2 border-rose-100 shadow-sm" />
          <div>
            <input type="file" ref={fileRef} accept="image/*" onChange={handleFile} className="hidden"/>
            <div className="flex gap-2 flex-wrap">
              <button onClick={()=>fileRef.current.click()} className="px-4 py-2 text-sm font-semibold rounded-full border border-gray-200 text-gray-700 hover:border-rose-300 hover:text-rose-500 transition flex items-center gap-2">
                <Upload className="w-3.5 h-3.5"/>Choose photo
              </button>
              {preview && (
                <button onClick={uploadAvatar} disabled={uploading} className="px-4 py-2 text-sm font-semibold rounded-full bg-rose-500 text-white hover:bg-rose-600 transition disabled:opacity-50">
                  {uploading ? 'Uploading…' : 'Save photo'}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG. Max 5MB.</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-5 flex items-center gap-2"><User className="w-4 h-4 text-rose-400"/>Personal Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full name</label>
            <input value={form.fullname} onChange={e=>setForm(p=>({...p,fullname:e.target.value}))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email address</label>
            <input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition"/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Bio</label>
            <textarea rows={3} value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))}
              placeholder="Tell guests a little about yourself as a host…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition resize-none"/>
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving}
          className="mt-5 px-6 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECURITY TAB
═══════════════════════════════════════════════════════════════════ */
function SecurityTab({ showToast }) {
  const [form,     setForm]     = useState({ oldPassword:'', newPassword:'', confirmPassword:'' });
  const [show,     setShow]     = useState({ old:false, new:false, confirm:false });
  const [saving,   setSaving]   = useState(false);
  const [strength, setStrength] = useState(0);

  const calcStrength = pw => {
    let s = 0;
    if (pw.length >= 8)            s++;
    if (/[A-Z]/.test(pw))          s++;
    if (/[0-9]/.test(pw))          s++;
    if (/[^A-Za-z0-9]/.test(pw))   s++;
    return s;
  };

  const handleChange = (field, val) => {
    setForm(p => ({ ...p, [field]: val }));
    if (field === 'newPassword') setStrength(calcStrength(val));
  };

  const strengthMeta = [
    null,
    { label: 'Weak',   color: 'bg-red-400',    text: 'text-red-400'    },
    { label: 'Fair',   color: 'bg-amber-400',   text: 'text-amber-500'  },
    { label: 'Good',   color: 'bg-blue-400',    text: 'text-blue-500'   },
    { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' },
  ];

  const handleSubmit = async () => {
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) { showToast('All fields are required', 'error'); return; }
    if (form.newPassword !== form.confirmPassword)                        { showToast('Passwords do not match', 'error'); return; }
    if (strength < 2)                                                     { showToast('Password too weak', 'error'); return; }
    setSaving(true);
    try {
      await changePassword(form);
      showToast('Password changed!', 'success');
      setForm({ oldPassword:'', newPassword:'', confirmPassword:'' });
      setStrength(0);
    } catch(err) {
      showToast(err?.response?.data?.message || 'Failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="tab-content space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily:"'Fraunces', serif"}}>Security</h1>
        <p className="text-sm text-gray-500 mt-0.5">Keep your account safe</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-5 flex items-center gap-2"><Lock className="w-4 h-4 text-rose-400"/>Change Password</h2>
        <div className="space-y-4 max-w-md">
          <PasswordField label="Current Password" field="oldPassword" value={form.oldPassword} show={show.old} onToggle={()=>setShow(p=>({...p,old:!p.old}))} onChange={handleChange}/>
          <PasswordField label="New Password" field="newPassword" value={form.newPassword} show={show.new} onToggle={()=>setShow(p=>({...p,new:!p.new}))} onChange={handleChange}/>
          {form.newPassword && (
            <div>
              <div className="flex gap-1 mb-1">
                {[1,2,3,4].map(n=>(
                  <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${n<=strength&&strengthMeta[strength]?strengthMeta[strength].color:'bg-gray-100'}`}/>
                ))}
              </div>
              {strengthMeta[strength] && <p className={`text-xs font-medium ${strengthMeta[strength].text}`}>{strengthMeta[strength].label}</p>}
            </div>
          )}
          <PasswordField label="Confirm Password" field="confirmPassword" value={form.confirmPassword} show={show.confirm} onToggle={()=>setShow(p=>({...p,confirm:!p.confirm}))} onChange={handleChange}/>
          {form.confirmPassword && (
            <p className={`text-xs font-medium flex items-center gap-1 ${form.newPassword===form.confirmPassword?'text-emerald-600':'text-red-400'}`}>
              {form.newPassword===form.confirmPassword
                ? <><CheckCircle className="w-3.5 h-3.5"/>Passwords match</>
                : <><XCircle className="w-3.5 h-3.5"/>Passwords don't match</>}
            </p>
          )}
          <div className="pt-2">
            <button onClick={handleSubmit} disabled={saving}
              className="px-6 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition disabled:opacity-50">
              {saving ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </div>
      </div>
      <div className="bg-rose-50 rounded-2xl border border-rose-100 p-5">
        <h3 className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>Password tips</h3>
        <ul className="text-xs text-rose-600 space-y-1">
          <li>• Use at least 8 characters</li>
          <li>• Mix uppercase letters, numbers and symbols (!@#$)</li>
          <li>• Avoid reusing passwords from other sites</li>
        </ul>
      </div>
    </div>
  );
}