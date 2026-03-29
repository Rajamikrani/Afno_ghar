import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchListingById, updateListing,
  fetchCategories, fetchAmenities,
} from '../service/api';
import {
  ArrowLeft, X, Home, MapPin, DollarSign,
  Users, Bed, Bath, CheckCircle, RefreshCw,
  Image, Plus, Info, Save, Navigation, Upload, Check,
} from 'lucide-react';

/* ─── Amenity groups ─────────────────────────────────────────────────────── */
const AMENITY_GROUPS = [
  {
    id: 'essentials', label: 'Essentials', icon: '⚡',
    keywords: ['wifi', 'internet', 'kitchen', 'washer', 'dryer', 'air', 'heating', 'ac'],
    color: { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', badge: 'bg-rose-500', head: 'text-rose-600' },
  },
  {
    id: 'bathroom', label: 'Bathroom', icon: '🚿',
    keywords: ['hot water', 'bathtub', 'hair dryer', 'shower', 'towel', 'soap'],
    color: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-500', head: 'text-blue-600' },
  },
  {
    id: 'bedroom', label: 'Bedroom & Laundry', icon: '🛏',
    keywords: ['hanger', 'iron', 'tv', 'television', 'pillow', 'curtain', 'closet', 'wardrobe'],
    color: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', badge: 'bg-indigo-500', head: 'text-indigo-600' },
  },
  {
    id: 'entertainment', label: 'Entertainment', icon: '🎉',
    keywords: ['netflix', 'streaming', 'game', 'board', 'book', 'library', 'music', 'speaker'],
    color: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-500', head: 'text-amber-600' },
  },
  {
    id: 'outdoor', label: 'Outdoor & Views', icon: '🌿',
    keywords: ['pool', 'hot tub', 'bbq', 'grill', 'patio', 'balcony', 'garden', 'fire pit', 'beach', 'mountain', 'ocean', 'lake', 'yard'],
    color: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-500', head: 'text-emerald-600' },
  },
  {
    id: 'parking', label: 'Parking & Facilities', icon: '🅿️',
    keywords: ['parking', 'ev', 'elevator', 'gym', 'fitness', 'luggage', 'storage', 'workspace', 'desk'],
    color: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', badge: 'bg-slate-500', head: 'text-slate-600' },
  },
  {
    id: 'safety', label: 'Safety', icon: '🛡️',
    keywords: ['smoke', 'carbon', 'co', 'first aid', 'fire extinguisher', 'camera', 'security', 'alarm', 'lock'],
    color: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', badge: 'bg-teal-500', head: 'text-teal-600' },
  },
  {
    id: 'services', label: 'Services & Policies', icon: '🤝',
    keywords: ['check-in', 'checkin', 'long term', 'breakfast', 'pet', 'smoking', 'luggage', 'concierge'],
    color: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', badge: 'bg-violet-500', head: 'text-violet-600' },
  },
];

const getGroupForAmenity = (name = '') => {
  const lower = name.toLowerCase();
  for (const g of AMENITY_GROUPS) {
    if (g.keywords.some(k => lower.includes(k))) return g;
  }
  return null;
};

/* ─── Section nav config ─────────────────────────────────────────────────── */
const SECTIONS = [
  { key: 'info',      label: 'Info',      Icon: Home },
  { key: 'pricing',   label: 'Pricing',   Icon: DollarSign },
  { key: 'location',  label: 'Location',  Icon: MapPin },
  { key: 'photos',    label: 'Photos',    Icon: Image },
  { key: 'amenities', label: 'Amenities', Icon: CheckCircle },
];

/* ─── Tiny helpers ───────────────────────────────────────────────────────── */
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-rose-500' };
  return (
    <div
      className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl ${colors[type] || colors.info}`}
      style={{ animation: 'slideUp .3s ease' }}
    >
      {msg}
      <button onClick={onClose}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
    </div>
  );
};

/* Character count — turns amber near limit, red at the edge */
const CharCount = ({ value, max }) => {
  const pct = value / max;
  const cls = pct >= 0.95 ? 'text-red-400' : pct >= 0.8 ? 'text-amber-400' : 'text-gray-400';
  return <p className={`text-xs mt-1 text-right transition-colors duration-200 ${cls}`}>{value}/{max}</p>;
};

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

/* Base input class */
const baseCls = 'w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 focus:bg-white transition-all duration-200';

/* Returns border + ring colours based on touched + valid state */
const fieldCls = (touched, valid) => {
  if (!touched) return `${baseCls} border-gray-200 focus:ring-rose-400`;
  return valid
    ? `${baseCls} border-emerald-300 focus:ring-emerald-400`
    : `${baseCls} border-red-300   focus:ring-red-400`;
};

/* Stepper counter with pop animation on value change */
const Counter = ({ label, icon: Icon, value, onChange, min = 0 }) => (
  <div className="flex items-center justify-between px-5 py-4 [&:not(:last-child)]:border-b border-gray-100">
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-sm font-medium text-gray-800">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
        className="w-9 h-9 border border-gray-300 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 hover:border-gray-900 disabled:opacity-30 transition-colors active:scale-90">
        −
      </button>
      <span key={value} className="w-6 text-center font-semibold text-sm text-gray-900"
        style={{ animation: 'counterPop .2s ease' }}>
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-9 h-9 border border-gray-300 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 hover:border-gray-900 transition-colors active:scale-90">
        +
      </button>
    </div>
  </div>
);

/* Section header — green "Done" badge fades in when section is complete */
const SectionHeader = ({ icon: Icon, iconCls, title, done }) => (
  <div className="flex items-center justify-between">
    <h2 className="font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: "'Fraunces', serif" }}>
      <Icon className={`w-4 h-4 ${iconCls}`} />{title}
    </h2>
    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-300 ${
      done
        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 opacity-100 scale-100'
        : 'opacity-0 scale-90 pointer-events-none'
    }`}>
      <Check className="w-3 h-3" />Done
    </span>
  </div>
);

/* ════════════════════════════════════════════════════════════════════════════
   EDIT LISTING PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function EditListing() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [progress,   setProgress]   = useState(0);
  const [categories, setCategories] = useState([]);
  const [amenities,  setAmenities]  = useState([]);
  const [locating,   setLocating]   = useState(false);
  const [locError,   setLocError]   = useState('');
  /* tracks which fields the user has blurred, for validation colouring */
  const [touched,    setTouched]    = useState(new Set());

  const mapRef    = useRef(null);
  const markerRef = useRef(null);
  const mapElRef  = useRef(null);
  const fileRef   = useRef();

  /* section scroll refs */
  const sectionRefs = {
    info:      useRef(null),
    pricing:   useRef(null),
    location:  useRef(null),
    photos:    useRef(null),
    amenities: useRef(null),
  };

  const [form, setForm] = useState({
    title:           '',
    description:     '',
    price:           '',
    cleaningFee:     '',
    weeklyDiscount:  0,
    monthlyDiscount: 0,
    maxGuests:       1,
    bedrooms:        1,
    beds:            1,
    bathrooms:       1,
    category:        '',
    location: {
      street:  '',
      city:    '',
      state:   '',
      country: '',
      zipCode: '',
      coordinates: { lat: 27.7172, lng: 85.3240 },
    },
    amenities:      [],
    newImages:      [],
    existingImages: [],
  });

  const showToast = (msg, type = 'info') => setToast({ msg, type });
  const touch     = field => setTouched(p => new Set([...p, field]));

  /* ── Section completion ───────────────────────────────────────────────── */
  const sectionDone = useMemo(() => ({
    info:      form.title.trim().length > 0 && form.description.trim().length > 0 && form.category !== '',
    pricing:   Number(form.price) > 0,
    location:  form.location.city.trim().length > 0 && form.location.country.trim().length > 0,
    photos:    (form.existingImages.length + form.newImages.length) > 0,
    amenities: form.amenities.length > 0,
  }), [form]);

  const completedCount = Object.values(sectionDone).filter(Boolean).length;
  const overallPct     = Math.round((completedCount / SECTIONS.length) * 100);

  /* ── Load listing ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [listingRes, catRes, amenRes] = await Promise.all([
          fetchListingById(id),
          fetchCategories().catch(() => ({ data: { data: [] } })),
          fetchAmenities().catch(() => []),
        ]);
        const l = listingRes.data?.data;
        if (!l) throw new Error('Listing not found');

        const imgs = Array.isArray(l.images)
          ? l.images.flatMap(img => img?.includes(',') ? img.split(',') : [img])
          : [];

        setForm({
          title:           l.title           || '',
          description:     l.description     || '',
          price:           l.price           || '',
          cleaningFee:     l.cleaningFee     || '',
          weeklyDiscount:  l.weeklyDiscount  ?? 0,
          monthlyDiscount: l.monthlyDiscount ?? 0,
          maxGuests:       l.maxGuests       || 1,
          bedrooms:        l.bedrooms        || 1,
          beds:            l.beds            || 1,
          bathrooms:       l.bathrooms       || 1,
          category:        l.category?._id   || l.category || '',
          location: {
            street:  l.location?.street  || l.location?.address || '',
            city:    l.location?.city    || '',
            state:   l.location?.state   || '',
            country: l.location?.country || '',
            zipCode: l.location?.zipCode || '',
            coordinates: {
              lat: l.location?.coordinates?.lat || 27.7172,
              lng: l.location?.coordinates?.lng || 85.3240,
            },
          },
          amenities:      (l.amenities || []).map(a => a?._id || a),
          newImages:      [],
          existingImages: imgs,
        });
        setCategories(catRes.data?.data || []);
        setAmenities(Array.isArray(amenRes) ? amenRes : amenRes?.data || []);
      } catch (err) {
        showToast(err.message || 'Failed to load listing', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* ── Leaflet map ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (loading) return;

    const initMap = () => {
      if (!window.L || !mapElRef.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
      const { lat, lng } = form.location.coordinates;
      setTimeout(() => {
        if (!window.L || !mapElRef.current) return;
        const map = window.L.map(mapElRef.current).setView([lat, lng], 13);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors', maxZoom: 19,
        }).addTo(map);
        const marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', e => {
          const p = e.target.getLatLng();
          setForm(prev => ({ ...prev, location: { ...prev.location, coordinates: { lat: p.lat, lng: p.lng } } }));
        });
        mapRef.current = map; markerRef.current = marker;
        setTimeout(() => map.invalidateSize(), 150);
      }, 300);
    };

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!window.L) {
      if (!document.getElementById('leaflet-js')) {
        const s = document.createElement('script');
        s.id = 'leaflet-js'; s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = initMap;
        document.body.appendChild(s);
      }
    } else { initMap(); }

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; } };
  }, [loading]); // eslint-disable-line

  useEffect(() => {
    const { lat, lng } = form.location.coordinates;
    if (!lat || !lng || !mapRef.current || !markerRef.current) return;
    mapRef.current.setView([lat, lng], 13);
    markerRef.current.setLatLng([lat, lng]);
  }, [form.location.coordinates]);

  /* ── Geocode ──────────────────────────────────────────────────────────── */
  const geocodeAddress = async () => {
    const { street, city, state, country } = form.location;
    const q = [street, city, state, country].filter(Boolean).join(', ');
    if (!q) return;
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data?.[0]) setForm(p => ({
        ...p, location: { ...p.location, coordinates: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } },
      }));
    } catch {}
  };

  /* ── Geolocation ──────────────────────────────────────────────────────── */
  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) { setLocError('Geolocation not supported.'); return; }
    setLocating(true); setLocError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p => ({ ...p, location: { ...p.location, coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude } } }));
        setLocating(false);
      },
      err => {
        setLocating(false);
        const msgs = {
          [err.PERMISSION_DENIED]:    'Location access denied. Allow it in browser settings, or enter your address manually.',
          [err.POSITION_UNAVAILABLE]: 'Location unavailable. Please enter your address manually.',
          [err.TIMEOUT]:              'Location timed out. Please try again.',
        };
        setLocError(msgs[err.code] || 'Unable to get location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  /* ── Form helpers ─────────────────────────────────────────────────────── */
  const set    = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setLoc = (key, val) => setForm(p => ({ ...p, location: { ...p.location, [key]: val } }));
  const setCoord = (axis, val) =>
    setForm(p => ({ ...p, location: { ...p.location, coordinates: { ...p.location.coordinates, [axis]: parseFloat(val) || 0 } } }));

  const toggleAmenity = aid =>
    setForm(p => ({
      ...p,
      amenities: p.amenities.includes(aid) ? p.amenities.filter(a => a !== aid) : [...p.amenities, aid],
    }));

  const handleFileChange = e => {
    const valid = Array.from(e.target.files).filter(f => f.size < 5 * 1024 * 1024);
    if (valid.length < e.target.files.length) showToast('Some files exceed 5 MB and were skipped', 'info');
    setForm(p => ({ ...p, newImages: [...p.newImages, ...valid] }));
    e.target.value = '';
  };

  const removeExisting = i => setForm(p => ({ ...p, existingImages: p.existingImages.filter((_, j) => j !== i) }));
  const removeNew      = i => setForm(p => ({ ...p, newImages:      p.newImages.filter((_, j) => j !== i) }));

  /* ── Grouped amenities ────────────────────────────────────────────────── */
  const groupedAmenities = useMemo(() => {
    const grouped = {}, ungrouped = [];
    amenities.forEach(a => {
      const g = getGroupForAmenity(a.name);
      if (g) { if (!grouped[g.id]) grouped[g.id] = { ...g, items: [] }; grouped[g.id].items.push(a); }
      else ungrouped.push(a);
    });
    const result = AMENITY_GROUPS.filter(g => grouped[g.id]).map(g => grouped[g.id]);
    if (ungrouped.length) result.push({
      id: 'other', label: 'Other', icon: '✨',
      color: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', badge: 'bg-gray-500', head: 'text-gray-600' },
      items: ungrouped,
    });
    return result;
  }, [amenities]);

  /* ── Submit ───────────────────────────────────────────────────────────── */
  const handleSubmit = async e => {
    e?.preventDefault();
    setTouched(new Set(['title', 'description', 'price', 'city', 'country']));

    if (!form.title.trim())             return showToast('Title is required', 'error');
    if (!form.description.trim())       return showToast('Description is required', 'error');
    if (!form.price || form.price <= 0) return showToast('Enter a valid price', 'error');
    if (!form.location.city.trim())     return showToast('City is required', 'error');
    if (!form.location.country.trim())  return showToast('Country is required', 'error');

    setSaving(true); setProgress(0);
    try {
      await updateListing(id, {
        title:           form.title.trim(),
        description:     form.description.trim(),
        price:           Number(form.price),
        cleaningFee:     Number(form.cleaningFee)     || 0,
        weeklyDiscount:  Number(form.weeklyDiscount)  || 0,
        monthlyDiscount: Number(form.monthlyDiscount) || 0,
        maxGuests:       Number(form.maxGuests),
        bedrooms:        Number(form.bedrooms),
        beds:            Number(form.beds),
        bathrooms:       Number(form.bathrooms),
        category:        form.category,
        location:        form.location,
        amenities:       form.amenities,
        images:          form.newImages,
        existingImages:  form.existingImages,
      }, evt => { if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100)); });

      showToast('Listing updated! 🎉', 'success');
      setTimeout(() => navigate('/host-panel'), 1200);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSaving(false); setProgress(0);
    }
  };

  const scrollTo = key => sectionRefs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600&family=Fraunces:opsz,wght@9..144,600&display=swap');`}</style>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm font-medium">Loading your listing…</p>
      </div>
    </div>
  );

  const totalImages = form.existingImages.length + form.newImages.length;
  const totalPrice  = Number(form.price || 0) + Number(form.cleaningFee || 0);

  return (
    <div className="min-h-screen bg-[#faf9f7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&display=swap');
        @keyframes slideUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes counterPop { 0%{transform:scale(1.45);opacity:.5} 100%{transform:scale(1);opacity:1} }
        @keyframes pricePop   { 0%{transform:scale(1.07)} 100%{transform:scale(1)} }
      `}</style>

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/host-panel')}
              className="flex items-center gap-2 text-gray-500 hover:text-rose-500 transition text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />Back
            </button>
            <span className="text-gray-200">|</span>
            <span className="text-lg font-bold text-rose-500" style={{ fontFamily: "'Fraunces', serif", letterSpacing: '-0.03em' }}>
              Edit Listing
            </span>
          </div>

          {/* Overall completion bar */}
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-400 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-400">{completedCount}/{SECTIONS.length}</span>
          </div>

          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 active:scale-95 transition-all shadow-md shadow-rose-100 disabled:opacity-60">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? `Saving… ${progress > 0 ? `${progress}%` : ''}` : 'Save changes'}
          </button>
        </div>

        {saving && progress > 0 && (
          <div className="h-1 bg-gray-100">
            <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Section nav strip — dots turn green and label turns emerald as each section completes */}
        <div className="border-t border-gray-50 bg-gray-50/60">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex gap-1 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
              {SECTIONS.map(({ key, label, Icon }) => {
                const done = sectionDone[key];
                return (
                  <button key={key} type="button" onClick={() => scrollTo(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 hover:bg-white hover:shadow-sm active:scale-95">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      done ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}>
                      {done
                        ? <Check className="w-2.5 h-2.5 text-white" style={{ animation: 'counterPop .25s ease' }} />
                        : <Icon className="w-2 h-2 text-gray-400" />}
                    </span>
                    <span className={`transition-colors duration-200 ${done ? 'text-emerald-600' : 'text-gray-500'}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8" style={{ animation: 'fadeUp .35s ease' }}>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ══ SECTION 1 — Basic Info ══════════════════════════════════ */}
          <section ref={sectionRefs.info} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 scroll-mt-36">
            <SectionHeader icon={Home} iconCls="text-rose-400" title="Basic Information" done={sectionDone.info} />

            <Field label="Listing Title" hint="Make it catchy and descriptive">
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                onBlur={() => touch('title')}
                className={fieldCls(touched.has('title'), form.title.trim().length > 0)}
                placeholder="e.g. Cozy mountain cabin with stunning views"
                maxLength={100}
              />
              <CharCount value={form.title.length} max={100} />
            </Field>

            <Field label="Description" hint="Tell guests what makes this place special">
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                onBlur={() => touch('description')}
                className={`${fieldCls(touched.has('description'), form.description.trim().length > 0)} resize-none`}
                rows={5}
                placeholder="Describe the space, neighbourhood, and what guests will love…"
                maxLength={2000}
              />
              <CharCount value={form.description.length} max={2000} />
            </Field>

            {categories.length > 0 && (
              <Field label="Category">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                  {categories.map(cat => (
                    <button key={cat._id} type="button" onClick={() => set('category', cat._id)}
                      className={`relative p-4 border-2 rounded-xl text-left transition-all duration-200 hover:shadow-md active:scale-[.98] ${
                        form.category === cat._id
                          ? 'border-rose-500 bg-rose-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      {form.category === cat._id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center"
                          style={{ animation: 'counterPop .2s ease' }}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="text-2xl mb-1">{cat.icon}</div>
                      <div className="text-xs font-semibold text-gray-700">{cat.name}</div>
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </section>

          {/* ══ SECTION 2 — Pricing & Capacity ═════════════════════════ */}
          <section ref={sectionRefs.pricing} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 scroll-mt-36">
            <SectionHeader icon={DollarSign} iconCls="text-emerald-400" title="Pricing & Capacity" done={sectionDone.pricing} />

            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <Counter label="Max Guests" icon={Users} value={form.maxGuests} onChange={v => set('maxGuests', v)} min={1} />
              <Counter label="Bedrooms"   icon={Bed}   value={form.bedrooms}  onChange={v => set('bedrooms', v)}  min={0} />
              <Counter label="Beds"       icon={Bed}   value={form.beds}      onChange={v => set('beds', v)}      min={1} />
              <Counter label="Bathrooms"  icon={Bath}  value={form.bathrooms} onChange={v => set('bathrooms', v)} min={0} />
            </div>

            {/* Hero price — border/bg transition from neutral → rose as user fills it */}
            <div className={`border-2 rounded-2xl p-5 transition-all duration-300 ${
              Number(form.price) > 0 ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <label className={`block text-xs font-semibold mb-2 transition-colors duration-200 ${
                Number(form.price) > 0 ? 'text-rose-600' : 'text-gray-500'
              }`}>
                Base price per night *
              </label>
              <div className="flex items-center gap-3">
                <DollarSign className={`w-5 h-5 shrink-0 transition-colors duration-200 ${
                  Number(form.price) > 0 ? 'text-rose-400' : 'text-gray-300'
                }`} />
                <input type="number" min="1" value={form.price}
                  onChange={e => set('price', e.target.value)}
                  onBlur={() => touch('price')}
                  placeholder="0"
                  className="flex-1 text-3xl font-bold bg-transparent border-0 outline-none text-gray-900 placeholder-gray-300" />
                <span className="text-gray-400 text-sm">/ night</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Cleaning Fee ($)">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min="0" value={form.cleaningFee}
                    onChange={e => set('cleaningFee', e.target.value)}
                    className={`${baseCls} border-gray-200 focus:ring-rose-400 pl-8`} placeholder="0" />
                </div>
              </Field>
              <Field label="Weekly Discount (%)">
                <input type="number" min="0" max="100" value={form.weeklyDiscount}
                  onChange={e => set('weeklyDiscount', e.target.value)}
                  className={`${baseCls} border-gray-200 focus:ring-rose-400`} placeholder="0" />
              </Field>
              <Field label="Monthly Discount (%)">
                <input type="number" min="0" max="100" value={form.monthlyDiscount}
                  onChange={e => set('monthlyDiscount', e.target.value)}
                  className={`${baseCls} border-gray-200 focus:ring-rose-400`} placeholder="0" />
              </Field>
            </div>

            {/* Live guest total — total value is the key so it re-animates on every change */}
            {Number(form.price) > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Guest total estimate</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Nightly rate</span>
                    <span className="font-semibold text-gray-900">${Number(form.price).toFixed(2)}</span>
                  </div>
                  {Number(form.cleaningFee) > 0 && (
                    <div className="flex justify-between">
                      <span>Cleaning fee</span>
                      <span className="font-semibold text-gray-900">${Number(form.cleaningFee).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span key={totalPrice} style={{ animation: 'pricePop .25s ease' }}>
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ══ SECTION 3 — Location ════════════════════════════════════ */}
          <section ref={sectionRefs.location} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 scroll-mt-36">
            <SectionHeader icon={MapPin} iconCls="text-blue-400" title="Location" done={sectionDone.location} />

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Street Address">
                <input value={form.location.street} onChange={e => setLoc('street', e.target.value)} onBlur={geocodeAddress}
                  className={`${baseCls} border-gray-200 focus:ring-rose-400`} placeholder="Street address" />
              </Field>
              <Field label="City *">
                <input value={form.location.city} onChange={e => setLoc('city', e.target.value)}
                  onBlur={() => { touch('city'); geocodeAddress(); }}
                  className={fieldCls(touched.has('city'), form.location.city.trim().length > 0)}
                  placeholder="City" required />
              </Field>
              <Field label="State / Province">
                <input value={form.location.state} onChange={e => setLoc('state', e.target.value)} onBlur={geocodeAddress}
                  className={`${baseCls} border-gray-200 focus:ring-rose-400`} placeholder="State or province" />
              </Field>
              <Field label="Country *">
                <input value={form.location.country} onChange={e => setLoc('country', e.target.value)}
                  onBlur={() => { touch('country'); geocodeAddress(); }}
                  className={fieldCls(touched.has('country'), form.location.country.trim().length > 0)}
                  placeholder="Country" required />
              </Field>
              <Field label="ZIP / Postal Code">
                <input value={form.location.zipCode} onChange={e => setLoc('zipCode', e.target.value)}
                  className={`${baseCls} border-gray-200 focus:ring-rose-400`} placeholder="ZIP or postal code" />
              </Field>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pin your location</p>
                <button type="button" onClick={getCurrentLocation} disabled={locating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-full transition border border-rose-200 disabled:opacity-50 active:scale-95">
                  <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  {locating ? 'Locating…' : 'Use my location'}
                </button>
              </div>

              {locError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 leading-relaxed"
                  style={{ animation: 'fadeUp .2s ease' }}>
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                  <span>{locError}</span>
                </div>
              )}

              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div ref={mapElRef} className="w-full h-72" />
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-semibold mb-0.5">Drag the marker to fine-tune your location</p>
                  <p>Lat: {form.location.coordinates.lat.toFixed(5)}, Lng: {form.location.coordinates.lng.toFixed(5)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude">
                  <input type="number" step="any" value={form.location.coordinates.lat}
                    onChange={e => setCoord('lat', e.target.value)}
                    className={`${baseCls} border-gray-200 focus:ring-rose-400`} />
                </Field>
                <Field label="Longitude">
                  <input type="number" step="any" value={form.location.coordinates.lng}
                    onChange={e => setCoord('lng', e.target.value)}
                    className={`${baseCls} border-gray-200 focus:ring-rose-400`} />
                </Field>
              </div>
            </div>
          </section>

          {/* ══ SECTION 4 — Photos ══════════════════════════════════════ */}
          <section ref={sectionRefs.photos} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 scroll-mt-36">
            <div className="flex items-center justify-between">
              <SectionHeader icon={Image} iconCls="text-purple-400" title={`Photos (${totalImages})`} done={sectionDone.photos} />
              <button type="button" onClick={() => fileRef.current.click()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full bg-rose-500 text-white hover:bg-rose-600 active:scale-95 transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" />Add photos
              </button>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />

            {form.existingImages.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Current Photos</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {form.existingImages.map((src, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200">
                      <img src={src} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      {i === 0 && <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-md">Cover</span>}
                      <button type="button" onClick={() => removeExisting(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:bg-red-600 active:scale-90">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.newImages.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">New Photos to Upload</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {form.newImages.map((file, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-dashed border-emerald-300 bg-emerald-50"
                      style={{ animation: 'fadeUp .2s ease' }}>
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-emerald-500/80 text-white text-[10px] font-bold rounded-md">New</span>
                      <button type="button" onClick={() => removeNew(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:bg-red-600 active:scale-90">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalImages === 0 && (
              <button type="button" onClick={() => fileRef.current.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-rose-300 hover:bg-rose-50 active:scale-[.99] transition-all duration-200 group">
                <Upload className="w-8 h-8 text-gray-300 group-hover:text-rose-400 mx-auto mb-2 transition-colors" />
                <p className="text-sm font-semibold text-gray-500 group-hover:text-rose-500 transition-colors">Click to upload photos</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 5 MB each</p>
              </button>
            )}

            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600">The first photo is the cover image. Hover over a photo and click × to remove it.</p>
            </div>
          </section>

          {/* ══ SECTION 5 — Amenities ═══════════════════════════════════ */}
          {amenities.length > 0 && (
            <section ref={sectionRefs.amenities} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 scroll-mt-36">
              <SectionHeader icon={CheckCircle} iconCls="text-emerald-400" title="Amenities" done={sectionDone.amenities} />

              {form.amenities.length > 0 && (
                <span key={form.amenities.length}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold border border-rose-100"
                  style={{ animation: 'counterPop .2s ease' }}>
                  <Check className="w-3 h-3" />{form.amenities.length} selected
                </span>
              )}

              <div className="space-y-7">
                {groupedAmenities.map((group, gi) => {
                  const c             = group.color;
                  const selectedCount = group.items.filter(a => form.amenities.includes(a._id || a.id || a)).length;
                  return (
                    <div key={group.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">{group.icon}</span>
                        <h3 className={`text-sm font-bold ${c.head}`}>{group.label}</h3>
                        {selectedCount > 0 && (
                          <span key={selectedCount} className={`ml-auto text-xs px-2 py-0.5 rounded-full text-white font-semibold ${c.badge}`}
                            style={{ animation: 'counterPop .2s ease' }}>
                            {selectedCount} selected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map(a => {
                          const aid      = a._id || a.id || a;
                          const selected = form.amenities.includes(aid);
                          return (
                            <button key={aid} type="button" onClick={() => toggleAmenity(aid)}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all duration-150 active:scale-95 ${
                                selected
                                  ? `${c.bg} ${c.border} ${c.text} border-2 shadow-sm`
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                              }`}>
                              {typeof a.icon === 'string' && <span style={{ fontSize: 14 }}>{a.icon}</span>}
                              <span>{a.name || a}</span>
                              {selected && <Check className="w-3 h-3 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                      {gi < groupedAmenities.length - 1 && <div className="mt-6 border-b border-gray-100" />}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Bottom actions ─────────────────────────────────────────── */}
          <div className="flex gap-3 pb-8">
            <button type="button" onClick={() => navigate('/host-panel')}
              className="flex-1 py-3.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 active:scale-[.99] transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3.5 bg-rose-500 text-white rounded-2xl text-sm font-bold hover:bg-rose-600 active:scale-[.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-200">
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" />{progress > 0 ? `Uploading ${progress}%…` : 'Saving…'}</>
                : <><Save className="w-4 h-4" />Save all changes</>}
            </button>
          </div>
        </form>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}