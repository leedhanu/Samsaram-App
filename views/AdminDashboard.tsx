
import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { User, Host, ShortVideo, RechargeRequest, PayoutRequest, Report, AppNotification } from '../types';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy, limit, increment, setDoc, where, getDoc, getDocs } from '@firebase/firestore';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { uploadFile } from '../services/uploadService';
import AgoraRTC, { IAgoraRTCClient } from 'agora-rtc-sdk-ng';

const AGORA_APP_ID = '794cb7e2119641af8a2b7f7dc2aa8bc3';

// --- Wallet Balance Editor Component ---
const WalletEditor = ({ userId, currentBalance, collectionName }: { userId: string, currentBalance: number, collectionName: 'users' | 'hosts' }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const updateBalance = async (isAdd: boolean) => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert("സാധുവായ ഒരു തുക നൽകുക");
    setLoading(true);
    try {
      const finalAmount = isAdd ? val : -val;
      await updateDoc(doc(db, collectionName, userId), { wallet: increment(finalAmount) });
      setAmount('');
      alert("Balance Updated!");
    } catch (e) { 
      alert("Update failed"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="mt-3 bg-black/40 p-4 rounded-2xl border border-zinc-800">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Current Wallet</span>
        <span className="text-sm font-black text-[#97fa55]">₹{currentBalance.toFixed(2)}</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">₹</span>
          <input 
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            placeholder="Amount" 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-7 pr-3 text-xs text-white outline-none focus:border-[#d64e02]" 
          />
        </div>
        <button onClick={() => updateBalance(true)} disabled={loading} className="bg-green-600 text-white w-10 h-10 rounded-xl text-lg font-black shadow-lg active:scale-95 transition-all">+</button>
        <button onClick={() => updateBalance(false)} disabled={loading} className="bg-red-600 text-white w-10 h-10 rounded-xl text-lg font-black shadow-lg active:scale-95 transition-all">-</button>
      </div>
    </div>
  );
};

// --- Recharge Requests Section ---
const AdminRechargeSection = () => {
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  
  useEffect(() => {
    const q = query(collection(db, 'rechargeRequests'), limit(100));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as RechargeRequest));
      const filtered = all.filter(r => r.status === 'pending');
      filtered.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setRequests(filtered);
    });
  }, []);

  const handleAction = async (req: RechargeRequest, status: 'approved' | 'rejected') => {
    try {
      if (status === 'approved') {
        await updateDoc(doc(db, 'users', req.userId), { wallet: increment(req.amount) });
        await addDoc(collection(db, 'notifications'), {
          recipientId: req.userId,
          title: 'Recharge Successful',
          message: `Your recharge of ₹${req.amount} was successful and your wallet has been updated.`,
          type: 'success',
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
      await updateDoc(doc(db, 'rechargeRequests', req.id), { status });
      alert(`Request ${status}!`);
    } catch (e) { alert("Action failed"); }
  };

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="py-20 text-center text-zinc-700 border border-dashed border-zinc-800 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest opacity-40">
          No Pending Recharges
        </div>
      ) : requests.map(req => (
        <div key={req.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] animate-in fade-in">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-white font-black text-sm">{req.userName}</h3>
              <p className="text-[#d64e02] font-black text-xl tracking-tighter">₹{req.amount}</p>
              <p className="text-zinc-500 text-[9px] font-bold uppercase mt-1 tracking-widest">{req.userMobile}</p>
            </div>
            <button 
              onClick={() => setSelectedImg(req.screenshotUrl)} 
              className="w-16 h-16 rounded-2xl overflow-hidden border border-zinc-800 bg-black active:scale-95 transition-transform"
            >
              <img src={req.screenshotUrl} className="w-full h-full object-cover" alt="Receipt" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleAction(req, 'approved')} className="bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-900/10">Approve</button>
            <button onClick={() => handleAction(req, 'rejected')} className="bg-zinc-800 text-red-500 border border-red-500/10 hover:bg-zinc-700 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">Reject</button>
          </div>
        </div>
      ))}

      {selectedImg && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in" onClick={() => setSelectedImg(null)}>
           <div className="absolute top-10 right-10">
             <button className="p-4 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
           <div className="relative max-w-full max-h-[80vh] group">
             <img src={selectedImg} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/5" onClick={e => e.stopPropagation()} />
           </div>
           <p className="mt-8 text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Tap anywhere to close</p>
        </div>
      )}
    </div>
  );
};

// --- Payout Requests Section ---
const AdminPayoutSection = () => {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  
  useEffect(() => {
    const q = query(collection(db, 'payoutRequests'), limit(100));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest));
      const filtered = all.filter(r => r.status === 'pending');
      filtered.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setRequests(filtered);
    });
  }, []);

  const handlePayoutAction = async (req: PayoutRequest, status: 'credited' | 'rejected') => {
    try {
      if (status === 'credited') {
        const hostDoc = await getDoc(doc(db, 'hosts', req.hostId));
        if (!hostDoc.exists() || (hostDoc.data().wallet || 0) < req.amount) {
          return alert("Insufficient host balance!");
        }
        await updateDoc(doc(db, 'hosts', req.hostId), { wallet: increment(-req.amount) });
        
        // Send success notification to host
        await addDoc(collection(db, 'notifications'), {
          recipientId: req.hostId,
          title: 'Payout Successful',
          message: `Your payout of ₹${req.amount} has been credited to your account.`,
          type: 'success',
          isRead: false,
          createdAt: serverTimestamp()
        });
      } else {
        // Send rejection notification to host
        await addDoc(collection(db, 'notifications'), {
          recipientId: req.hostId,
          title: 'Payout Rejected',
          message: `Your payout request for ₹${req.amount} was rejected. Please contact support.`,
          type: 'warning',
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
      
      await updateDoc(doc(db, 'payoutRequests', req.id), { status });
      alert(`Payout request ${status === 'credited' ? 'Approved' : 'Rejected'}!`);
    } catch (e) { 
      alert("Action failed: " + (e as Error).message); 
    }
  };

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="py-20 text-center text-zinc-700 border border-dashed border-zinc-800 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest opacity-40">
          No Payout Requests
        </div>
      ) : requests.map(req => (
        <div key={req.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-white font-black text-sm tracking-tight">{req.hostName}</h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{req.hostMobile}</p>
            </div>
            <p className="text-[#97fa55] font-black text-2xl tracking-tighter">₹{req.amount}</p>
          </div>
          <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800 mb-5">
             <p className="text-[8px] text-zinc-600 uppercase font-black mb-1.5 tracking-[0.2em]">UPI ID / Payment Info</p>
             <p className="text-white font-mono text-sm break-all tracking-tight">{req.upiId}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handlePayoutAction(req, 'credited')} className="bg-[#d64e02] hover:bg-[#b04001] py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              Approve
            </button>
            <button onClick={() => handlePayoutAction(req, 'rejected')} className="bg-zinc-800 text-red-500 border border-red-500/10 hover:bg-zinc-700 py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-widest">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Report Reply Section ---
const AdminReportSection = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snap) => setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report))));
  }, []);

  const handleReply = async (report: Report) => {
    const text = replyText[report.id];
    if (!text || text.trim().length === 0) return alert("മറുപടി ടൈപ്പ് ചെയ്യുക");
    try {
      await updateDoc(doc(db, 'reports', report.id), { reply: text });
      await addDoc(collection(db, 'notifications'), {
        recipientId: report.userId,
        title: 'Report Update',
        message: `Your report has a reply: ${text}`,
        type: 'info',
        isRead: false,
        createdAt: serverTimestamp()
      });
      alert("Reply sent successfully!");
    } catch (e) { alert("Failed to send reply"); }
  };

  return (
    <div className="space-y-6">
      {reports.length === 0 ? (
        <div className="py-20 text-center text-zinc-700 border border-dashed border-zinc-800 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest opacity-40">
          No Reports Received
        </div>
      ) : reports.map(rep => (
        <div key={rep.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] animate-in slide-in-from-bottom-4 transition-all">
           <div className="flex justify-between items-start mb-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="bg-[#d64e02]/10 text-[#d64e02] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-[#d64e02]/20">
                    {rep.category}
                  </span>
                  <span className="text-zinc-600 text-[8px] font-bold uppercase">
                    {rep.createdAt?.toDate?.().toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-white font-black text-sm tracking-tight truncate">{rep.userName}</h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{rep.userMobile}</p>
              </div>
           </div>
           
           <div className="bg-zinc-950 border border-zinc-800/40 p-4 rounded-2xl mb-5">
             <p className="text-zinc-400 text-xs leading-relaxed italic">"{rep.description}"</p>
           </div>
           
           <div className="space-y-2.5">
              <label className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] ml-2">Your Response</label>
              <textarea 
                placeholder="Type reply to user..." 
                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-[#d64e02] h-24 transition-colors"
                value={replyText[rep.id] || rep.reply || ''}
                onChange={e => setReplyText({...replyText, [rep.id]: e.target.value})}
              />
              <button 
                onClick={() => handleReply(rep)} 
                className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${rep.reply ? 'bg-zinc-800 text-zinc-400' : 'bg-[#d64e02] text-white hover:bg-[#b04001]'}`}
              >
                {rep.reply ? 'Update Reply' : 'Send Reply'}
              </button>
           </div>
        </div>
      ))}
    </div>
  );
};

// --- Push Notification Broadcast Section ---
const AdminNotificationSection = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [specificMobile, setSpecificMobile] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return alert("Title and Message are required");
    setLoading(true);
    try {
      let recipientId = 'all';
      if (targetType === 'specific') {
        const q = query(collection(db, 'users'), where('mobile', '==', specificMobile));
        const snap = await getDocs(q);
        if (snap.empty) {
           alert("User not found!");
           setLoading(false);
           return;
        }
        recipientId = snap.docs[0].id;
      }

      await addDoc(collection(db, 'notifications'), {
        recipientId, title, message, type: 'info', isRead: false, createdAt: serverTimestamp()
      });
      alert("Notification broadcasted successfully!");
      setTitle(''); setMessage(''); setSpecificMobile('');
    } catch (e) { alert("Failed to send"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSend} className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] space-y-5 animate-in zoom-in">
       <div>
         <h2 className="text-xl font-black mb-1 tracking-tight">Push Broadcast</h2>
         <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Send real-time alerts</p>
       </div>

       <div className="flex bg-black p-1 rounded-2xl border border-zinc-800">
         <button type="button" onClick={() => setTargetType('all')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${targetType === 'all' ? 'bg-[#d64e02] text-white shadow-lg' : 'text-zinc-600'}`}>All Users</button>
         <button type="button" onClick={() => setTargetType('specific')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${targetType === 'specific' ? 'bg-[#d64e02] text-white shadow-lg' : 'text-zinc-600'}`}>Specific Mobile</button>
       </div>

       {targetType === 'specific' && (
         <div className="space-y-1.5 animate-in slide-in-from-top-2">
           <label className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] ml-2">Mobile Number</label>
           <input 
             placeholder="Enter 10 digit number" 
             className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white outline-none focus:border-[#d64e02]" 
             value={specificMobile}
             onChange={e => setSpecificMobile(e.target.value)}
             required
           />
         </div>
       )}

       <div className="space-y-4">
         <div className="space-y-1.5">
           <label className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] ml-2">Notification Title</label>
           <input 
             placeholder="Headline..." 
             className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white outline-none focus:border-[#d64e02]" 
             value={title} 
             onChange={e => setTitle(e.target.value)} 
             required 
           />
         </div>
         <div className="space-y-1.5">
           <label className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] ml-2">Message Content</label>
           <textarea 
             placeholder="Details here..." 
             className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-sm text-white h-32 outline-none focus:border-[#d64e02] transition-colors" 
             value={message} 
             onChange={e => setMessage(e.target.value)} 
             required 
           />
         </div>
       </div>

       <button disabled={loading} className="w-full bg-[#d64e02] hover:bg-[#b04001] py-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-2xl shadow-[#d64e02]/10 active:scale-95 transition-all">
         {loading ? 'Processing...' : 'Send Now'}
       </button>
    </form>
  );
};

// --- Monitoring Section ---
const AdminMonitoringView = () => {
  const [calls, setCalls] = useState<any[]>([]);
  const [monitoredCall, setMonitoredCall] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'activeCalls'), (snap) => setCalls(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    let isMounted = true;
    let client: IAgoraRTCClient | null = null;

    if (monitoredCall && isStreaming) {
      const initAgora = async () => {
        try {
          client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
          agoraClientRef.current = client;

          client.on('user-published', async (user, mediaType) => {
            if (!isMounted) return;
            try {
              await client!.subscribe(user, mediaType);
              if (mediaType === 'video') {
                setRemoteUsers(prev => {
                  if (prev.find(u => u.uid === user.uid)) return prev;
                  return [...prev, user];
                });
              }
              if (mediaType === 'audio') user.audioTrack?.play();
            } catch (err) {}
          });

          client.on('user-left', (user) => {
            if (isMounted) setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
          });

          if (!isMounted) return;
          await client.join(AGORA_APP_ID, monitoredCall.id, null, 888888);
          
          if (!isMounted) {
            client.leave().catch(() => {});
          }
        } catch (e: any) { 
          if (e.code !== 'WS_ABORT' && e.message !== 'LEAVE') {
             console.error("Admin Monitor error", e); 
          }
        }
      };
      initAgora();
    }

    return () => {
      isMounted = false;
      if (client) {
        client.leave().catch(() => {});
        agoraClientRef.current = null;
      }
      setRemoteUsers([]);
    };
  }, [monitoredCall?.id, isStreaming]);

  useEffect(() => {
    remoteUsers.forEach(user => {
      const el = document.getElementById(`monitor-feed-${user.uid}`);
      if (el) {
        while (el.firstChild) { el.removeChild(el.firstChild); }
        user.videoTrack?.play(el);
      }
    });
  }, [remoteUsers]);

  const sendCommand = async (callId: string, cmd: 'terminate' | 'warning' | 'face_detect') => {
    try {
      await updateDoc(doc(db, 'activeCalls', callId), { adminCommand: cmd });
      if (cmd === 'terminate') { 
        if (monitoredCall?.id === callId) {
          setIsStreaming(false); 
          setMonitoredCall(null);
          setRemoteUsers([]);
        }
        alert("Call termination signal sent.");
      } else {
        alert("Command sent successfully!");
      }
    } catch (e) { alert("Failed to send command"); }
  };

  if (monitoredCall) {
    const isAudioOnly = monitoredCall.type === 'audio';
    return (
      <div className="space-y-6 animate-in fade-in max-w-lg mx-auto">
        <div className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-[1.8rem]">
           <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-[#d64e02] truncate tracking-tight">{monitoredCall.hostName}</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Host</p>
           </div>
           <div className="text-center px-1">
              <span className="text-zinc-700 font-black text-xs">↔</span>
           </div>
           <div className="min-w-0 flex-1 text-right">
              <h2 className="text-sm font-black text-[#55faf4] truncate tracking-tight">{monitoredCall.userName}</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">User</p>
           </div>
           <button onClick={() => { setIsStreaming(false); setMonitoredCall(null); }} className="p-2.5 bg-black border border-zinc-800 text-white rounded-xl ml-1 active:scale-90 transition shadow-lg">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {!isStreaming ? (
          <div className="aspect-video bg-zinc-950 rounded-[2.5rem] flex flex-col items-center justify-center border border-zinc-800 shadow-2xl">
            <button onClick={() => setIsStreaming(true)} className="px-12 py-5 bg-[#d64e02] text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all tracking-widest uppercase text-[10px]">Start Live Monitoring</button>
          </div>
        ) : (
          <div className="space-y-4">
            {isAudioOnly ? (
               <div className="aspect-video bg-zinc-900 rounded-[2.5rem] flex flex-col items-center justify-center border border-zinc-800 shadow-inner">
                  <div className="w-16 h-16 bg-[#d64e02]/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <svg className="w-8 h-8 text-[#d64e02]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </div>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Audio Session Active</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {remoteUsers.length === 0 && <div className="col-span-full py-24 text-center text-zinc-700 font-black text-[10px] animate-pulse uppercase tracking-[0.3em]">Connecting to feeds...</div>}
                {remoteUsers.map(u => (
                  <div key={u.uid} className="relative aspect-[3/4] bg-zinc-950 rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl">
                    <div id={`monitor-feed-${u.uid}`} className="w-full h-full"></div>
                    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5">
                        <span className="text-white text-[9px] font-black uppercase tracking-widest">{String(u.uid).length > 6 ? 'HOST' : 'USER'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => sendCommand(monitoredCall.id, 'warning')} className="py-4 bg-orange-500 hover:bg-orange-400 rounded-2xl text-black font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">Warning</button>
             <button onClick={() => sendCommand(monitoredCall.id, 'face_detect')} className="py-4 bg-blue-500 hover:bg-blue-400 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">Face Detect</button>
          </div>
          <button onClick={() => sendCommand(monitoredCall.id, 'terminate')} className="py-5 bg-red-600 hover:bg-red-500 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">Terminate Active Call</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between px-3 mb-2">
         <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Active Sessions</h2>
         <span className="bg-zinc-900 px-3 py-1 rounded-full text-[9px] font-black text-zinc-500 border border-zinc-800 tracking-tighter">{calls.length} Active</span>
      </div>
      {calls.length === 0 ? (
        <div className="py-24 text-center text-zinc-700 border border-dashed border-zinc-800 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest opacity-40">
          No Active Calls Currently
        </div>
      ) : calls.map(call => (
        <div key={call.id} className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-[2.5rem] flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-2">
          <div className="flex items-center min-w-0 flex-1">
            <img src={call.hostPhoto} className="w-14 h-14 rounded-2xl object-cover mr-4 border border-zinc-800 shadow-md" />
            <div className="min-w-0">
              <h3 className="font-black text-white text-sm tracking-tight truncate pr-2">{call.hostName} ↔ {call.userName}</h3>
              <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">{call.type} session</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            <button onClick={() => setMonitoredCall(call)} className="px-5 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all active:scale-95">Monitor</button>
            <button onClick={() => sendCommand(call.id, 'terminate')} className="px-5 py-3.5 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all active:scale-95">End</button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Main Dashboard Component ---
const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('monitoring');
  const menuItems = [
    { id: 'monitoring', label: 'Monitor', icon: '📹' },
    { id: 'recharge', label: 'Recharges', icon: '💰' },
    { id: 'payout', label: 'Payouts', icon: '💸' },
    { id: 'hosts', label: 'Hosts', icon: '👩‍🎤' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'shorts', label: 'Shorts', icon: '🎬' },
    { id: 'reports', label: 'Reports', icon: '🚩' },
    { id: 'notifs', label: 'Broadcast', icon: '🔔' },
    { id: 'logout', label: 'Logout', icon: '🚪' }
  ];

  const handleAction = (id: string) => {
    if (id === 'logout') auth.signOut();
    else setActiveTab(id);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Header user={user} />
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-8 px-2 tracking-tighter">Control Center</h1>
        
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-3 pb-8 scrollbar-hide px-2">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => handleAction(item.id)} 
              className={`px-8 py-5 rounded-[1.8rem] whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all duration-300 ${activeTab === item.id ? 'bg-[#d64e02] border-[#d64e02] text-white shadow-2xl scale-105' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="animate-in slide-in-from-bottom-8 duration-700 pb-12">
           {activeTab === 'monitoring' && <AdminMonitoringView />}
           {activeTab === 'recharge' && <AdminRechargeSection />}
           {activeTab === 'payout' && <AdminPayoutSection />}
           {activeTab === 'shorts' && <AdminShortsSection />}
           {activeTab === 'hosts' && <AdminHostsSection />}
           {activeTab === 'users' && <AdminUsersView />}
           {activeTab === 'reports' && <AdminReportSection />}
           {activeTab === 'notifs' && <AdminNotificationSection />}
        </div>
      </div>
    </div>
  );
};

const AdminShortsSection = () => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vFile, setVFile] = useState<File | null>(null);
  const [tFile, setTFile] = useState<File | null>(null);
  const [category, setCategory] = useState<'Malayalam' | 'Hindi' | 'English' | 'Others'>('Malayalam');

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snap) => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShortVideo))));
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vFile || !tFile) return alert("ഫയലുകൾ തിരഞ്ഞെടുക്കുക (Select files)");
    setLoading(true);
    try {
      const vUrl = await uploadFile(vFile, 'videos');
      const tUrl = await uploadFile(tFile, 'videos');
      await addDoc(collection(db, 'videos'), { videoUrl: vUrl, thumbnailUrl: tUrl, category, createdAt: serverTimestamp() });
      alert("Short video added!");
      setShowAdd(false);
    } catch(e) { 
      alert("Upload failed"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => setShowAdd(!showAdd)} className="w-full py-5 bg-green-500 text-black font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
        {showAdd ? '✕ Close Upload' : '+ Upload New Short'}
      </button>
      {showAdd && (
        <form onSubmit={handleUpload} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] space-y-5 animate-in zoom-in duration-300">
           <div className="space-y-1.5">
             <label className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] ml-2">Category</label>
             <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-[#d64e02]">
               <option value="Malayalam">Malayalam</option>
               <option value="Hindi">Hindi</option>
               <option value="English">English</option>
               <option value="Others">Others</option>
             </select>
           </div>
           <div className="space-y-1.5">
             <label className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] ml-2">Video File</label>
             <input type="file" accept="video/*" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-xs text-zinc-500" onChange={e => setVFile(e.target.files?.[0] || null)} required />
           </div>
           <div className="space-y-1.5">
             <label className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] ml-2">Thumbnail Image</label>
             <input type="file" accept="image/*" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-xs text-zinc-500" onChange={e => setTFile(e.target.files?.[0] || null)} required />
           </div>
           <button disabled={loading} className="w-full py-5 bg-[#d64e02] text-white font-black rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-all">{loading ? 'Publishing...' : 'Publish'}</button>
        </form>
      )}
      <div className="grid grid-cols-2 gap-4">
        {videos.map(v => (
          <div key={v.id} className="relative aspect-[9/16] bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-800 group shadow-lg">
            <img src={v.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all" />
            <button onClick={() => deleteDoc(doc(db, 'videos', v.id))} className="absolute top-4 right-4 p-3 bg-red-600 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="absolute bottom-4 left-4 right-4">
              <span className="bg-black/40 backdrop-blur-md text-white text-[8px] px-3 py-1 rounded-full uppercase font-black tracking-widest">{v.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminHostsSection = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', mobile: '', password: '', place: '', age: '', callType: 'both' });
  const [pImg, setPImg] = useState<File | null>(null);
  const [aFile, setAFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'hosts'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snap) => setHosts(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Host))));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pImg || !aFile) return alert("ഫയലുകൾ തിരഞ്ഞെടുക്കുക");
    setLoading(true);
    try {
      const pUrl = await uploadFile(pImg, 'hostprofile');
      const aUrl = await uploadFile(aFile, 'hostprofile');
      const email = `${formData.mobile}@kinnaram.com`;
      // Use Firebase modular createUserWithEmailAndPassword for host creation
      const cred = await createUserWithEmailAndPassword(auth, email, formData.password);
      await setDoc(doc(db, 'hosts', cred.user.uid), {
        uid: cred.user.uid, fullName: formData.fullName, mobile: formData.mobile, place: formData.place, age: parseInt(formData.age),
        profilePhoto: pUrl, selfAudio: aUrl, callType: formData.callType, wallet: 0, role: 'host', isOnline: false, isBanned: false, createdAt: serverTimestamp()
      });
      alert("Host registered successfully!");
      setShowAdd(false);
    } catch(e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => setShowAdd(!showAdd)} className="w-full py-5 bg-[#55faf4] text-black font-black rounded-2xl shadow-xl active:scale-95 transition uppercase text-[10px] tracking-widest">
        {showAdd ? '✕ Close Registration' : '+ Register New Host'}
      </button>
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] space-y-4 animate-in zoom-in duration-300">
           <input placeholder="Host Full Name" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white outline-none focus:border-[#d64e02]" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
           <input placeholder="Mobile Number" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white outline-none focus:border-[#d64e02]" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} required />
           <input placeholder="Portal Password" type="password" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white outline-none focus:border-[#d64e02]" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
           <div className="grid grid-cols-2 gap-3">
             <input placeholder="Place" className="bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white outline-none focus:border-[#d64e02]" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} required />
             <input placeholder="Age" type="number" className="bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white outline-none focus:border-[#d64e02]" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required />
           </div>
           <div className="space-y-1.5">
             <label className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] ml-2">Profile Photo</label>
             <input type="file" accept="image/*" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-xs text-zinc-500" onChange={e => setPImg(e.target.files?.[0] || null)} required />
           </div>
           <div className="space-y-1.5">
             <label className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] ml-2">Intro Audio (Self)</label>
             <input type="file" accept="audio/*" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-xs text-zinc-500" onChange={e => setAFile(e.target.files?.[0] || null)} required />
           </div>
           <button disabled={loading} className="w-full py-5 bg-[#d64e02] text-white font-black rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-all">{loading ? 'Processing...' : 'Complete Registration'}</button>
        </form>
      )}
      {hosts.map(h => (
        <div key={h.uid} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] flex flex-col shadow-lg animate-in slide-in-from-bottom-2 duration-500">
           <div className="flex items-center">
             <img src={h.profilePhoto} className="w-16 h-16 rounded-2xl object-cover border-2 border-zinc-800 shadow-md" />
             <div className="flex-1 ml-4 min-w-0">
               <h3 className="font-black text-white text-sm tracking-tight truncate">{h.fullName}</h3>
               <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{h.mobile}</p>
             </div>
             <button onClick={() => updateDoc(doc(db, 'hosts', h.uid), { isBanned: !h.isBanned })} className={`px-5 py-2.5 rounded-xl text-[9px] font-black tracking-[0.1em] shadow-lg transition-all active:scale-90 ${h.isBanned ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}>{h.isBanned ? 'BANNED' : 'BAN'}</button>
           </div>
           <WalletEditor userId={h.uid} currentBalance={h.wallet} collectionName="hosts" />
        </div>
      ))}
    </div>
  );
};

const AdminUsersView = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), limit(500));

    return onSnapshot(q, (snap) => {
      let fetched = snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
      fetched = fetched.filter(u => u.role === 'user');
      if (search.trim()) {
        const term = search.toLowerCase();
        fetched = fetched.filter(u => 
          (u.fullName || '').toLowerCase().includes(term) || 
          (u.mobile || '').includes(term)
        );
      }
      fetched.sort((a, b) => {
        const valA = a.createdAt?.toDate?.()?.getTime() || (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0);
        const valB = b.createdAt?.toDate?.()?.getTime() || (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0);
        return valB - valA;
      });
      setUsers(fetched.slice(0, 15));
      setIsSearching(search.trim() !== '');
    });
  }, [search]);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="relative group px-1">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-zinc-600 group-focus-within:text-[#d64e02] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by Name or Mobile..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-5 pl-12 pr-6 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#d64e02] transition-all shadow-xl"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-3">
          <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
            {isSearching ? 'Search Results' : 'Recent Registrations'}
          </h2>
          <span className="bg-zinc-900 px-3 py-1 rounded-full text-[9px] font-black text-zinc-500 border border-zinc-800 tracking-tighter">
            Viewing {users.length}
          </span>
        </div>

        {users.length === 0 ? (
          <div className="py-20 text-center text-zinc-800 border-2 border-dashed border-zinc-900 rounded-[2.5rem]">
            <p className="font-black text-[10px] uppercase tracking-widest opacity-30">No users found</p>
          </div>
        ) : (
          users.map(u => (
            <div key={u.uid} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] flex flex-col shadow-lg hover:border-zinc-700 transition duration-300 animate-in fade-in">
              <div className="flex justify-between items-center">
                <div className="min-w-0 flex-1 pr-4">
                  <h3 className="font-black text-white text-sm tracking-tight truncate leading-tight">{u.fullName}</h3>
                  <div className="flex items-center mt-1.5">
                    <svg className="w-3 h-3 text-zinc-700 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate">{u.mobile}</p>
                  </div>
                </div>
                <button 
                  onClick={() => updateDoc(doc(db, 'users', u.uid), { isBanned: !u.isBanned })} 
                  className={`px-5 py-2.5 rounded-xl text-[9px] font-black tracking-[0.1em] shadow-lg transition-all active:scale-90 ${u.isBanned ? 'bg-red-600 text-white shadow-red-900/10' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                >
                  {u.isBanned ? 'BANNED' : 'BAN'}
                </button>
              </div>
              <WalletEditor userId={u.uid} currentBalance={u.wallet} collectionName="users" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
