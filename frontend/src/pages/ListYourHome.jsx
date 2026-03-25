import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Home, DollarSign, Shield, Star, Users,
  TrendingUp, Clock, CheckCircle, ChevronRight, Sparkles,
  Camera, MapPin, Calendar
} from "lucide-react";
import ListingForm from "../components/Listings/ListingForm";
import { getCurrentUser } from "../service/api";

/* ─── tiny stat card ─────────────────────────────────────────────────────── */
const StatCard = ({ value, label, icon: Icon, delay = 0 }) => (
  <div
    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center"
    style={{ animation: `fadeUp 0.5s ease ${delay}ms both` }}
  >
    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-3">
      <Icon className="w-5 h-5 text-rose-500" />
    </div>
    <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>{value}</p>
    <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
  </div>
);

/* ─── step card ──────────────────────────────────────────────────────────── */
const StepCard = ({ number, title, desc, icon: Icon, delay = 0 }) => (
  <div
    className="flex gap-4"
    style={{ animation: `fadeUp 0.5s ease ${delay}ms both` }}
  >
    <div className="shrink-0 flex flex-col items-center">
      <div className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md shadow-rose-200">
        {number}
      </div>
      {number < 3 && <div className="w-px flex-1 bg-gradient-to-b from-rose-200 to-transparent mt-2 min-h-8" />}
    </div>
    <div className="pb-8">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-rose-400" />
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);

/* ─── benefit pill ───────────────────────────────────────────────────────── */
const Benefit = ({ children }) => (
  <li className="flex items-center gap-2 text-sm text-gray-700">
    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
    {children}
  </li>
);

/* ══════════════════════════════════════════════════════════════════════════ */
const ListYourHome = () => {
  const navigate  = useNavigate();
  const [user,      setUser]      = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(res => { if (res.data?.data) setUser(res.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* If user is not logged in, redirect to login */
  const handleGetStarted = () => {
    if (!user) { navigate("/login"); return; }
    setShowForm(true);
  };

  const isAlreadyHost = Array.isArray(user?.role)
    ? user.role.includes("host")
    : user?.role === "host";

  if (showForm) {
    return <ListingForm onClose={() => setShowForm(false)} />;
  }

  return (
    <div
      className="min-h-screen bg-[#faf9f7]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0);    }
          50%       { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .hero-badge {
          background: linear-gradient(90deg, #f43f5e, #fb7185, #f43f5e);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .float-card { animation: float 4s ease-in-out infinite; }
        .float-card-2 { animation: float 4s ease-in-out 1.5s infinite; }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-gray-500 hover:text-rose-500 transition text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
          </div>

          <span
            className="text-xl font-bold text-rose-500"
            style={{ fontFamily: "'Fraunces', serif", letterSpacing: "-0.03em" }}
          >
            Afno Ghar
          </span>

          {!loading && (
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <img
                    src={
                      user.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname || "U")}&background=f43f5e&color=fff`
                    }
                    alt={user.fullname}
                    className="w-8 h-8 rounded-full object-cover border-2 border-rose-100"
                  />
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {user.fullname}
                  </span>
                </>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm font-semibold text-rose-500 hover:text-rose-600 transition"
                >
                  Sign in
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">

        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-100 rounded-full opacity-30 blur-3xl translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-100 rounded-full opacity-20 blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div style={{ animation: "fadeUp 0.6s ease both" }}>

              {/* Role-aware badge */}
              {isAlreadyHost ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700 mb-5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  You're already a host — add another listing!
                </div>
              ) : user ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full text-xs font-semibold text-rose-600 mb-5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Publishing your listing will unlock host privileges
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 mb-5">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  Join thousands of hosts across Nepal
                </div>
              )}

              <h1
                className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-5"
                style={{ fontFamily: "'Fraunces', serif", letterSpacing: "-0.02em" }}
              >
                Turn your space into{" "}
                <span className="hero-badge">extra income</span>
              </h1>

              <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
                List any space — from a spare room to a full villa — and start
                welcoming guests. You stay in control of your schedule, pricing,
                and house rules.
              </p>

              <ul className="space-y-2.5 mb-10">
                <Benefit>No listing fee — it's completely free to publish</Benefit>
                <Benefit>You keep full control over availability & pricing</Benefit>
                <Benefit>Continue booking other stays as a guest too</Benefit>
                <Benefit>24/7 support from the Afno Ghar team</Benefit>
              </ul>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleGetStarted}
                  className="px-7 py-3.5 bg-rose-500 text-white font-semibold rounded-full hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-200 flex items-center gap-2"
                >
                  {user ? "Start listing your home" : "Sign in to get started"}
                  <ChevronRight className="w-4 h-4" />
                </button>
                {user && (
                  <button
                    onClick={() => navigate(isAlreadyHost ? "/host-panel" : "/guest-panel")}
                    className="px-7 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-full hover:border-rose-300 hover:text-rose-500 transition-all"
                  >
                    Go to my dashboard
                  </button>
                )}
              </div>
            </div>

            {/* Right — floating preview cards */}
            <div className="hidden lg:flex items-center justify-center relative h-[420px]">

              {/* Main card */}
              <div className="float-card absolute w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="h-36 bg-gradient-to-br from-rose-200 via-rose-100 to-amber-100 flex items-center justify-center">
                  <Home className="w-12 h-12 text-rose-300" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900 text-sm" style={{ fontFamily: "'Fraunces', serif" }}>
                      Cozy Mountain Cottage
                    </p>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-gray-800">4.9</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <MapPin className="w-3 h-3" /> Nagarkot, Nepal
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-bold text-sm">$65 <span className="text-gray-400 font-normal">/ night</span></span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">Listed</span>
                  </div>
                </div>
              </div>

              {/* Earnings card — floats slightly different */}
              <div className="float-card-2 absolute top-4 right-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 w-48">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-xs font-semibold text-gray-600">This month</span>
                </div>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>$1,240</p>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">↑ 18% vs last month</p>
                <div className="mt-3 flex gap-1">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 bg-emerald-100 rounded-sm" style={{ height: `${h * 0.5}px`, alignSelf: "flex-end" }} />
                  ))}
                </div>
              </div>

              {/* Booking request card */}
              <div className="float-card absolute -bottom-4 right-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-3.5 w-52">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center text-lg">🙋</div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">New booking request</p>
                    <p className="text-xs text-gray-400">Priya S. · 3 nights</p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3">
                  <button className="flex-1 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded-lg">Accept</button>
                  <button className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg">Decline</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard value="10,000+" label="Active hosts"         icon={Users}      delay={0}   />
            <StatCard value="$1,200"  label="Avg. monthly earning" icon={DollarSign} delay={80}  />
            <StatCard value="4.8★"    label="Average host rating"  icon={Star}       delay={160} />
            <StatCard value="Free"    label="To list your property" icon={Shield}     delay={240} />
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          <div>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-3">How it works</p>
            <h2
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight"
              style={{ fontFamily: "'Fraunces', serif", letterSpacing: "-0.02em" }}
            >
              List your home in<br />just 3 simple steps
            </h2>
            <p className="text-gray-500 mb-10 leading-relaxed">
              Our guided listing wizard walks you through everything — from selecting
              your property type to setting your nightly rate. Most hosts finish in under 15 minutes.
            </p>

            <div className="space-y-0">
              <StepCard
                number={1} delay={0}
                icon={Camera}
                title="Describe your place"
                desc="Choose your property type, add photos (at least 5), and write a title and description that highlights what makes it special."
              />
              <StepCard
                number={2} delay={100}
                icon={MapPin}
                title="Set your location & amenities"
                desc="Pin your exact location on the map and select all available amenities. Guests love detailed, transparent listings."
              />
              <StepCard
                number={3} delay={200}
                icon={DollarSign}
                title="Set your price and publish"
                desc="Choose a competitive nightly rate, add optional cleaning fees and discounts, then hit publish. You're now a host!"
              />
            </div>
          </div>

          {/* FAQ / info panel */}
          <div className="space-y-4" style={{ animation: "fadeUp 0.6s ease 0.2s both" }}>

            {[
              {
                q: "Can I still book stays as a guest?",
                a: "Absolutely! Publishing a listing upgrades your account to a dual-role — you can both host and book stays simultaneously from the same account.",
                icon: "🎉"
              },
              {
                q: "Is there a fee to list my property?",
                a: "Listing your home on Afno Ghar is completely free. We only collect a small service fee when a booking is confirmed.",
                icon: "✅"
              },
              {
                q: "Can I control my availability?",
                a: "Yes, you have full control over your calendar, pricing, minimum stay requirements, and house rules at any time.",
                icon: "📅"
              },
              {
                q: "What happens after I publish?",
                a: "Your listing goes live immediately. Guests can find and book your property, and you'll receive email notifications for every request.",
                icon: "🚀"
              },
            ].map(({ q, a, icon }) => (
              <details
                key={q}
                className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
              >
                <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer list-none select-none">
                  <span className="text-lg">{icon}</span>
                  <span className="flex-1 text-sm font-semibold text-gray-800">{q}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 shrink-0" />
                </summary>
                <div className="px-5 pb-4 pt-0 text-sm text-gray-500 leading-relaxed border-t border-gray-50 ml-9">
                  {a}
                </div>
              </details>
            ))}

            {/* Dual-role info card */}
            {user && !isAlreadyHost && (
              <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-100 rounded-2xl p-5 flex gap-4 items-start">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="font-semibold text-rose-700 text-sm mb-1">You'll become a dual-role user</p>
                  <p className="text-xs text-rose-600 leading-relaxed">
                    Once you publish your first listing, your account is automatically
                    upgraded. You'll gain access to the Host Dashboard while keeping
                    all your guest booking history and wishlist.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div
          className="relative bg-rose-500 rounded-3xl overflow-hidden px-8 py-14 text-center"
          style={{ animation: "fadeUp 0.6s ease 0.3s both" }}
        >
          {/* Decorative blobs */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-56 h-56 bg-white opacity-5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-white/90 text-xs font-semibold mb-5 backdrop-blur-sm">
              <Clock className="w-3.5 h-3.5" /> Takes less than 15 minutes
            </div>

            <h2
              className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight"
              style={{ fontFamily: "'Fraunces', serif", letterSpacing: "-0.02em" }}
            >
              Ready to start earning?
            </h2>
            <p className="text-white/80 text-base mb-8 max-w-md mx-auto leading-relaxed">
              Join the Afno Ghar host community and turn your empty space into a
              steady income stream — on your own terms.
            </p>

            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-rose-500 font-bold rounded-full hover:bg-rose-50 active:scale-95 transition-all shadow-xl text-sm"
            >
              {user ? "List my home now" : "Sign in to get started"}
              <ChevronRight className="w-4 h-4" />
            </button>

            {user && (
              <p className="mt-4 text-white/60 text-xs">
                Logged in as <span className="text-white font-medium">{user.fullname}</span>
                {isAlreadyHost && " · Active host"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer note ─────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Afno Ghar · Built with ❤️ for Nepal
      </footer>
    </div>
  );
};

export default ListYourHome;