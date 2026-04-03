
import React, { useState, useEffect, useRef } from 'react';
import { User, Host } from '../../types';
import { doc, updateDoc, increment, setDoc, deleteDoc, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng';

const AGORA_APP_ID = '794cb7e2119641af8a2b7f7dc2aa8bc3';

interface CallOverlayProps {
  user: User;
  host: Host;
  type: 'audio' | 'video';
  onEnd: () => void;
  isHostSide?: boolean;
}

const CallOverlay: React.FC<CallOverlayProps> = ({ user, host, type, onEnd, isHostSide = false }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'terminated'>('connecting');
  const [timer, setTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [showFaceDetect, setShowFaceDetect] = useState(false);
  const [warningText, setWarningText] = useState<string | null>(null);

  const agoraClient = useRef<IAgoraRTCClient | null>(null);
  const localTracks = useRef<{ audio?: ILocalAudioTrack; video?: ILocalVideoTrack }>({});
  const ringtone = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);
  const callDocId = `${user.uid}_${host.uid}`;

  useEffect(() => {
    let isMounted = true;

    const setupSignalingAndRingtone = async () => {
      if (!isHostSide) {
        await setDoc(doc(db, 'activeCalls', callDocId), {
          id: callDocId, userId: user.uid, userName: user.fullName, hostId: host.uid, hostName: host.fullName, hostPhoto: host.profilePhoto, type: type, status: 'ringing', adminCommand: null, createdAt: serverTimestamp()
        });
        
        const audio = new Audio('https://kinnaram.online/uring.mp3');
        audio.loop = true;
        ringtone.current = audio;
        audio.play().catch(() => {});
      }
    };

    const initAgora = async () => {
      try {
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClient.current = client;

        client.on('user-published', async (remoteUser, mediaType) => {
          if (!isMounted) return;
          try {
            await client.subscribe(remoteUser, mediaType);
            if (mediaType === 'video') {
              const el = document.getElementById('remote-video-container');
              if (el) remoteUser.videoTrack?.play(el);
            }
            if (mediaType === 'audio') remoteUser.audioTrack?.play();
          } catch (e) {}
        });

        client.on('user-left', () => isMounted && endCall());

        if (!isMounted) return;
        
        await client.join(AGORA_APP_ID, callDocId, null, isHostSide ? host.uid : user.uid);
        
        if (!isMounted) {
          client.leave().catch(() => {});
          return;
        }

        if (type === 'video') {
          localTracks.current.audio = await AgoraRTC.createMicrophoneAudioTrack();
          localTracks.current.video = await AgoraRTC.createCameraVideoTrack({ encoderConfig: "720p_1", facingMode: "user" });
          if (isMounted) {
            await client.publish([localTracks.current.audio, localTracks.current.video]);
            localTracks.current.video.play('local-video-container');
          } else {
            localTracks.current.audio.close();
            localTracks.current.video.close();
          }
        } else {
          localTracks.current.audio = await AgoraRTC.createMicrophoneAudioTrack();
          if (isMounted) {
            await client.publish([localTracks.current.audio]);
          } else {
            localTracks.current.audio.close();
          }
        }
      } catch (err: any) {
        if (err.code !== 'WS_ABORT' && err.message !== 'LEAVE') {
          console.error("Agora RTC Error:", err);
        }
      }
    };

    setupSignalingAndRingtone();
    initAgora();

    const unsubCall = onSnapshot(doc(db, 'activeCalls', callDocId), (snap) => {
      if (!isMounted) return;
      if (!snap.exists()) { onEnd(); return; }
      
      const data = snap.data();
      if (data.status === 'connected' && status === 'connecting') {
        setStatus('connected');
        if (ringtone.current) { ringtone.current.pause(); ringtone.current = null; }
        startTimer();
      }

      if (data.adminCommand === 'warning') {
        setWarningText("Violation of rules will lead to an immediate ban without notice.");
        setTimeout(() => isMounted && setWarningText(null), 8000);
      } else if (data.adminCommand === 'face_detect') {
        setShowFaceDetect(true);
        setTimeout(() => isMounted && setShowFaceDetect(false), 5000);
      } else if (data.adminCommand === 'terminate') {
        setStatus('terminated');
        setAdminMessage("Terminated for violating terms and conditions.");
        setTimeout(() => isMounted && endCall(), 5000);
      }
    });

    return () => {
      isMounted = false;
      cleanup();
      unsubCall();
    };
  }, []);

  const cleanup = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (ringtone.current) ringtone.current.pause();
    localTracks.current.audio?.stop();
    localTracks.current.audio?.close();
    localTracks.current.video?.stop();
    localTracks.current.video?.close();
    if (agoraClient.current) {
      try { 
        await agoraClient.current.leave().catch(() => {}); 
      } catch (e) {}
      agoraClient.current = null;
    }
  };

  const endCall = async () => {
    await cleanup();
    if (!isHostSide) {
      try { await deleteDoc(doc(db, 'activeCalls', callDocId)); } catch (e) {}
    }
    onEnd();
  };

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        const next = prev + 1;
        if (!isHostSide && next % 60 === 1) handleDeduction();
        return next;
      });
    }, 1000);
  };

  const toggleCamera = () => {
    if (localTracks.current.video) {
      const nextState = !isVideoOff;
      localTracks.current.video.setEnabled(!nextState);
      setIsVideoOff(nextState);
    }
  };

  const switchCamera = async () => {
    if (localTracks.current.video) {
      const devices = await AgoraRTC.getCameras();
      if (devices.length > 1) {
        const nextMode = isFrontCamera ? 'environment' : 'user';
        await localTracks.current.video.setDevice(nextMode === 'user' ? devices[0].deviceId : devices[1].deviceId);
        setIsFrontCamera(!isFrontCamera);
      }
    }
  };

  const handleDeduction = async () => {
    const userCost = type === 'video' ? 35 : 10;
    const hostGain = type === 'video' ? 20 : 5;
    const uDoc = await getDoc(doc(db, 'users', user.uid));
    if (uDoc.exists() && (uDoc.data()?.wallet || 0) < userCost) { endCall(); return; }
    try {
      await updateDoc(doc(db, 'users', user.uid), { wallet: increment(-userCost) });
      await updateDoc(doc(db, 'hosts', host.uid), { wallet: increment(hostGain) });
    } catch (e) {}
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60); const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'terminated') {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <div className="bg-zinc-900 border-2 border-red-600 p-10 rounded-[3rem] shadow-2xl animate-in zoom-in">
          <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase">Call Ended</h2>
          <p className="text-zinc-400 text-xs font-bold leading-relaxed">{adminMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black animate-in fade-in duration-700 overflow-hidden select-none">
      {type === 'video' && status === 'connected' && (
        <div id="remote-video-container" className="absolute inset-0 bg-zinc-950"></div>
      )}
      {type === 'video' && (
        <div id="local-video-container" className={`absolute top-24 right-6 w-28 h-40 bg-zinc-900 rounded-2xl overflow-hidden border-2 border-white/10 z-20 shadow-2xl transition-opacity ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}></div>
      )}
      {(type === 'audio' || status === 'connecting' || (type === 'video' && isVideoOff)) && (
        <div className="relative flex flex-col items-center justify-center h-full space-y-12 bg-black/40 backdrop-blur-sm p-6">
          <div className="relative">
             <div className="absolute inset-0 bg-[#d64e02] rounded-full blur-3xl opacity-20 scale-150 animate-pulse"></div>
             <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-zinc-900 overflow-hidden border-4 border-[#d64e02] flex items-center justify-center shadow-[0_0_50px_rgba(214,78,2,0.3)] z-10 aspect-square">
               <img 
                 src={isHostSide ? 'https://kinnaram.online/uploads/hlogo.png' : host.profilePhoto} 
                 className={`w-full h-full ${isHostSide ? 'object-contain p-6' : 'object-cover'} transition-all duration-1000 ${status === 'connected' ? 'border-green-500' : ''}`} 
                 alt="Avatar" 
               />
             </div>
          </div>
          <div className="text-center z-10 space-y-4">
             <h2 className="text-4xl font-black text-white mb-2 tracking-tight">{isHostSide ? user.fullName : host.fullName}</h2>
             <div className="flex items-center justify-center space-x-2">
               <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
               <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
                 {status === 'connecting' ? 'Connecting...' : 'Secure Connection'}
               </span>
             </div>
             {status === 'connected' && (
               <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 px-10 py-5 rounded-[2rem] shadow-2xl inline-block mt-4">
                 <p className="text-[#55faf4] text-5xl font-black font-mono tracking-tighter">{formatTime(timer)}</p>
               </div>
             )}
          </div>
        </div>
      )}
      {warningText && (
        <div className="absolute top-0 left-0 right-0 z-[1001] bg-red-600 text-white p-4 text-center font-black text-[10px] uppercase tracking-wider animate-in slide-in-from-top duration-500 shadow-2xl">
          ⚠️ {warningText}
        </div>
      )}
      {showFaceDetect && (
        <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center animate-in fade-in">
           <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 border border-white/20">
             <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
           </div>
           <p className="text-white text-sm font-black leading-relaxed max-w-xs uppercase tracking-tight">
             Privacy Protection: Please ensure your face is not visible.
           </p>
        </div>
      )}
      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center space-y-10 px-8 z-50">
        <div className="flex justify-center items-center space-x-6">
          <button onClick={() => { setIsMuted(!isMuted); localTracks.current.audio?.setEnabled(isMuted); }} className={`p-5 rounded-full border-2 transition-all ${isMuted ? 'bg-red-500 border-red-400' : 'bg-white/5 border-white/10'}`}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
          {type === 'video' && (
            <>
              <button onClick={toggleCamera} className={`p-5 rounded-full border-2 transition-all ${isVideoOff ? 'bg-red-500 border-red-400' : 'bg-white/5 border-white/10'}`}>
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isVideoOff ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  )}
                </svg>
              </button>
              <button onClick={switchCamera} className="p-5 bg-white/5 border-2 border-white/10 rounded-full text-white active:scale-90 transition-all">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </>
          )}
          <button onClick={endCall} className="p-8 bg-red-600 text-white rounded-full shadow-[0_0_40px_rgba(220,38,38,0.5)] border-4 border-white/10 active:scale-90 transition-transform">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
export default CallOverlay;
