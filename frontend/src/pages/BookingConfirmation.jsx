import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBookingById, cancelBooking } from '../service/api';
import {
  ArrowLeft, Calendar, Users, MapPin, Clock,
  CheckCircle2, XCircle, AlertCircle, Loader2,
  Home, Star, Phone, MessageCircle, X, ChevronRight
} from 'lucide-react';

// ── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  pending: {
    label: 'Pending Confirmation',
    icon: Clock,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    desc: 'Your booking request has been sent. Waiting for host approval.',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
    desc: "You're all set! Your reservation is confirmed.",
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-400',
    desc: 'This booking has been cancelled.',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });

const nights = (checkIn, checkOut) =>
  Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86_400_000);

// ── Component ────────────────────────────────────────────────────────────────
const BookingConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [cancelling, setCancelling]     = useState(false);
  const [cancelError, setCancelError]   = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSuccess, setCancelSuccess]     = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchBookingById(id);
        setBooking(res.data.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not load booking.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await cancelBooking(id);
      setCancelSuccess(true);
      setShowCancelModal(false);
      // Refresh booking data
      const res = await fetchBookingById(id);
      setBooking(res.data.data);
    } catch (err) {
      setCancelError(err?.response?.data?.message || 'Cancellation failed.');
    } finally {
      setCancelling(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="animate-spin" size={36} />
        <p className="text-sm">Loading your booking…</p>
      </div>
    </div>
  );

  if (error || !booking) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <AlertCircle size={48} className="text-red-400 mx-auto" />
        <p className="text-lg font-medium text-gray-700">{error || 'Booking not found.'}</p>
        <button onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition">
          Back to Home
        </button>
      </div>
    </div>
  );

  const status    = STATUS[booking.status] || STATUS.pending;
  const StatusIcon = status.icon;
  const listing   = booking.listing;
  const owner     = booking.listingOwner;
  const n         = nights(booking.checkIn, booking.checkOut);
  const canCancel = booking.status !== 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition text-sm font-medium">
            <ArrowLeft size={18} />
            Back to home
          </button>
          <span className="font-bold text-rose-500 text-lg">Afno Ghar</span>
          <div className="w-24" /> {/* spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Success banner (shown once after booking) ── */}
        {cancelSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <p className="text-emerald-700 text-sm font-medium">Booking cancelled successfully.</p>
          </div>
        )}

        {/* ── Booking confirmed hero ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Listing image strip */}
          {listing?.images?.[0] && (
            <div className="h-48 w-full overflow-hidden">
              <img src={listing.images[0]} alt={listing.title}
                className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6">
            {/* Status pill */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-4 ${status.bg} ${status.border} ${status.text}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              <StatusIcon size={14} />
              {status.label}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {booking.status === 'confirmed' ? '🎉 You are going to' : booking.status === 'cancelled' ? 'Booking Cancelled' : '⏳ Awaiting confirmation for'}
            </h1>
            <h2 className="text-xl text-gray-700 font-semibold mb-2">
              {listing?.title || 'Your listing'}
            </h2>
            {listing?.location && (
              <p className="text-gray-500 text-sm flex items-center gap-1">
                <MapPin size={13} />
                {listing.location.city}, {listing.location.state}, {listing.location.country}
              </p>
            )}

            <p className="mt-3 text-gray-600 text-sm">{status.desc}</p>
          </div>
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Trip details ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <h3 className="font-semibold text-gray-900 text-lg">Trip details</h3>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-rose-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Dates</p>
                <p className="text-gray-900 font-medium text-sm">{fmt(booking.checkIn)}</p>
                <p className="text-gray-500 text-xs">→</p>
                <p className="text-gray-900 font-medium text-sm">{fmt(booking.checkOut)}</p>
                <p className="text-gray-500 text-xs mt-1">{n} night{n !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                <Users size={18} className="text-rose-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Guests</p>
                <p className="text-gray-900 font-medium text-sm">
                  {booking.guests?.adults} adult{booking.guests?.adults !== 1 ? 's' : ''}
                  {booking.guests?.children > 0 && `, ${booking.guests.children} child${booking.guests.children !== 1 ? 'ren' : ''}`}
                  {booking.guests?.infants > 0 && `, ${booking.guests.infants} infant${booking.guests.infants !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                <Home size={18} className="text-rose-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Booking ID</p>
                <p className="text-gray-900 font-mono text-xs break-all">{booking._id}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Booked on {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* ── Price breakdown ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">Price breakdown</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>${booking.pricing?.nightlyPrice || listing?.price} × {n} night{n !== 1 ? 's' : ''}</span>
                <span>${(booking.pricing?.nightlyPrice || listing?.price) * n}</span>
              </div>
              {booking.pricing?.cleaningFee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Cleaning fee</span>
                  <span>${booking.pricing.cleaningFee}</span>
                </div>
              )}
              {booking.pricing?.serviceFee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Service fee</span>
                  <span>${booking.pricing.serviceFee}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>${booking.totalPrice}</span>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 leading-relaxed">
              {booking.status === 'pending'
                ? 'You will only be charged once the host confirms your booking.'
                : booking.status === 'confirmed'
                ? 'Payment has been processed successfully.'
                : 'No charge was made for this cancelled booking.'}
            </div>
          </div>
        </div>

        {/* ── Host info ── */}
        {owner && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">Your host</h3>
            <div className="flex items-center gap-4">
              <img
                src={owner.avatar ||
                  `https://ui-avatars.com/api/?name=${owner.fullname || 'Host'}&background=10b981&color=fff`}
                alt={owner.fullname}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{owner.fullname || 'Your host'}</p>
                <p className="text-gray-500 text-sm">
                  Member since {owner.createdAt
                    ? new Date(owner.createdAt).getFullYear()
                    : '—'}
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                <MessageCircle size={15} />
                Message
              </button>
            </div>
          </div>
        )}

        {/* ── What's next / checklist ── */}
        {booking.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">What's next</h3>
            <div className="space-y-4">
              {[
                {
                  done: true,
                  title: 'Booking request sent',
                  desc: 'Your request was submitted successfully.',
                },
                {
                  done: booking.status === 'confirmed',
                  title: 'Host confirmation',
                  desc: booking.status === 'confirmed'
                    ? 'The host has confirmed your stay.'
                    : 'Waiting for the host to review and confirm.',
                },
                {
                  done: false,
                  title: 'Check-in day',
                  desc: `Arrive on ${fmt(booking.checkIn)}. Check-in details will be shared by the host.`,
                },
              ].map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    step.done ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    {step.done
                      ? <CheckCircle2 size={16} className="text-emerald-600" />
                      : <span className="text-gray-400 text-xs font-bold">{i + 1}</span>
                    }
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${step.done ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button onClick={() => navigate('/')}
            className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2">
            <Home size={16} />
            Back to listings
          </button>

          {canCancel && (
            <button onClick={() => setShowCancelModal(true)}
              className="flex-1 py-3 border border-red-200 bg-red-50 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition flex items-center justify-center gap-2">
              <XCircle size={16} />
              Cancel booking
            </button>
          )}
        </div>

      </main>

      {/* ── Cancel confirmation modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg">Cancel booking?</h3>
              <button onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-2">
              You're about to cancel your booking at <strong>{listing?.title}</strong>.
            </p>
            <p className="text-gray-500 text-sm mb-5">
              If cancelled more than 24 hours before check-in, you're eligible for a full refund.
            </p>

            {cancelError && (
              <p className="text-red-500 text-sm mb-3 flex items-center gap-1">
                <AlertCircle size={14} /> {cancelError}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Keep booking
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition flex items-center justify-center gap-2">
                {cancelling && <Loader2 size={14} className="animate-spin" />}
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingConfirmation;