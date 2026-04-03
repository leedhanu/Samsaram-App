
import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CallOverlay from './user/CallOverlay';
import { User, Host, PayoutRequest } from '../types';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, where, deleteDoc } from 'firebase/firestore';
import VideoSection from './user/VideoSection';
import { uploadFile } from '../services/uploadService';

const HostDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hostData, setHostData] = useState<Host | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsubHost = onSnapshot(doc(db, 'hosts', user.uid), (snap) => {
      if (snap.exists()) setHostData({ uid: snap.id, ...snap.data() } as Host);
    });

    // Initialize ringtone
    if (!ringtoneRef.current) {
      ringtoneRef.current = new Audio('https://kinnaram.online/hring.mp3');
      ringtoneRef.current.loop = true;
    }

    const q = query(collection(db, 'activeCalls'), where('hostId', '==', user.uid), where('status', '==', 'ringing'));
    const unsubCalls = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const callData = snap.docs[0].data();
        setIncomingCall(callData);
        
        if (ringtoneRef.current && audioUnlocked) {
          ringtoneRef.current.currentTime = 0;
          ringtoneRef.current.play().catch(e => console.log("Ringtone blocked by browser autoplay policy."));
        }
      } else {
        setIncomingCall(null);
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
        }
      }
    });

    const unlockAudio = () => {
      if (ringtoneRef.current && !audioUnlocked) {
        ringtoneRef.current.play().then(() => {
          ringtoneRef.current?.pause();
          setAudioUnlocked(true);
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
        }).catch(() => {});
      }
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      unsubHost();
      unsubCalls();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      if (ringtoneRef.current) ringtoneRef.current.pause();
    };
  }, [user.uid, audioUnlocked]);

  const toggleOnline = async () => {
    if (!hostData) return;
    await updateDoc(doc(db, 'hosts', user.uid), { isOnline: !hostData.isOnline });
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    const callData = { ...incomingCall };
    await updateDoc(doc(db, 'activeCalls', incomingCall.id), { status: 'connected', startedAt: serverTimestamp() });
    setIncomingCall(null);
    if (ringtoneRef.current) ringtoneRef.current.pause();
    setActiveCall(callData);
  };

  const declineCall = async () => {
    if (!incomingCall) return;
    await deleteDoc(doc(db, 'activeCalls', incomingCall.id));
    setIncomingCall(null);
    if (ringtoneRef.current) ringtoneRef.current.pause();
  };

  const footerItems = [
    { 
      id: 'dashboard', 
      label: 'Home', 
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> 
    },
    { 
      id: 'payout', 
      label: 'Wallet', 
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> 
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> 
    },
    { 
      id: 'logout', 
      label: 'Logout', 
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> 
    }
  ];

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      {hostData && <Header user={hostData} />}
      
      <main className="p-4 space-y-6 max-w-lg mx-auto">
        {activeTab === 'dashboard' && hostData && (
          <div className="space-y-6 animate-in fade-in">
            <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black tracking-tight">Status</h2>
                  <button 
                    onClick={toggleOnline}
                    className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${hostData.isOnline ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500 text-black shadow-lg shadow-green-500/20'}`}
                  >
                    {hostData.isOnline ? 'Go Offline' : 'Go Online'}
                  </button>
               </div>
               <div className="grid grid-cols-3 gap-3">
                 {(['audio', 'video', 'both'] as const).map(t => (
                   <button
                    key={t}
                    onClick={() => updateDoc(doc(db, 'hosts', user.uid), { callType: t })}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${hostData.callType === t ? 'bg-[#d64e02] border-[#d64e02] text-white shadow-xl' : 'bg-black border-zinc-800 text-zinc-600'}`}
                   >
                     {t}
                   </button>
                 ))}
               </div>
            </section>
            <VideoSection />
          </div>
        )}
        {activeTab === 'payout' && hostData && <PayoutView host={hostData} />}
        {activeTab === 'profile' && hostData && <ProfileEditView host={hostData} />}
      </main>

      {/* Incoming Call Screen Overlay */}
      {incomingCall && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="radar-ring w-64 h-64"></div>
              <div className="radar-ring radar-ring-2 w-64 h-64"></div>
           </div>

           <div className="relative mb-12">
              <div className="absolute inset-0 bg-[#d64e02] rounded-full blur-[60px] opacity-20 scale-150 animate-pulse"></div>
              <div className="w-40 h-40 rounded-full border-4 border-[#d64e02] p-2 relative z-10 overflow-hidden shadow-2xl bg-zinc-900 flex items-center justify-center aspect-square">
                 <img src="https://kinnaram.online/uploads/hlogo.png" className="w-full h-full object-contain p-4 opacity-40 animate-pulse" alt="Logo" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#d64e02] text-white px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest z-20 shadow-xl">Incoming</div>
           </div>

           <div className="text-center z-10 mb-20 space-y-4">
              <h2 className="text-5xl font-black text-white tracking-tighter leading-none">{incomingCall.userName}</h2>
              <p className="text-[#55faf4] font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Calling for {incomingCall.type}...</p>
           </div>
           
           <div className="flex items-center space-x-14 z-20">
              <button onClick={declineCall} className="w-24 h-24 bg-zinc-900 border-2 border-red-600/30 text-red-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all duration-300">
                 <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button onClick={answerCall} className="w-28 h-28 bg-green-500 text-black rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)] active:scale-90 transition-all duration-300">
                 <svg className="w-12 h-12 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </button>
           </div>
        </div>
      )}

      {activeCall && hostData && (
        <CallOverlay
          user={{ uid: activeCall.userId, fullName: activeCall.userName } as User}
          host={hostData}
          type={activeCall.type}
          onEnd={() => setActiveCall(null)}
          isHostSide={true}
        />
      )}

      <Footer activeId={activeTab} items={footerItems} onSelect={(id) => id === 'logout' ? auth.signOut() : setActiveTab(id)} />
    </div>
  );
};

const PayoutView: React.FC<{ host: Host }> = ({ host }) => {
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<PayoutRequest[]>([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'payoutRequests'), where('hostId', '==', host.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest));
      const sorted = docs.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }).slice(0, 6); // Only show last 6 transactions
      setHistory(sorted);
    });
    return () => unsub();
  }, [host.uid]);

  const handleRequest = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > host.wallet) {
      alert("Invalid amount");
      return;
    }
    if (!upi) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'payoutRequests'), {
        hostId: host.uid, hostName: host.fullName, hostMobile: host.mobile, amount: val, upiId: upi, status: 'pending', createdAt: serverTimestamp()
      });
      setSuccess(true);
      setAmount('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (e) { alert("Request failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right">
       <div className="bg-gradient-to-br from-[#d64e02] to-orange-800 p-10 rounded-[2.5rem] text-center shadow-2xl">
          <p className="text-white/60 text-[10px] mb-2 uppercase tracking-[0.3em] font-black">Host Balance</p>
          <h2 className="text-6xl font-black text-white tracking-tighter">₹{host.wallet.toFixed(2)}</h2>
       </div>
       <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl">
          <h3 className="text-lg font-black text-white mb-6 tracking-tight">Withdraw Earnings</h3>
          <div className="space-y-4">
             <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (INR)" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-[#d64e02] transition-colors" />
             <input type="text" value={upi} onChange={e => setUpi(e.target.value)} placeholder="UPI ID" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-[#d64e02] transition-colors" />
             <button disabled={loading} onClick={handleRequest} className="w-full bg-[#d64e02] py-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
               {loading ? 'Processing...' : 'Request Payout'}
             </button>
             {success && <p className="text-green-500 text-[10px] text-center font-black uppercase tracking-widest mt-4">തുക 2 മണിക്കൂറിനുള്ളിൽ അക്കൗണ്ടിൽ എത്തും</p>}
          </div>
       </div>

       {/* Transaction History Section */}
       <div className="space-y-4">
         <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] ml-4">Transaction History</h3>
         <div className="space-y-3">
           {history.length === 0 ? (
             <div className="bg-zinc-900/30 border border-zinc-800 border-dashed p-10 rounded-[2rem] text-center">
                <p className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">No transactions yet</p>
             </div>
           ) : (
             history.map(item => (
               <div key={item.id} className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-[1.8rem] flex items-center justify-between shadow-md">
                 <div className="min-w-0 flex-1">
                   <p className="text-white font-black text-sm tracking-tight">₹{item.amount.toFixed(2)}</p>
                   <p className="text-zinc-500 text-[9px] font-bold truncate tracking-tight">{item.upiId}</p>
                 </div>
                 <div className="text-right ml-4">
                   <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${item.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                     {item.status === 'pending' ? 'Pending' : 'Credited'}
                   </span>
                   <p className="text-zinc-700 text-[8px] font-bold mt-1.5">
                     {item.createdAt?.toDate?.() ? item.createdAt.toDate().toLocaleDateString() : 'Recent'}
                   </p>
                 </div>
               </div>
             ))
           )}
         </div>
       </div>
    </div>
  );
};

const ProfileEditView: React.FC<{ host: Host }> = ({ host }) => {
  const [place, setPlace] = useState(host.place);
  const [age, setAge] = useState(host.age);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'hosts', host.uid), { place, age: Number(age) });
      alert("Profile updated!");
    } catch (e) { alert("Failed to update"); }
    finally { setLoading(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadFile(file, 'hostprofile');
      await updateDoc(doc(db, 'hosts', host.uid), { [type === 'photo' ? 'profilePhoto' : 'selfAudio']: url });
      alert("Updated successfully!");
    } catch (e) { alert("Upload failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl space-y-8 animate-in zoom-in">
       <h2 className="text-2xl font-black text-white tracking-tighter">Identity</h2>
       <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" value={place} onChange={e => setPlace(e.target.value)} placeholder="Place" className="bg-black border border-zinc-800 p-4 rounded-2xl text-white outline-none" />
            <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} placeholder="Age" className="bg-black border border-zinc-800 p-4 rounded-2xl text-white outline-none" />
          </div>
          <div className="space-y-4">
             <div className="p-5 bg-black border border-zinc-800 rounded-3xl flex items-center justify-between">
                <span className="text-white font-black text-xs uppercase">Profile Picture</span>
                <input type="file" accept="image/*" onChange={e => handleFile(e, 'photo')} className="hidden" id="p-p" />
                <label htmlFor="p-p" className="px-5 py-2 bg-zinc-800 rounded-xl text-[9px] font-black uppercase cursor-pointer">Change</label>
             </div>
             <div className="p-5 bg-black border border-zinc-800 rounded-3xl flex items-center justify-between">
                <span className="text-white font-black text-xs uppercase">Self Audio</span>
                <input type="file" accept="audio/*" onChange={e => handleFile(e, 'audio')} className="hidden" id="p-a" />
                <label htmlFor="p-a" className="px-5 py-2 bg-zinc-800 rounded-xl text-[9px] font-black uppercase cursor-pointer">Change</label>
             </div>
          </div>
          <button onClick={handleUpdate} disabled={loading} className="w-full bg-green-500 py-5 rounded-2xl text-black font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
       </div>
    </div>
  );
};

export default HostDashboard;
