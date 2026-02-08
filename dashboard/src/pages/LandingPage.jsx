import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth'; // <--- 1. Import Auth Hook
import { auth } from '../firebase'; // <--- 2. Import Auth Instance
import { 
  Check, Chrome, Star, Zap, Shield, 
  Layout, Users, ArrowRight, Play, LayoutDashboard 
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth); // <--- 3. Get User Status

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-green-100">
      
      {/* === NAVBAR === */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
              M
            </div>
            <span className="text-xl font-bold tracking-tight">MeetScribeAI</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-green-600 transition">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-green-600 transition">How it Works</a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            {/* 4. DYNAMIC BUTTON: Swaps between Login and Dashboard */}
            {user ? (
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="text-sm font-semibold text-slate-600 hover:text-green-600 flex items-center gap-2"
                >
                  <LayoutDashboard size={16} />
                  Go to Dashboard
                </button>
            ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className="text-sm font-semibold text-slate-600 hover:text-black"
                >
                  Log in
                </button>
            )}

            <button className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-800 transition flex items-center gap-2 shadow-lg shadow-slate-200">
              <Chrome size={18} />
              Add to Chrome
            </button>
          </div>
        </div>
      </nav>

      {/* === HERO SECTION === */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 animate-fade-in-up">
            <Star size={14} className="fill-green-700" />
            <span>#1 AI Note Taker for Google Meet</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
            Never take meeting<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
              notes again.
            </span>
          </h1>
          
          {/* Subhead */}
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Get real-time transcriptions, automated AI summaries, and action items for Google Meet. 
            Lives quietly in your browser.
          </p>
          
          {/* Main CTA */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-20">
            <button className="bg-green-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-green-700 transition transform hover:-translate-y-1 shadow-xl shadow-green-200 flex items-center gap-3">
              <Chrome size={24} />
              Add to Chrome — It's Free
            </button>
            
            {/* 5. HERO BUTTON: Secondary option to Login or go to Dashboard */}
            <button 
                onClick={() => user ? navigate('/dashboard') : navigate('/login')}
                className="px-8 py-4 rounded-full text-lg font-bold text-slate-600 hover:text-black hover:bg-slate-50 transition flex items-center gap-2"
            >
                {user ? 'Go to Dashboard' : 'Log in'}
                <ArrowRight size={20} />
            </button>
          </div>

          <p className="text-sm text-slate-400 mt-[-60px] mb-20">
              No credit card required
          </p>

          {/* Hero Image / Dashboard Mockup */}
          <div className="relative max-w-6xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-emerald-400 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
              <img 
                src="/dashboard-mockup.png" 
                alt="MeetScribe Dashboard" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* === SOCIAL PROOF === */}
      <section className="py-10 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Trusted by forward-thinking teams</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
             <h3 className="text-xl font-black text-slate-800">ACME Corp</h3>
             <h3 className="text-xl font-black text-slate-800">Stark Ind</h3>
             <h3 className="text-xl font-black text-slate-800">Wayne Ent</h3>
             <h3 className="text-xl font-black text-slate-800">Cyberdyne</h3>
          </div>
        </div>
      </section>

      {/* === FEATURES GRID === */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to run better meetings</h2>
            <p className="text-lg text-slate-500">Stop worrying about notes and focus on the conversation.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="text-yellow-500" />}
              title="Instant AI Summaries"
              desc="Turn 1-hour meetings into 2-minute summaries. Capture key decisions instantly."
            />
            <FeatureCard 
              icon={<Check className="text-green-500" />}
              title="Auto Action Items"
              desc="MeetScribe detects tasks and assigns them automatically. Never miss a follow-up."
            />
            <FeatureCard 
              icon={<Users className="text-blue-500" />}
              title="Speaker Identification"
              desc="Know exactly who said what. Perfect for user interviews and team syncs."
            />
            <FeatureCard 
              icon={<Shield className="text-purple-500" />}
              title="100% Private & Secure"
              desc="Your data is encrypted. We don't use your meetings to train our models."
            />
            <FeatureCard 
              icon={<Layout className="text-indigo-500" />}
              title="Searchable History"
              desc="Find that specific quote from a meeting 3 months ago in seconds."
            />
            <FeatureCard 
              icon={<Chrome className="text-orange-500" />}
              title="Browser Native"
              desc="No bots joining your call. MeetScribe lives quietly in your Chrome side panel."
            />
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section id="how-it-works" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">How MeetScribe works</h2>
              <div className="space-y-8">
                <Step 
                  num="01" 
                  title="Install the Extension" 
                  desc="Add to Chrome in 2 clicks. Pin it to your toolbar for easy access."
                />
                <Step 
                  num="02" 
                  title="Join any Google Meet" 
                  desc="MeetScribe automatically detects the meeting and starts capturing captions."
                />
                <Step 
                  num="03" 
                  title="Get Summary via Email" 
                  desc="As soon as the call ends, receive a beautiful AI summary in your inbox."
                />
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-green-200 rounded-full blur-3xl opacity-20"></div>
              <div className="relative bg-white p-6 rounded-2xl shadow-xl border border-slate-100 rotate-2 hover:rotate-0 transition duration-500">
                <div className="flex items-center gap-4 mb-4 border-b border-slate-50 pb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <Zap size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Meeting Summary</div>
                    <div className="text-xs text-slate-500">Generated just now</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-2 bg-slate-100 rounded w-full"></div>
                  <div className="h-2 bg-slate-100 rounded w-5/6"></div>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-xs font-bold text-green-700 mb-1">ACTION ITEMS</div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-4 h-4 rounded border border-green-500 flex items-center justify-center">
                        <Check size={10} className="text-green-500" />
                      </div>
                      Send design assets to engineering
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === BOTTOM CTA === */}
      <section className="py-24 bg-black text-white text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to upgrade your meetings?</h2>
          <p className="text-xl text-slate-400 mb-10">Join thousands of professionals saving 5+ hours a week.</p>
          <button 
            onClick={() => user ? navigate('/dashboard') : navigate('/login')}
            className="bg-green-600 text-white px-10 py-5 rounded-full text-xl font-bold hover:bg-green-500 transition shadow-2xl shadow-green-900/20"
          >
            {user ? 'Go to Dashboard' : 'Get Started for Free'}
          </button>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="bg-white py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
          <p>&copy; 2026 MeetScribeAI. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-black">Privacy Policy</a>
            <a href="#" className="hover:text-black">Terms</a>
            <a href="#" className="hover:text-black">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Subcomponents ---

const FeatureCard = ({ icon, title, desc }) => (
  <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300">
    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-slate-900">{title}</h3>
    <p className="text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

const Step = ({ num, title, desc }) => (
  <div className="flex gap-6">
    <div className="text-4xl font-black text-slate-100">{num}</div>
    <div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500">{desc}</p>
    </div>
  </div>
);

export default LandingPage;