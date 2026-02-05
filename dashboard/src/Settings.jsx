import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './firebase';
import { collection, getDocs, writeBatch, query } from 'firebase/firestore';
import { 
  User, 
  Download, 
  Trash2, 
  LogOut, 
  Shield, 
  Server,
  AlertCircle 
} from 'lucide-react';

export default function Settings() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // ACTION: Export Data
  const handleExportData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'meetings'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = href;
      link.download = `meet-transcriber-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage({ type: 'success', text: 'Backup downloaded successfully.' });
    } catch (error) {
      console.error("Export error:", error);
      setMessage({ type: 'error', text: 'Failed to export data. Check console.' });
    }
    setLoading(false);
  };

  // ACTION: Delete History
  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure? This will delete ALL your meeting history permanently.")) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'meetings'));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      setMessage({ type: 'success', text: 'All history has been cleared.' });
    } catch (error) {
      console.error("Delete error:", error);
      setMessage({ type: 'error', text: 'Failed to delete data.' });
    }
    setLoading(false);
  };

  return (
    // 1. ADDED SCROLL CONTAINER HERE
    <div className="h-full overflow-y-auto bg-white">
      <div className="w-full max-w-4xl p-10 font-sans text-gray-900">
        
        <header className="mb-12 pb-6 border-b border-gray-100">
          <h1 className="text-3xl font-bold tracking-tight">Account & Settings</h1>
          <p className="text-gray-500 mt-2">Manage your profile and data preferences.</p>
        </header>

        {/* Notification Toast */}
        {message && (
          <div className={`mb-8 p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-8 pb-20"> {/* Added bottom padding for better scroll feel */}

          {/* 1. PROFILE CARD */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <User size={18} className="text-gray-500" />
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-600">Profile</h2>
            </div>
            <div className="p-8 flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold">{user?.displayName || "User"}</h3>
                <p className="text-gray-500">{user?.email}</p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                  <Shield size={12} /> Free Plan Active
                </div>
              </div>
            </div>
          </section>

          {/* 2. DATA MANAGEMENT */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <Server size={18} className="text-gray-500" />
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-600">Data Sovereignty</h2>
            </div>
            <div className="p-8">
              <p className="text-sm text-gray-500 mb-6 max-w-2xl">
                You own your data. You can export a full backup of your meeting history in JSON format at any time.
              </p>
              <button 
                onClick={handleExportData} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Download size={16} />
                {loading ? "Processing..." : "Export All Data (JSON)"}
              </button>
            </div>
          </section>

          {/* 3. DANGER ZONE */}
          <section className="border border-red-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 bg-red-50/30 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500" />
              <h2 className="font-semibold text-sm uppercase tracking-wide text-red-600">Danger Zone</h2>
            </div>
            <div className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h3 className="font-medium text-gray-900">Clear History</h3>
                  <p className="text-sm text-gray-500 mt-1">Permanently delete all meeting records from your account.</p>
                </div>
                <button 
                  onClick={handleDeleteAll}
                  disabled={loading}
                  className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  Delete All Data
                </button>
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h3 className="font-medium text-gray-900">Sign Out</h3>
                  <p className="text-sm text-gray-500 mt-1">Log out of your account on this device.</p>
                </div>
                <button 
                  onClick={() => auth.signOut()}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Log Out
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}