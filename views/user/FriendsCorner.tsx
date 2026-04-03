
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Host } from '../../types';

interface FriendsCornerProps {
  onCall: (host: Host, type: 'audio' | 'video') => void;
}

const FriendsCorner: React.FC<FriendsCornerProps> = ({ onCall }) => {
  const [onlineHosts, setOnlineHosts] = useState<Host[]>([]);
  const [busyHostIds, setBusyHostIds] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  useEffect(() => {
    // Listen for online hosts
    const q = query(collection(db, 'hosts'), where('isOnline', '==', true));
    const unsubscribeHosts = onSnapshot(q, (snapshot) => {
      const hosts = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Host));
      setOnlineHosts(hosts);
    });

    // Listen for active calls to determine who is busy
    const qCalls = collection(db, 'activeCalls');
    const unsubscribeCalls = onSnapshot(qCalls, (snapshot) => {
      const busyIds = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.hostId) busyIds.add(data.hostId);
      });
      setBusyHostIds(busyIds);
    });

    return () => {
      unsubscribeHosts();
      unsubscribeCalls();
    };
  }, []);

  const toggleSelfAudio = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(audioUrl);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => setPlayingAudio(null);
    }
  };

  return (
    <section className="animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Friends Corner</h2>
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">Premium Connections</p>
        </div>
        <div className="flex items-center bg-zinc-900/50 border border-zinc-800 px-3 py-1 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <span className="text-zinc-400 text-[9px] font-black uppercase tracking-tighter">
            {onlineHosts.length} Online
          </span>
        </div>
      </div>

      <div className="flex flex-col space-y-2.5">
        {onlineHosts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-700 border border-dashed border-zinc-800 rounded-[2rem] bg-zinc-900/10">
            <svg className="w-10 h-10 mb-2 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <p className="font-black text-[9px] uppercase tracking-widest">Searching for hosts...</p>
          </div>
        ) : (
          onlineHosts.map(host => {
            const isBusy = busyHostIds.has(host.uid);
            return (
              <div key={host.uid} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden flex items-center p-2.5 group hover:border-[#d64e02]/40 transition-all duration-300">
                {/* Profile Photo - Compact size */}
                <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-xl shadow-lg border border-zinc-800">
                  <img 
                    src={host.profilePhoto || 'https://picsum.photos/300/400'} 
                    alt={host.fullName}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isBusy ? 'grayscale opacity-50' : ''}`}
                  />
                  {host.selfAudio && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSelfAudio(host.selfAudio); }}
                      className={`absolute bottom-1 right-1 p-1 rounded-lg border backdrop-blur-md shadow-lg transition-all active:scale-90 ${playingAudio === host.selfAudio ? 'bg-[#97fa55] text-black border-[#97fa55]' : 'bg-black/50 text-white border-white/10'}`}
                    >
                      {playingAudio === host.selfAudio ? (
                        <div className="flex space-x-0.5 items-end h-2">
                          <div className="w-0.5 bg-black h-1 animate-bounce"></div>
                          <div className="w-0.5 bg-black h-2 animate-bounce [animation-delay:-0.2s]"></div>
                          <div className="w-0.5 bg-black h-1.5 animate-bounce [animation-delay:-0.4s]"></div>
                        </div>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      )}
                    </button>
                  )}
                  <div className={`absolute top-1 left-1 w-2 h-2 rounded-full border border-black shadow-lg ${isBusy ? 'bg-orange-500' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]'}`}></div>
                </div>

                {/* Information & Actions */}
                <div className="ml-3.5 flex-1 py-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-white font-black text-sm truncate leading-tight">{host.fullName.split(' ')[0]}, {host.age}</h3>
                      <div className="flex items-center mt-0.5 opacity-60">
                        <svg className="w-2.5 h-2.5 text-zinc-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <p className="text-zinc-400 text-[10px] font-bold truncate">{host.place}</p>
                      </div>
                      <div className="mt-2.5">
                         {isBusy ? (
                           <span className="text-[7px] px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full font-black uppercase tracking-[0.05em]">In another call</span>
                         ) : (
                           <span className="text-[7px] px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full font-black uppercase tracking-[0.05em]">Ready to talk</span>
                         )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 shrink-0">
                      {(host.callType === 'audio' || host.callType === 'both') && (
                        <button 
                          onClick={() => !isBusy && onCall(host, 'audio')}
                          className={`p-3.5 rounded-2xl transition-all shadow-md ${isBusy ? 'bg-zinc-900 text-zinc-700 opacity-50 cursor-not-allowed' : 'bg-zinc-800 hover:bg-[#97fa55] text-zinc-500 hover:text-black active:scale-90'}`}
                          aria-label="Audio Call"
                          disabled={isBusy}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </button>
                      )}
                      {(host.callType === 'video' || host.callType === 'both') && (
                        <button 
                          onClick={() => !isBusy && onCall(host, 'video')}
                          className={`p-3.5 rounded-2xl shadow-lg transition-all ${isBusy ? 'bg-zinc-900 text-zinc-700 opacity-50 cursor-not-allowed' : 'bg-[#d64e02] text-white shadow-[#d64e02]/10 active:scale-90'}`}
                          aria-label="Video Call"
                          disabled={isBusy}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default FriendsCorner;
