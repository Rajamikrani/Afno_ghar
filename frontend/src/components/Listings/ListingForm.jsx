import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Home, MapPin, Users, Bed, Bath, Upload, DollarSign, Check, Navigation } from 'lucide-react';
import { fetchAmenities, fetchCategories, createListing } from '../../service/api';
import { useNavigate } from 'react-router-dom';

/* ─── Amenity category definitions ──────────────────────────────────────── */
const AMENITY_GROUPS = [
  {
    id: "essentials", label: "Essentials", icon: "⚡",
    keywords: ["wifi", "internet", "kitchen", "washer", "dryer", "air", "heating", "ac"],
    color: { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-700", badge: "bg-rose-500", head: "text-rose-600" },
  },
  {
    id: "bathroom", label: "Bathroom", icon: "🚿",
    keywords: ["hot water", "bathtub", "hair dryer", "shower", "towel", "soap"],
    color: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", badge: "bg-blue-500", head: "text-blue-600" },
  },
  {
    id: "bedroom", label: "Bedroom & Laundry", icon: "🛏",
    keywords: ["hanger", "iron", "tv", "television", "pillow", "curtain", "closet", "wardrobe"],
    color: { bg: "bg-indigo-50", border: "border-indigo-300", text: "text-indigo-700", badge: "bg-indigo-500", head: "text-indigo-600" },
  },
  {
    id: "entertainment", label: "Entertainment", icon: "🎉",
    keywords: ["netflix", "streaming", "game", "board", "book", "library", "music", "speaker"],
    color: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", badge: "bg-amber-500", head: "text-amber-600" },
  },
  {
    id: "outdoor", label: "Outdoor & Views", icon: "🌿",
    keywords: ["pool", "hot tub", "bbq", "grill", "patio", "balcony", "garden", "fire pit", "beach", "mountain", "ocean", "lake", "yard"],
    color: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", badge: "bg-emerald-500", head: "text-emerald-600" },
  },
  {
    id: "parking", label: "Parking & Facilities", icon: "🅿️",
    keywords: ["parking", "ev", "elevator", "gym", "fitness", "luggage", "storage", "workspace", "desk"],
    color: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700", badge: "bg-slate-500", head: "text-slate-600" },
  },
  {
    id: "safety", label: "Safety", icon: "🛡️",
    keywords: ["smoke", "carbon", "co", "first aid", "fire extinguisher", "camera", "security", "alarm", "lock"],
    color: { bg: "bg-teal-50", border: "border-teal-300", text: "text-teal-700", badge: "bg-teal-500", head: "text-teal-600" },
  },
  {
    id: "services", label: "Services & Policies", icon: "🤝",
    keywords: ["check-in", "checkin", "long term", "breakfast", "pet", "smoking", "luggage", "concierge"],
    color: { bg: "bg-violet-50", border: "border-violet-300", text: "text-violet-700", badge: "bg-violet-500", head: "text-violet-600" },
  },
];

const getGroupForAmenity = (amenityName = "") => {
  const lower = amenityName.toLowerCase();
  for (const group of AMENITY_GROUPS) {
    if (group.keywords.some(k => lower.includes(k))) return group;
  }
  return null;
};

/* ─── ListingForm ────────────────────────────────────────────────────────── */
const ListingForm = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;

  const [amenitiesList,     setAmenitiesList]     = useState([]);
  const [loadingAmenities,  setLoadingAmenities]  = useState(true);
  const [categories,        setCategories]        = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting,      setIsSubmitting]      = useState(false);
  const [uploadProgress,    setUploadProgress]    = useState(0);

  // ── FIX: Track locating state for UI feedback ──────────────────────────
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  // ── FIX: Use refs for map instances — avoids window pollution & stale state
  const mapRef    = useRef(null);
  const markerRef = useRef(null);
  const mapElRef  = useRef(null); // ref to the DOM element

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: '',
    location: {
      street: '', city: '', state: '', country: '', zipCode: '',
      coordinates: { lat: 27.7172, lng: 85.3240 },
    },
    maxGuests: 1, bedrooms: 1, beds: 1, bathrooms: 1,
    amenities: [],
    images: [],
    title: '', description: '',
    price: '', cleaningFee: '',
    weeklyDiscount: 0, monthlyDiscount: 0,
  });

  const updateFormData   = (field, value) => setFormData(p => ({ ...p, [field]: value }));
  const updateNestedData = (parent, field, value) =>
    setFormData(p => ({ ...p, [parent]: { ...p[parent], [field]: value } }));

  const updateCoordinates = (lat, lng) => {
    setFormData(p => ({
      ...p,
      location: { ...p.location, coordinates: { lat, lng } },
    }));
  };

  /* ── Fetch categories ─────────────────────────────────────────────── */
  useEffect(() => {
    fetchCategories()
      .then(res => { setCategories(res.data.data); setLoadingCategories(false); })
      .catch(() => setLoadingCategories(false));
  }, []);

  /* ── Fetch amenities ──────────────────────────────────────────────── */
  useEffect(() => {
    fetchAmenities()
      .then(res => { setAmenitiesList(res.data); setLoadingAmenities(false); })
      .catch(() => setLoadingAmenities(false));
  }, []);

  /* ── FIX: Helper to safely update map position ────────────────────
     Checks refs instead of window globals. If map isn't ready yet,
     retries after 600ms (handles race condition with geolocation).
  ──────────────────────────────────────────────────────────────── */
  const updateMapPosition = (lat, lng) => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lng], 13);
      markerRef.current.setLatLng([lat, lng]);
    } else {
      // Map not initialized yet — retry once after initialization delay
      setTimeout(() => {
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lng], 13);
          markerRef.current.setLatLng([lat, lng]);
        }
      }, 700);
    }
  };

  /* ── FIX: Map initialization — uses refs, not window globals ──────── */
  useEffect(() => {
    if (currentStep !== 2) return;

    const initMap = () => {
      const mapEl = mapElRef.current;
      if (!mapEl) return;

      // Destroy previous instance if exists
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current  = null;
        markerRef.current = null;
      }

      const { lat, lng } = formData.location.coordinates;

      setTimeout(() => {
        if (!window.L || !mapElRef.current) return;

        const map = window.L.map(mapElRef.current).setView([lat, lng], 13);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        const marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);

        // Dragging marker updates coordinates in state
        marker.on('dragend', e => {
          const p = e.target.getLatLng();
          updateCoordinates(p.lat, p.lng);
        });

        mapRef.current    = map;
        markerRef.current = marker;

        setTimeout(() => map.invalidateSize(), 150);
      }, 300);
    };

    if (!window.L) {
      // Load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id   = 'leaflet-css';
        link.rel  = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // Load Leaflet JS
      if (!document.getElementById('leaflet-js')) {
        const script    = document.createElement('script');
        script.id       = 'leaflet-js';
        script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload   = initMap;
        document.body.appendChild(script);
      }
    } else {
      initMap();
    }

    // Cleanup on unmount or step change
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current    = null;
        markerRef.current = null;
      }
    };
  }, [currentStep]); // only re-run when step changes

  /* ── FIX: Sync map when coordinates change in state ──────────────────
     Removed currentStep check — the ref guards are sufficient.
     Removed currentStep from here so stale closure isn't an issue.
  ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const { lat, lng } = formData.location.coordinates;
    if (!lat || !lng) return;
    updateMapPosition(lat, lng);
  }, [formData.location.coordinates]);

  /* ── Geocode address to coordinates ──────────────────────────────── */
  const geocodeAddress = async () => {
    const { street, city, state, country } = formData.location;
    const address = [street, city, state, country].filter(Boolean).join(', ');
    if (!address) return;
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await res.json();
      if (data?.[0]) {
        updateCoordinates(parseFloat(data[0].lat), parseFloat(data[0].lon));
      }
    } catch {}
  };

  /* ── FIX: getCurrentLocation with full error handling + loading state ──
     - Shows spinner on button while locating
     - Handles PERMISSION_DENIED separately with clear message
     - Handles TIMEOUT with retry suggestion
     - Uses enableHighAccuracy for better precision
     - Clears previous error before each attempt
  ──────────────────────────────────────────────────────────────── */
  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updateCoordinates(lat, lng);
        setLocating(false);
        setLocationError('');
      },
      (err) => {
        setLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError(
              'Location access was denied. Please allow location access in your browser settings, or enter your address manually.'
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable. Please enter your address manually.');
            break;
          case err.TIMEOUT:
            setLocationError('Location request timed out. Please try again or enter your address manually.');
            break;
          default:
            setLocationError('Unable to get your location. Please enter your address manually.');
        }
      },
      {
        enableHighAccuracy: true,  // use GPS when available
        timeout: 10000,            // 10 second timeout
        maximumAge: 0,             // always get fresh position
      }
    );
  };

  /* ── Image handlers ───────────────────────────────────────────────── */
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(p => ({ ...p, images: [...p.images, ...files] }));
  };

  const removeImage = (idx) =>
    setFormData(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }));

  useEffect(() => {
    return () => formData.images.forEach(f => { try { URL.revokeObjectURL(f); } catch {} });
  }, [formData.images]);

  /* ── Amenity toggle ───────────────────────────────────────────────── */
  const toggleAmenity = (id) =>
    setFormData(p => ({
      ...p,
      amenities: p.amenities.includes(id)
        ? p.amenities.filter(a => a !== id)
        : [...p.amenities, id],
    }));

  /* ── Navigation ───────────────────────────────────────────────────── */
  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.category !== '';
      case 2: return !!(formData.location.city && formData.location.country);
      case 3: return true;
      case 4: return formData.amenities.length > 0;
      case 5: return formData.images.length >= 5;
      case 6: return !!(formData.title && formData.description);
      case 7: return formData.price > 0;
      default: return false;
    }
  };

  /* ── Submit ───────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setUploadProgress(0);

    let fake = 0;
    const interval = setInterval(() => {
      fake += Math.random() * 5;
      if (fake < 95) setUploadProgress(Math.floor(fake));
    }, 200);

    try {
      await createListing(formData, (pe) => {
        const pct = Math.round((pe.loaded * 100) / pe.total);
        setUploadProgress(prev => Math.max(prev, pct));
      });
      setUploadProgress(100);
      onClose();
      navigate('/');
    } catch {
      alert('Failed to submit listing. Please try again.');
    } finally {
      clearInterval(interval);
      setIsSubmitting(false);
    }
  };

  /* ── Categorised amenities ────────────────────────────────────────── */
  const groupedAmenities = (() => {
    const grouped = {};
    const uncategorized = [];

    amenitiesList.forEach(amenity => {
      const group = getGroupForAmenity(amenity.name);
      if (group) {
        if (!grouped[group.id]) grouped[group.id] = { ...group, items: [] };
        grouped[group.id].items.push(amenity);
      } else {
        uncategorized.push(amenity);
      }
    });

    const result = AMENITY_GROUPS
      .filter(g => grouped[g.id])
      .map(g => grouped[g.id]);

    if (uncategorized.length > 0) {
      result.push({
        id: "other", label: "Other", icon: "✨",
        color: { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", badge: "bg-gray-500", head: "text-gray-600" },
        items: uncategorized,
      });
    }

    return result;
  })();

  /* ─────────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&display=swap');`}</style>

      {/* ── Header ── */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 max-w-sm mx-auto">
            <div className="flex items-center gap-1.5">
              {[...Array(totalSteps)].map((_, i) => (
                <div key={i}
                  className={`flex-1 h-1 rounded-full transition-all ${i + 1 <= currentStep ? 'bg-rose-500' : 'bg-gray-200'}`} />
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-1.5">Step {currentStep} of {totalSteps}</p>
          </div>

          <div className="w-9" />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* ═══ STEP 1 — Property Type ═══════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                Which of these best describes your place?
              </h1>
              <p className="text-gray-500">Pick the category that fits your property best.</p>
            </div>

            {loadingCategories ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-6 border-2 border-gray-100 rounded-xl animate-pulse h-24" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {categories.map(cat => (
                  <button key={cat._id} onClick={() => updateFormData('category', cat._id)}
                    className={`relative p-5 border-2 rounded-2xl text-left transition-all hover:shadow-md ${
                      formData.category === cat._id
                        ? 'border-rose-500 bg-rose-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    {formData.category === cat._id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="text-3xl mb-2">{cat.icon}</div>
                    <div className="text-sm font-semibold text-gray-800">{cat.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2 — Location ════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                Where's your place located?
              </h1>
              <p className="text-gray-500">Your address is only shared with guests after they've made a reservation.</p>
            </div>

            <div className="space-y-4">
              <input type="text" placeholder="Street address" value={formData.location.street}
                onChange={e => updateNestedData('location', 'street', e.target.value)}
                onBlur={geocodeAddress}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition text-sm" />

              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="City *" value={formData.location.city}
                  onChange={e => updateNestedData('location', 'city', e.target.value)}
                  onBlur={geocodeAddress}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition text-sm" />
                <input type="text" placeholder="State / Province" value={formData.location.state}
                  onChange={e => updateNestedData('location', 'state', e.target.value)}
                  onBlur={geocodeAddress}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Country *" value={formData.location.country}
                  onChange={e => updateNestedData('location', 'country', e.target.value)}
                  onBlur={geocodeAddress}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition text-sm" />
                <input type="text" placeholder="ZIP code" value={formData.location.zipCode}
                  onChange={e => updateNestedData('location', 'zipCode', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition text-sm" />
              </div>

              {/* Map */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-800">Pin your exact location</h3>

                  {/* FIX: Button shows loading state and is disabled while locating */}
                  <button
                    onClick={getCurrentLocation}
                    disabled={locating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-500
                      hover:bg-rose-50 rounded-full transition border border-rose-200
                      disabled:opacity-50 disabled:cursor-not-allowed">
                    <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                    {locating ? 'Locating…' : 'Use my location'}
                  </button>
                </div>

                {/* FIX: Show location error inline instead of alert() */}
                {locationError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                    <span>{locationError}</span>
                  </div>
                )}

                {/* FIX: Use ref instead of id for map element */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div ref={mapElRef} className="w-full h-80" />
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <p className="font-semibold mb-0.5">Drag the marker to fine-tune</p>
                    <p>Lat: {formData.location.coordinates.lat.toFixed(5)}, Lng: {formData.location.coordinates.lng.toFixed(5)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Latitude</label>
                    <input type="number" step="any"
                      value={formData.location.coordinates.lat}
                      onChange={e => updateCoordinates(parseFloat(e.target.value) || 0, formData.location.coordinates.lng)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Longitude</label>
                    <input type="number" step="any"
                      value={formData.location.coordinates.lng}
                      onChange={e => updateCoordinates(formData.location.coordinates.lat, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm bg-gray-50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 3 — Basics ══════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                Share some basics about your place
              </h1>
              <p className="text-gray-500">You'll add more details later, like bed types.</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {[
                { icon: Users, label: "Guests",    field: "maxGuests",  min: 1 },
                { icon: Bed,   label: "Bedrooms",  field: "bedrooms",   min: 1 },
                { icon: Bed,   label: "Beds",      field: "beds",       min: 1 },
                { icon: Bath,  label: "Bathrooms", field: "bathrooms",  min: 1 },
              ].map(({ icon: Icon, label, field, min }, i, arr) => (
                <div key={field}
                  className={`flex items-center justify-between px-6 py-5 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-800">{label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => updateFormData(field, Math.max(min, formData[field] - 1))}
                      disabled={formData[field] <= min}
                      className="w-9 h-9 border border-gray-300 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 hover:border-gray-900 disabled:opacity-30 transition">
                      −
                    </button>
                    <span className="w-6 text-center font-semibold text-gray-900">{formData[field]}</span>
                    <button
                      onClick={() => updateFormData(field, formData[field] + 1)}
                      className="w-9 h-9 border border-gray-300 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 hover:border-gray-900 transition">
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STEP 4 — Amenities ═══════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                Tell guests what your place has to offer
              </h1>
              <p className="text-gray-500 mb-2">Select all amenities available to your guests.</p>
              {formData.amenities.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold border border-rose-100">
                  <Check className="w-3 h-3" /> {formData.amenities.length} selected
                </span>
              )}
            </div>

            {loadingAmenities ? (
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-3 animate-pulse">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="flex flex-wrap gap-2">
                      {[...Array(5)].map((_, j) => <div key={j} className="h-9 w-24 bg-gray-100 rounded-xl" />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {groupedAmenities.map((group, gi) => {
                  const c = group.color;
                  const selectedCount = group.items.filter(a => formData.amenities.includes(a._id)).length;
                  return (
                    <div key={group.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{group.icon}</span>
                        <h3 className={`text-sm font-bold ${c.head}`}>{group.label}</h3>
                        {selectedCount > 0 && (
                          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full text-white font-semibold ${c.badge}`}>
                            {selectedCount} selected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map(amenity => {
                          const isSelected = formData.amenities.includes(amenity._id);
                          return (
                            <button key={amenity._id} type="button" onClick={() => toggleAmenity(amenity._id)}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
                                isSelected
                                  ? `${c.bg} ${c.border} ${c.text} border-2 shadow-sm`
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                              }`}>
                              {typeof amenity.icon === 'string' ? <span>{amenity.icon}</span> : null}
                              <span>{amenity.name}</span>
                              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                      {gi < groupedAmenities.length - 1 && <div className="mt-6 border-b border-gray-100" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 5 — Photos ══════════════════════════════════════════ */}
        {currentStep === 5 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                Add some photos of your place
              </h1>
              <p className="text-gray-500">You'll need at least 5 photos to get started.</p>
            </div>

            <div className="space-y-4">
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {formData.images.map((file, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100">
                      <img src={URL.createObjectURL(file)} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-white/90 rounded-full text-xs font-semibold text-gray-700 shadow">
                          Cover photo
                        </div>
                      )}
                      <button type="button" onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-50">
                        <X className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                    </div>
                  ))}
                  <label className="border-2 border-dashed border-gray-300 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-rose-400 transition text-gray-400 hover:text-rose-400">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Add more</span>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              )}

              {formData.images.length === 0 && (
                <label className="block cursor-pointer">
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-14 text-center hover:border-rose-400 hover:bg-rose-50 transition">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <div className="font-semibold text-gray-700 mb-1">Choose photos to upload</div>
                    <div className="text-sm text-gray-500">JPG, PNG. Click to browse.</div>
                  </div>
                </label>
              )}

              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1.5 rounded-full ${formData.images.length >= 5 ? 'bg-emerald-400' : 'bg-gray-200'}`}>
                  <div className="h-full bg-rose-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (formData.images.length / 5) * 100)}%` }} />
                </div>
                <span className={`text-xs font-semibold ${formData.images.length >= 5 ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {formData.images.length} / 5 minimum
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 6 — Title & Description ════════════════════════════ */}
        {currentStep === 6 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                Now, let's give your place a title
              </h1>
              <p className="text-gray-500">Short titles work best. You can always change it later.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Listing Title *</label>
                <textarea value={formData.title} onChange={e => updateFormData('title', e.target.value)}
                  placeholder="e.g., Stunning Mountain View Cabin"
                  maxLength={50} rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none text-sm bg-gray-50 focus:bg-white transition" />
                <div className="text-right text-xs text-gray-400 mt-1">{formData.title.length}/50</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description *</label>
                <p className="text-xs text-gray-400 mb-2">Share what makes your place special.</p>
                <textarea value={formData.description} onChange={e => updateFormData('description', e.target.value)}
                  placeholder="Describe your property, the neighbourhood, and what guests will love about it..."
                  rows={8} maxLength={500}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none text-sm bg-gray-50 focus:bg-white transition" />
                <div className="text-right text-xs text-gray-400 mt-1">{formData.description.length}/500</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 7 — Pricing ═════════════════════════════════════════ */}
        {currentStep === 7 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                Now, set your price
              </h1>
              <p className="text-gray-500">You can change it anytime.</p>
            </div>

            <div className="space-y-5">
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                <label className="block text-xs font-semibold text-rose-600 mb-2">Base price per night *</label>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-rose-400 shrink-0" />
                  <input type="number" value={formData.price}
                    onChange={e => updateFormData('price', e.target.value)}
                    placeholder="0" min="0"
                    className="flex-1 text-3xl font-bold bg-transparent border-0 outline-none text-gray-900 placeholder-gray-300" />
                  <span className="text-gray-400 text-sm">/ night</span>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <label className="block text-xs font-semibold text-gray-500 mb-2">
                  Cleaning fee <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <input type="number" value={formData.cleaningFee}
                    onChange={e => updateFormData('cleaningFee', e.target.value)}
                    placeholder="0" min="0"
                    className="flex-1 text-lg font-semibold bg-transparent border-0 outline-none text-gray-800 placeholder-gray-300" />
                </div>
              </div>

              <div className="border border-gray-100 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Discounts</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Weekly (%)</label>
                    <input type="number" value={formData.weeklyDiscount}
                      onChange={e => updateFormData('weeklyDiscount', e.target.value)}
                      placeholder="0" min="0" max="100"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Monthly (%)</label>
                    <input type="number" value={formData.monthlyDiscount}
                      onChange={e => updateFormData('monthlyDiscount', e.target.value)}
                      placeholder="0" min="0" max="100"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm bg-gray-50" />
                  </div>
                </div>
              </div>

              {formData.price > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Guest total estimate</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Nightly rate</span>
                      <span className="font-semibold text-gray-900">${Number(formData.price || 0).toFixed(2)}</span>
                    </div>
                    {formData.cleaningFee > 0 && (
                      <div className="flex justify-between">
                        <span>Cleaning fee</span>
                        <span className="font-semibold text-gray-900">${Number(formData.cleaningFee).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                      <span>Total</span>
                      <span>${(Number(formData.price || 0) + Number(formData.cleaningFee || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Upload progress ── */}
      {isSubmitting && (
        <div className="max-w-2xl mx-auto px-6 pb-4">
          <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-xs text-center text-gray-400 mt-1">{uploadProgress}% uploaded</p>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="sticky bottom-0 bg-white border-t">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={currentStep === 1 ? onClose : () => setCurrentStep(p => p - 1)}
            className="px-6 py-2.5 font-semibold text-sm rounded-full hover:bg-gray-100 transition border border-gray-200 text-gray-700">
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={currentStep === totalSteps ? handleSubmit : () => setCurrentStep(p => p + 1)}
            disabled={!canProceed() || isSubmitting}
            className="px-8 py-2.5 bg-rose-500 text-white font-semibold text-sm rounded-full hover:bg-rose-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-rose-200">
            {currentStep === totalSteps
              ? isSubmitting ? 'Publishing…' : 'Publish listing'
              : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListingForm;