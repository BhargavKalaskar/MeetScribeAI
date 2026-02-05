import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import { 
  FileText, CheckCircle2, AlertCircle, List, ChevronRight, 
  Clock, Calendar, Link as LinkIcon, Download, X, Search 
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // --- STATE ---
  const [meetings, setMeetings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterText, setFilterText] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // 1. Fetch Meetings
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'meetings'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeetings(meetingsData);
      
      const urlId = searchParams.get('id');
      if (urlId && meetingsData.find(m => m.id === urlId)) {
        setSelectedId(urlId);
      } else if (meetingsData.length > 0 && !selectedId) {
        handleSelectMeeting(meetingsData[0].id);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const activeMeeting = meetings.find(m => m.id === selectedId);

  const handleSelectMeeting = (id) => {
    setSelectedId(id);
    setSearchParams({ id });
  };

  // --- ACTIONS ---

  const handleExportPDF = () => {
    if (!activeMeeting) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(activeMeeting.title || "Meeting Summary", 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateStr = new Date(activeMeeting.meetingDate).toLocaleString();
    doc.text(dateStr, 20, 30);
    
    let yPos = 45;
    const addSection = (title, contentArray) => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text(title.toUpperCase(), 20, yPos);
      yPos += 10;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      if (!contentArray || contentArray.length === 0) {
        doc.text("(None)", 25, yPos);
        yPos += 10;
      } else if (typeof contentArray === 'string') {
        const splitText = doc.splitTextToSize(contentArray, 170);
        doc.text(splitText, 25, yPos);
        yPos += (splitText.length * 7) + 5;
      } else {
        contentArray.forEach(item => {
          if (yPos > 280) { doc.addPage(); yPos = 20; }
          const splitItem = doc.splitTextToSize(`• ${item}`, 170);
          doc.text(splitItem, 25, yPos);
          yPos += (splitItem.length * 7);
        });
        yPos += 5;
      }
      yPos += 10;
    };
    addSection("Executive Summary", activeMeeting.summaryData?.summary);
    addSection("Key Points", activeMeeting.summaryData?.keyPoints);
    addSection("Decisions", activeMeeting.summaryData?.decisions);
    addSection("Action Items", activeMeeting.summaryData?.actionItems);
    doc.save(`${activeMeeting.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Direct link copied!");
  };

  const getGroupedMeetings = () => {
    const groups = {};
    meetings.forEach(meeting => {
      if (filterText && !meeting.title.toLowerCase().includes(filterText.toLowerCase())) return;
      if (selectedDate && !isSameDay(new Date(meeting.meetingDate), new Date(selectedDate))) return;

      const date = new Date(meeting.meetingDate);
      let header = format(date, 'MMMM d, yyyy'); 
      if (isToday(date)) header = "Today";
      if (isYesterday(date)) header = "Yesterday";

      if (!groups[header]) groups[header] = [];
      groups[header].push(meeting);
    });
    return groups;
  };

  const groupedMeetings = getGroupedMeetings();

  if (loading) return <div className="h-full flex items-center justify-center text-gray-400 font-light">Loading workspace...</div>;

  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-gray-900 relative">
      
      {/* ---------------- SIDEBAR ---------------- */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white flex-shrink-0">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search meetings..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-gray-300 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
               <input 
                 type="date" 
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 focus:outline-none"
               />
            </div>
            {selectedDate && <button onClick={() => setSelectedDate("")} className="hover:bg-gray-200 rounded p-1.5"><X size={14}/></button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedMeetings).map(([header, groupItems]) => (
            <div key={header}>
              <div className="sticky top-0 z-10 px-6 py-2 bg-white/95 backdrop-blur-sm border-y border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{header}</div>
              <div>
                {groupItems.map((meeting) => (
                  <div
                    key={meeting.id}
                    onClick={() => handleSelectMeeting(meeting.id)}
                    className={`group relative px-6 py-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 ${selectedId === meeting.id ? 'bg-blue-50/30' : ''}`}
                  >
                    {selectedId === meeting.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-black" />}
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm font-semibold leading-tight line-clamp-2 ${selectedId === meeting.id ? 'text-black' : 'text-gray-700'}`}>{meeting.title || "Untitled"}</h3>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">{new Date(meeting.meetingDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedMeetings).length === 0 && (
            <div className="p-10 text-center">
               <p className="text-sm text-gray-400">No meetings match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeMeeting ? (
          // CHANGED: Removed mx-auto, increased max-w to 6xl, reduced padding to p-10
          <div className="w-full max-w-6xl p-10">
            
            {/* Header */}
            <header className="mb-8 pb-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5"><Calendar size={14} /><span>{new Date(activeMeeting.meetingDate).toLocaleDateString()}</span></div>
                  <div className="flex items-center gap-1.5"><Clock size={14} /><span>{new Date(activeMeeting.meetingDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopyLink} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                    <LinkIcon size={12} /> Copy Link
                  </button>
                  <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-black border border-black rounded-md hover:bg-gray-800 transition-colors">
                    <Download size={12} /> Export PDF
                  </button>
                </div>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-gray-900 leading-tight">{activeMeeting.title}</h1>
            </header>

            <div className="space-y-12">
              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4"><FileText size={14} /> Executive Summary</h3>
                <div className="text-lg leading-relaxed text-gray-800 border-l-2 border-black pl-6 py-1">{activeMeeting.summaryData?.summary}</div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4"><List size={14} /> Key Points</h3>
                  <ul className="space-y-3">{activeMeeting.summaryData?.keyPoints?.map((pt, i) => (<li key={i} className="flex items-start gap-3 text-sm leading-6 text-gray-600"><span className="mt-1.5 w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />{pt}</li>))}</ul>
                </section>
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4"><CheckCircle2 size={14} /> Decisions</h3>
                  <ul className="space-y-3">{activeMeeting.summaryData?.decisions?.map((d, i) => (<li key={i} className="flex items-start gap-3 text-sm font-medium text-gray-900"><span className="mt-1 w-4 h-4 text-black flex items-center justify-center border border-black rounded text-[10px]">✓</span>{d}</li>))}</ul>
                </section>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4"><ChevronRight size={14} /> Action Items</h3>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <ul className="space-y-4">{activeMeeting.summaryData?.actionItems?.map((item, i) => (<li key={i} className="flex items-start gap-3 text-sm text-gray-700"><input type="checkbox" className="mt-0.5 rounded border-gray-300" />{item}</li>))}</ul>
                  </div>
                </section>
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500 mb-4"><AlertCircle size={14} /> Open Issues</h3>
                  <ul className="space-y-3">{activeMeeting.summaryData?.openIssues?.map((issue, i) => (<li key={i} className="flex items-start gap-3 text-sm text-gray-600"><span className="text-red-500 font-bold">?</span>{issue}</li>))}</ul>
                </section>
              </div>
              
              <section className="pt-12 border-t border-gray-100 mt-12 mb-20">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"><span className="group-open:rotate-90 transition-transform">▶</span> Full Transcript</summary>
                  <div className="mt-6 p-6 bg-gray-50 text-xs font-mono text-gray-500 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto border border-gray-100 rounded-lg">{activeMeeting.transcript}</div>
                </details>
              </section>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300"><p>Select a meeting to view details</p></div>
        )}
      </div>
    </div>
  );
}