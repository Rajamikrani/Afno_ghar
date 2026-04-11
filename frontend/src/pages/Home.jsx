import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, MapPin, Heart, Star, Users, Bed, Bath,
  Minus, Plus, X, SlidersHorizontal, ChevronLeft, ChevronRight,
  Home as HomeIcon, Sparkles, TrendingUp, Zap, ChevronDown, ChevronUp,
  LayoutGrid
} from 'lucide-react';
import {
  fetchListings, getCurrentUser,
  getMyWishlist, toggleWishlistItem, fetchRecommendations,
  fetchCategories,
} from '../service/api';
import { useNavigate } from 'react-router-dom';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const hasRole = (u, r) => u?.role === r;

/* ─── tiny image carousel on each card ───────────────────────────────── */
function CardCarousel({ images, title }) {
  const [idx, setIdx] = useState(0);
  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); };

  return (
    <div className="relative h-56 bg-gray-100 overflow-hidden rounded-2xl">
      <img
        src={images[idx]}
        alt={title}
        className="w-full h-full object-cover transition-opacity duration-300"
        loading="lazy"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
            {images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`rounded-full transition-all ${i === idx ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── listing card ────────────────────────────────────────────────────── */
function ListingCard({ listing, wishlisted, onToggleWishlist, onClick, recommended = false }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer"
      style={{ animation: 'fadeUp 0.4s ease both' }}
    >
      <div className="relative">
        <CardCarousel
          images={listing.images?.length ? listing.images : ['https://placehold.co/400x300?text=No+Image']}
          title={listing.title}
        />

        {/* Wishlist btn */}
        <button
          onClick={e => onToggleWishlist(e, listing._id)}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
        >
          <Heart className={`w-4 h-4 transition-colors ${wishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-600'}`} />
        </button>

        {/* Badges */}
        {wishlisted && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-800 rounded-full shadow-sm">
            ❤️ Saved
          </div>
        )}
        {recommended && !wishlisted && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-full shadow-md">
            <Sparkles className="w-3 h-3" /> For you
          </div>
        )}
      </div>
      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate text-sm leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
              {listing.title}
            </h3>
            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              {listing.location?.city}, {listing.location?.country}
            </p>
          </div>
          {listing.averageRating > 0 && (
            <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-gray-900 text-gray-900" />
              <span className="text-xs font-semibold text-gray-900">{Number(listing.averageRating).toFixed(1)}</span>
              <span className="text-xs text-gray-400">({listing.numberOfRatings})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{listing.maxGuests}</span>
          <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{listing.bedrooms}</span>
          <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{listing.bathrooms}</span>
          <span className="ml-auto text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full capitalize font-medium">
            {listing.category?.name}
          </span>
        </div>

        <div className="mt-2">
          <span className="font-bold text-gray-900">${listing.price}</span>
          <span className="text-gray-400 text-xs ml-1">/ night</span>
        </div>
      </div>
    </div>
  );
}

/* ─── section header ──────────────────────────────────────────────────── */
function SectionHeader({ icon, title, subtitle, accentColor = 'rose' }) {
  const colorMap = {
    rose:   { icon: 'text-rose-500',   bg: 'bg-rose-50',   border: 'border-rose-100' },
    violet: { icon: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
    amber:  { icon: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-100' },
  };
  const c = colorMap[accentColor] || colorMap.rose;

  return (
    <div className={`flex items-center gap-3 mb-5 px-4 py-3 ${c.bg} border ${c.border} rounded-2xl`}>
      <div className={`w-8 h-8 ${c.bg} border ${c.border} rounded-xl flex items-center justify-center ${c.icon}`}>
        {icon}
      </div>
      <div>
        <p className="font-bold text-gray-900 text-sm leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ─── skeleton ────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 rounded-2xl h-56 mb-3" />
      <div className="space-y-2 px-0.5">
        <div className="bg-gray-200 h-4 rounded w-3/4" />
        <div className="bg-gray-100 h-3 rounded w-1/2" />
        <div className="bg-gray-100 h-3 rounded w-1/3" />
      </div>
    </div>
  );
}

/* ─── recommendation skeleton strip ──────────────────────────────────── */
function RecommendationSkeleton() {
  return (
    <div className="mb-10">
      <div className="animate-pulse flex items-center gap-3 mb-5 px-4 py-3 bg-gray-50 rounded-2xl">
        <div className="w-8 h-8 bg-gray-200 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded w-40" />
          <div className="h-2.5 bg-gray-100 rounded w-56" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

/* ─── category strip skeleton ─────────────────────────────────────────── */
function CategorySkeleton() {
  return (
    <>
      {[...Array(7)].map((_, i) => (
        <div key={i} className="animate-pulse flex flex-col items-center gap-1.5 pb-1 shrink-0">
          <div className="w-7 h-7 bg-gray-200 rounded-full" />
          <div className="w-14 h-2.5 bg-gray-200 rounded" />
        </div>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
const Home = () => {
  const navigate = useNavigate();

  /* ── base data ───────────────────────────────────────────────────── */
  const [allListings,      setAllListings]      = useState([]);
  const [recommendations,  setRecommendations]  = useState([]);
  const [recLoading,       setRecLoading]       = useState(true);
  const [recType,          setRecType]          = useState('none');
  const [loading,          setLoading]          = useState(true);
  const [user,             setUser]             = useState(null);
  const [wishlistedIds,    setWishlistedIds]    = useState(new Set());

  /* ── dynamic categories from DB ──────────────────────────────────── */
  const [dbCategories,     setDbCategories]     = useState([]);   // all from API
  const [catsLoading,      setCatsLoading]      = useState(true);
  const [showAllCats,      setShowAllCats]      = useState(false); // More toggle
  const CATS_VISIBLE = 6; // how many to show before "More"

  /* ── filters ─────────────────────────────────────────────────────── */
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange,       setPriceRange]       = useState('all');
  const [showFilters,      setShowFilters]      = useState(false);

  /* ── search ──────────────────────────────────────────────────────── */
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeSearchTab,    setActiveSearchTab]    = useState('location');
  const [searchData, setSearchData] = useState({
    location: '', checkIn: '', checkOut: '',
    guests: { adults: 0, children: 0, infants: 0, pets: 0 }
  });
  const searchRef = useRef(null);

  const priceRanges = {
    all:    { min: undefined, max: undefined,  label: 'Any price' },
    low:    { min: 0,         max: 49,         label: 'Under $50' },
    medium: { min: 50,        max: 149,        label: '$50–$149'  },
    high:   { min: 150,       max: undefined,  label: '$150+'     },
  };

  /* ── fetch categories from DB ────────────────────────────────────── */
  useEffect(() => {
    setCatsLoading(true);
    fetchCategories()
      .then(res => {
        // handle both res.data.data (array) and res.data (array)
        const raw = res?.data?.data ?? res?.data ?? [];
        const active = Array.isArray(raw)
          ? raw.filter(c => c.isActive !== false)  // show only active ones
          : [];
        setDbCategories(active);
      })
      .catch(() => setDbCategories([]))
      .finally(() => setCatsLoading(false));
  }, []);

  /* ── built category list: "All" + DB items ───────────────────────── */
  // Always show "All" first, then DB categories
  const allCategoryOption = { _id: 'all', name: 'All', icon: '🌍' };

  // The visible slice (All + first CATS_VISIBLE db cats, or all if expanded)
  const visibleDbCats = showAllCats
    ? dbCategories
    : dbCategories.slice(0, CATS_VISIBLE);

  const hasMoreCats = dbCategories.length > CATS_VISIBLE;

  /* ══════════════════════════════════════════════════════════════════
     STEP 1 — Load current user + wishlist + all listings in parallel
  ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [listRes, userRes, wlRes] = await Promise.allSettled([
          fetchListings(),
          getCurrentUser(),
          getMyWishlist().catch(() => null),
        ]);

        if (listRes.status === 'fulfilled') {
          const raw = listRes.value.data.data;
          const listings = Array.isArray(raw) ? raw : raw?.listings ?? [];
          setAllListings(listings);
        }

        let resolvedUser = null;
        if (userRes.status === 'fulfilled' && userRes.value.data?.data) {
          resolvedUser = userRes.value.data.data;
          setUser(resolvedUser);
        }

        if (wlRes.status === 'fulfilled' && wlRes.value) {
          const wl = wlRes.value.data?.data?.listings || [];
          setWishlistedIds(new Set(wl.map(l => String(l._id || l))));
        }
      } catch (err) {
        console.error('Init failed:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  /* ══════════════════════════════════════════════════════════════════
     STEP 2 — Recommendations
  ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (loading || allListings.length === 0) return;

    const fallbackToTrending = (listings) => {
      const rated   = [...listings].filter(l => (l.averageRating || 0) > 0)
        .sort((a, b) => b.averageRating - a.averageRating || (b.numberOfRatings || 0) - (a.numberOfRatings || 0));
      const unrated = [...listings].filter(l => !(l.averageRating > 0))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const trending = [...rated, ...unrated].slice(0, 8);
      setRecommendations(trending);
      setRecType('trending');
      setRecLoading(false);
    };

    const loadRecommendations = async () => {
      setRecLoading(true);

      if (!user) {
        fallbackToTrending(allListings);
        return;
      }

      try {
        const res = await fetchRecommendations();
        const raw     = res.data?.data ?? res.data ?? [];
        const message = res.data?.message || '';
        const recs    = Array.isArray(raw) ? raw : [];

        const isPersonalised =
          recs.length >= 1 &&
          !message.toLowerCase().includes('popular');

        if (isPersonalised) {
          const normalized = recs.map(l => ({
            ...l,
            images: Array.isArray(l.images)
              ? l.images.flatMap(img => img.includes(',') ? img.split(',') : [img])
              : [],
          }));
          setRecommendations(normalized);
          setRecType('personalised');
          setRecLoading(false);
        } else {
          fallbackToTrending(allListings);
        }
      } catch {
        fallbackToTrending(allListings);
      }
    };

    loadRecommendations();
  }, [user, loading, allListings]);

  /* ── close search on outside click ─────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ══════════════════════════════════════════════════════════════════
     FILTERING
     Category matching: use DB category name (case-insensitive)
  ══════════════════════════════════════════════════════════════════ */
  const recIds = new Set(recommendations.map(l => String(l._id)));

  const applyFilters = useCallback((list) => {
    return list.filter(l => {
      const matchCat = selectedCategory === 'all' ||
        l.category?.name?.toLowerCase() === selectedCategory.toLowerCase();

      const matchLoc = !searchData.location ||
        l.title?.toLowerCase().includes(searchData.location.toLowerCase()) ||
        l.location?.city?.toLowerCase().includes(searchData.location.toLowerCase()) ||
        l.location?.country?.toLowerCase().includes(searchData.location.toLowerCase());

      const price = Number(l.price) || 0;
      const { min, max } = priceRanges[priceRange] || {};
      const matchPrice = (min === undefined || price >= min) && (max === undefined || price <= max);

      const totalGuests = searchData.guests.adults + searchData.guests.children;
      const matchGuests = totalGuests === 0 || l.maxGuests >= totalGuests;

      return matchCat && matchLoc && matchPrice && matchGuests;
    });
  }, [selectedCategory, searchData, priceRange]);

  const filteredRecs = applyFilters(recommendations);
  const filteredMain = applyFilters(
    allListings.filter(l => !recIds.has(String(l._id)))
  );

  const hasActiveFilter = selectedCategory !== 'all' || priceRange !== 'all' ||
    searchData.location || Object.values(searchData.guests).some(v => v > 0);

  const unifiedFilteredAll = hasActiveFilter ? applyFilters(allListings) : [];

  /* ── wishlist toggle ────────────────────────────────────────────── */
  const toggleFavorite = async (e, id) => {
    e.stopPropagation();
    const strId = String(id);
    const was   = wishlistedIds.has(strId);

    setWishlistedIds(prev => {
      const next = new Set(prev);
      was ? next.delete(strId) : next.add(strId);
      return next;
    });

    try {
      const res = await toggleWishlistItem(strId);
      const updated = res.data?.data?.listings || [];
      setWishlistedIds(new Set(updated.map(item => String(item?._id || item))));
    } catch (err) {
      setWishlistedIds(prev => {
        const next = new Set(prev);
        was ? next.add(strId) : next.delete(strId);
        return next;
      });
      if (err?.response?.status === 401) navigate('/login');
    }
  };

  /* ── helpers ────────────────────────────────────────────────────── */
  const updateGuests = (type, op) => {
    setSearchData(prev => ({
      ...prev,
      guests: {
        ...prev.guests,
        [type]: op === 'add' ? prev.guests[type] + 1 : Math.max(0, prev.guests[type] - 1)
      }
    }));
  };

  const getTotalGuests = () => {
    const { adults, children, infants, pets } = searchData.guests;
    const total = adults + children;
    if (total === 0) return 'Add guests';
    let txt = `${total} guest${total > 1 ? 's' : ''}`;
    if (infants) txt += `, ${infants} infant${infants > 1 ? 's' : ''}`;
    if (pets)    txt += `, ${pets} pet${pets > 1 ? 's' : ''}`;
    return txt;
  };

  const clearSearch = () => setSearchData({
    location: '', checkIn: '', checkOut: '',
    guests: { adults: 0, children: 0, infants: 0, pets: 0 }
  });

  const clearAllFilters = () => {
    clearSearch();
    setSelectedCategory('all');
    setPriceRange('all');
  };

  const handleDashboard = () => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'admin')       navigate('/admin-panel');
    else if (user.role === 'host')   navigate('/host-panel');
    else                              navigate('/guest-panel');
  };

  const hasActiveSearch = searchData.location || searchData.checkIn ||
    Object.values(searchData.guests).some(v => v > 0);

  const sectionConfig = {
    personalised: {
      icon:     <Sparkles className="w-4 h-4" />,
      title:    `Picked for you, ${user?.fullname?.split(' ')[0] || 'you'}`,
      subtitle: 'Based on your past stays and preferences',
      accent:   'violet',
    },
    trending: {
      icon:     <TrendingUp className="w-4 h-4" />,
      title:    user ? 'Explore top stays' : 'Trending right now',
      subtitle: user
        ? 'Discover the most-loved places on Afno Ghar'
        : 'Most popular listings right now',
      accent:   'amber',
    },
  };

  const totalCount = hasActiveFilter
    ? unifiedFilteredAll.length
    : recLoading
      ? applyFilters(allListings).length
      : (filteredRecs.length + filteredMain.length);

  return (
    <div className="min-h-screen bg-[#faf9f7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .cat-expand { animation: fadeIn 0.2s ease both; }
      `}</style>

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* top row */}
          <div className="flex items-center justify-between py-4 gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-xl font-bold text-rose-500 shrink-0"
              style={{ fontFamily: "'Fraunces', serif", letterSpacing: '-0.03em' }}
            >
              Afno Ghar
            </button>

            {/* Search pill (desktop collapsed) */}
            <button
              onClick={() => { setShowSearchDropdown(true); setActiveSearchTab('location'); }}
              className="hidden md:flex flex-1 max-w-md items-center gap-3 border border-gray-200 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow bg-white text-left"
            >
              <Search className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-700 font-medium truncate">
                  {searchData.location || 'Where to?'}
                </span>
                {(searchData.checkIn || searchData.checkOut) && (
                  <span className="text-xs text-gray-400 ml-2">
                    {searchData.checkIn} {searchData.checkOut ? `→ ${searchData.checkOut}` : ''}
                  </span>
                )}
              </div>
              {hasActiveSearch && (
                <button onClick={(e) => { e.stopPropagation(); clearSearch(); }}
                  className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition">
                  <X className="w-3 h-3 text-gray-600" />
                </button>
              )}
            </button>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
             {!!user && user.role !== 'admin' && (
               <button
                  onClick={() => navigate('/list-your-home')}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-full transition"
                >
                  🏠 List your home
                </button>
              )}

              <button
                onClick={handleDashboard}
                className="flex items-center gap-2 border border-gray-200 rounded-full pl-3 pr-1.5 py-1.5 hover:shadow-md transition-shadow bg-white"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.fullname}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-rose-100"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  style={{ display: user?.avatar ? 'none' : 'flex' }}
                  className="w-8 h-8 bg-rose-500 rounded-full items-center justify-center text-white text-sm font-bold select-none"
                >
                  {user?.fullname?.charAt(0)?.toUpperCase() || (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* ── Full search dropdown ─────────────────────────────── */}
          <div ref={searchRef} className="relative pb-3 md:pb-0">
            {/* Mobile search trigger */}
            <button
              onClick={() => { setShowSearchDropdown(true); setActiveSearchTab('location'); }}
              className="md:hidden w-full flex items-center gap-3 border border-gray-200 rounded-full px-4 py-2.5 shadow-sm bg-white"
            >
              <Search className="w-4 h-4 text-rose-400" />
              <span className="text-sm text-gray-500">{searchData.location || 'Search destinations…'}</span>
            </button>

            {showSearchDropdown && (
              <>
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setShowSearchDropdown(false)} />
                <div className="absolute top-full mt-3 left-0 right-0 md:-left-6 md:-right-6 bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-gray-100">
                  <div className="flex border-b border-gray-100 px-6 pt-4 gap-1">
                    {[
                      { id: 'location', label: '📍 Where' },
                      { id: 'checkin',  label: '📅 Check in' },
                      { id: 'checkout', label: '🗓 Check out' },
                      { id: 'guests',   label: '👥 Who' },
                    ].map(tab => (
                      <button key={tab.id} onClick={() => setActiveSearchTab(tab.id)}
                        className={`px-4 py-2 text-sm font-semibold rounded-full mb-3 transition ${
                          activeSearchTab === tab.id ? 'bg-rose-500 text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                        }`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-6">
                    {activeSearchTab === 'location' && (
                      <div>
                        <input type="text" autoFocus
                          value={searchData.location}
                          onChange={e => setSearchData(p => ({ ...p, location: e.target.value }))}
                          placeholder="Search destinations, cities, countries…"
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition" />
                        <p className="text-xs font-semibold text-gray-400 mt-5 mb-3 uppercase tracking-wide">Popular destinations</p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {['Kathmandu', 'Pokhara', 'Chitwan', 'Lumbini', 'Nagarkot', 'Bandipur'].map(city => (
                            <button key={city}
                              onClick={() => setSearchData(p => ({ ...p, location: city }))}
                              className={`p-3 rounded-xl text-center text-xs font-medium border transition ${
                                searchData.location === city ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                              }`}>
                              {city}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {activeSearchTab === 'checkin' && (
                      <div className="max-w-xs">
                        <label className="block text-xs font-semibold text-gray-500 mb-2">Select check-in date</label>
                        <input type="date" value={searchData.checkIn}
                          onChange={e => setSearchData(p => ({ ...p, checkIn: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                      </div>
                    )}
                    {activeSearchTab === 'checkout' && (
                      <div className="max-w-xs">
                        <label className="block text-xs font-semibold text-gray-500 mb-2">Select check-out date</label>
                        <input type="date" value={searchData.checkOut}
                          onChange={e => setSearchData(p => ({ ...p, checkOut: e.target.value }))}
                          min={searchData.checkIn || new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                      </div>
                    )}
                    {activeSearchTab === 'guests' && (
                      <div className="max-w-sm">
                        {[
                          { type: 'adults',   label: 'Adults',   sub: 'Ages 13+' },
                          { type: 'children', label: 'Children', sub: 'Ages 2–12' },
                          { type: 'infants',  label: 'Infants',  sub: 'Under 2' },
                          { type: 'pets',     label: 'Pets',     sub: 'Service animals welcome' },
                        ].map(({ type, label, sub }, i, arr) => (
                          <div key={type} className={`flex items-center justify-between py-3.5 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{label}</p>
                              <p className="text-xs text-gray-400">{sub}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button onClick={() => updateGuests(type, 'subtract')}
                                disabled={searchData.guests[type] === 0}
                                className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:border-gray-600 disabled:opacity-30 transition">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-5 text-center text-sm font-semibold">{searchData.guests[type]}</span>
                              <button onClick={() => updateGuests(type, 'add')}
                                className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:border-gray-600 transition">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button onClick={clearSearch} className="text-sm font-semibold text-gray-600 underline hover:text-gray-900 transition">Clear all</button>
                    <button onClick={() => setShowSearchDropdown(false)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition shadow-md shadow-rose-200">
                      <Search className="w-4 h-4" /> Search
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Category strip ───────────────────────────────────────── */}
        <div className="border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-6 overflow-x-auto py-3 scrollbar-hide">

              {/* ── "All" pill — always visible ── */}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex flex-col items-center gap-1.5 pb-1 border-b-2 shrink-0 transition-all ${
                  selectedCategory === 'all'
                    ? 'border-rose-500 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">🌍</span>
                <span className="text-xs font-semibold whitespace-nowrap">All</span>
              </button>

              {/* ── DB categories (loading skeleton / real items) ── */}
              {catsLoading ? (
                <CategorySkeleton />
              ) : (
                <>
                  {visibleDbCats.map(cat => (
                    <button
                      key={cat._id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`flex flex-col items-center gap-1.5 pb-1 border-b-2 shrink-0 transition-all cat-expand ${
                        selectedCategory === cat.name
                          ? 'border-rose-500 text-gray-900'
                          : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl">{cat.icon || '🏠'}</span>
                      <span className="text-xs font-semibold whitespace-nowrap">{cat.name}</span>
                    </button>
                  ))}

                  {/* ── More / Less toggle button ── */}
                  {hasMoreCats && (
                    <button
                      onClick={() => setShowAllCats(v => !v)}
                      className={`flex flex-col items-center gap-1.5 pb-1 border-b-2 shrink-0 transition-all ${
                        showAllCats
                          ? 'border-gray-400 text-gray-700'
                          : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-full">
                        {showAllCats
                          ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
                          : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                        }
                      </span>
                      <span className="text-xs font-semibold whitespace-nowrap">
                        {showAllCats ? 'Less' : `More`}
                      </span>
                    </button>
                  )}
                </>
              )}

              {/* ── Divider + Filters button ── */}
              <div className="shrink-0 w-px h-8 bg-gray-200 mx-1" />
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-semibold transition ${
                  priceRange !== 'all' ? 'border-rose-400 text-rose-600 bg-rose-50' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {priceRange !== 'all' && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Price filter drawer ───────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price range</span>
              {Object.entries(priceRanges).map(([key, { label }]) => (
                <button key={key} onClick={() => setPriceRange(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                    priceRange === key ? 'bg-rose-500 text-white shadow-md shadow-rose-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {label}
                </button>
              ))}
              {priceRange !== 'all' && (
                <button onClick={() => setPriceRange('all')} className="text-xs text-rose-500 font-semibold underline ml-2">Clear</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── result count + clear ─────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{totalCount}</span>
              {' '}listing{totalCount !== 1 ? 's' : ''}
              {searchData.location && <> in <span className="font-semibold text-gray-900">{searchData.location}</span></>}
            </p>
            {hasActiveFilter && (
              <button onClick={clearAllFilters} className="text-xs text-rose-500 font-semibold underline">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            LOADING STATE
        ════════════════════════════════════════════════════════════════ */}
        {loading ? (
          <div>
            <RecommendationSkeleton />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>

        ) : totalCount === 0 && !recLoading ? (
          /* ── Empty state ─────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
              <HomeIcon className="w-9 h-9 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              No listings found
            </h3>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
              Try adjusting your search filters or exploring a different category.
            </p>
            <button onClick={clearAllFilters}
              className="mt-5 px-5 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-full hover:bg-rose-600 transition">
              Reset all filters
            </button>
          </div>

        ) : hasActiveFilter ? (
          /* ════════════════════════════════════════════════════════════
             FILTERED MODE — one unified grid
          ════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {unifiedFilteredAll.map((listing, i) => (
              <div key={listing._id} style={{ animationDelay: `${i * 40}ms` }}>
                <ListingCard
                  listing={listing}
                  wishlisted={wishlistedIds.has(String(listing._id))}
                  onToggleWishlist={toggleFavorite}
                  onClick={() => navigate(`/listing/${listing._id}`)}
                />
              </div>
            ))}
          </div>

        ) : (
          /* ════════════════════════════════════════════════════════════
             DEFAULT MODE — recommendations on top, rest below
          ════════════════════════════════════════════════════════════ */
          <div>

            {recLoading ? (
              <RecommendationSkeleton />
            ) : recType !== 'none' && filteredRecs.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  icon={sectionConfig[recType].icon}
                  title={sectionConfig[recType].title}
                  subtitle={sectionConfig[recType].subtitle}
                  accentColor={sectionConfig[recType].accent}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredRecs.map((listing, i) => (
                    <div key={listing._id} style={{ animationDelay: `${i * 40}ms` }}>
                      <ListingCard
                        listing={listing}
                        wishlisted={wishlistedIds.has(String(listing._id))}
                        onToggleWishlist={toggleFavorite}
                        onClick={() => navigate(`/listing/${listing._id}`)}
                        recommended={recType === 'personalised'}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {recType !== 'none' && filteredRecs.length > 0 && filteredMain.length > 0 && (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex items-center gap-2 shrink-0">
                  <HomeIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">All listings</span>
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            {filteredMain.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMain.map((listing, i) => (
                  <div key={listing._id} style={{ animationDelay: `${i * 40}ms` }}>
                    <ListingCard
                      listing={listing}
                      wishlisted={wishlistedIds.has(String(listing._id))}
                      onToggleWishlist={toggleFavorite}
                      onClick={() => navigate(`/listing/${listing._id}`)}
                    />
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default Home;