import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  LogOut, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  List, 
  ChevronRight, 
  Clock, 
  Calendar 
} from 'lucide-react';

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const [meetings, setMeetings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Meetings (Real-time)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'meetings'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMeetings(meetingsData);
      
      // Auto-select the first meeting if none selected
      if (meetingsData.length > 0 && !selectedId) {
        setSelectedId(meetingsData[0].id);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Helper to safely get the selected meeting
  const activeMeeting = meetings.find(m => m.id === selectedId);

  // Handle Logout
  const handleLogout = () => signOut(auth);

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-400 font-light">Loading workspace...</div>;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-gray-900">
      
      {/* ---------------- SIDEBAR (History) ---------------- */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50/50">
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="font-semibold text-sm tracking-wide uppercase text-gray-500">Meetings</h2>
          <button onClick={handleLogout} className="text-gray-400 hover:text-black transition-colors" title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>

        {/* Meeting List */}
        <div className="flex-1 overflow-y-auto">
          {meetings.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No meetings recorded yet.</div>
          ) : (
            meetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => setSelectedId(meeting.id)}
                className={`group px-6 py-4 border-b border-gray-100 cursor-pointer transition-all ${
                  selectedId === meeting.id 
                    ? 'bg-white border-l-4 border-l-black shadow-sm' 
                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                }`}
              >
                <h3 className={`text-sm font-medium mb-1 truncate ${selectedId === meeting.id ? 'text-black' : 'text-gray-600 group-hover:text-black'}`}>
                  {meeting.title || "Untitled Meeting"}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar size={12} />
                  <span>{new Date(meeting.meetingDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ---------------- MAIN STAGE (Report) ---------------- */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeMeeting ? (
          <div className="max-w-4xl mx-auto p-12">
            
            {/* Header */}
            <header className="mb-12 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                <Clock size={14} />
                <span>{new Date(activeMeeting.meetingDate).toLocaleString()}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-black">{activeMeeting.title || "Untitled Meeting"}</h1>
            </header>

            {/* --- THE 6 SECTIONS (Minimalist Grid) --- */}
            
            <div className="space-y-12">

              {/* 1. EXECUTIVE SUMMARY */}
              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  <FileText size={14} /> Executive Summary
                </h3>
                <div className="text-lg leading-relaxed text-gray-800 border-l-2 border-gray-900 pl-6 py-1">
                  {activeMeeting.summaryData?.summary || "Processing summary..."}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* 2. KEY POINTS */}
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                    <List size={14} /> Key Points
                  </h3>
                  <ul className="space-y-3">
                    {activeMeeting.summaryData?.keyPoints?.map((pt, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm leading-6 text-gray-600">
                        <span className="mt-1.5 w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0" />
                        {pt}
                      </li>
                    )) || <span className="text-gray-300 italic">None recorded</span>}
                  </ul>
                </section>

                {/* 3. DECISIONS */}
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                    <CheckCircle2 size={14} /> Decisions
                  </h3>
                  <ul className="space-y-3">
                    {activeMeeting.summaryData?.decisions?.map((d, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm font-medium text-gray-900">
                        <span className="mt-1 w-4 h-4 text-black flex items-center justify-center border border-black rounded text-[10px]">✓</span>
                        {d}
                      </li>
                    )) || <span className="text-gray-300 italic">None recorded</span>}
                  </ul>
                </section>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* 4. ACTION ITEMS */}
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                    <ChevronRight size={14} /> Action Items
                  </h3>
                  <div className="bg-gray-50 p-6 rounded-sm border border-gray-100">
                    <ul className="space-y-4">
                      {activeMeeting.summaryData?.actionItems?.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                          <div className="mt-0.5 w-4 h-4 border border-gray-300 bg-white rounded-sm flex-shrink-0" />
                          {item}
                        </li>
                      )) || <span className="text-gray-300 italic">None recorded</span>}
                    </ul>
                  </div>
                </section>

                {/* 5. OPEN ISSUES */}
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500 mb-4">
                    <AlertCircle size={14} /> Open Issues
                  </h3>
                  <ul className="space-y-3">
                    {activeMeeting.summaryData?.openIssues?.map((issue, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                        <span className="text-red-500 font-bold">?</span>
                        {issue}
                      </li>
                    )) || <span className="text-gray-300 italic">None recorded</span>}
                  </ul>
                </section>
              </div>

              {/* 6. TRANSCRIPT (Collapsed) */}
              <section className="pt-12 border-t border-gray-100 mt-12">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    Full Transcript
                  </summary>
                  <div className="mt-6 p-6 bg-gray-50 text-xs font-mono text-gray-500 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto border border-gray-100 rounded-sm">
                    {activeMeeting.transcript || "No transcript available."}
                  </div>
                </details>
              </section>

            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <div className="w-16 h-16 border-2 border-gray-100 rounded-full flex items-center justify-center mb-4">
              <List size={24} className="opacity-20" />
            </div>
            <p>Select a meeting to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}