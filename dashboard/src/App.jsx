import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import Login from './Login';
import Dashboard from './Dashboard';
import Layout from './Layout';
import Settings from './Settings'; 
import AuthSync from './components/AuthSync'; // <--- 1. Import is good
import LandingPage from './pages/LandingPage'; // <--- New Import


function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* 2. Add AuthSync here so it runs on every page */}
      <AuthSync /> 
      
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}