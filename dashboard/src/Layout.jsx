import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { 
  LayoutGrid, 
  Settings, 
  LogOut, 
  User,
  Globe // Added Globe icon for the Home Page button
} from 'lucide-react';

export default function Layout() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    auth.signOut();
    navigate('/'); // Send to Landing Page on logout
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const NavItem = ({ icon: Icon, label, path }) => {
    const isActive = location.pathname === path;
    return (
      <button 
        onClick={() => navigate(path)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive 
            ? 'bg-black text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Icon size={18} />
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      
      {/* SIDEBAR */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50/50">
        
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-white">
          <div className="font-bold text-lg tracking-tight flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs">M</div>
            MeetScribeAI
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Menu
          </div>
          {/* FIX: Points to /dashboard now */}
          <NavItem icon={LayoutGrid} label="My Meetings" path="/dashboard" />
          <NavItem icon={Settings} label="Account & Settings" path="/settings" />
          
          <div className="mt-4 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            External
          </div>
          {/* NEW BUTTON: Points to Landing Page */}
          <NavItem icon={Globe} label="Home Page" path="/" />
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-gray-50 border border-gray-100">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={14} className="text-gray-500"/>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.displayName || 'User'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>

          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 p-2 rounded-md border border-gray-200 text-xs font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors text-gray-700"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* HEADER */}
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {getGreeting()}, {user?.displayName?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-xs text-gray-500">Welcome to your workspace.</p>
          </div>
          <div>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-gray-200">
               Free Plan
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}