import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import Login from './Login';
import Dashboard from './Dashboard';
import Layout from './Layout';
import Settings from './Settings'; 
import AuthSync from './components/AuthSync'; 
import LandingPage from './pages/LandingPage'; 

function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  // Show a loading spinner while checking auth status
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthSync /> 
      
      <Routes>
        {/* Public Route: The Landing Page lives at root "/" */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          {/* CRITICAL FIX: Dashboard MUST be at "/dashboard", not "/" */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback: If they go to a weird URL, send them home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}