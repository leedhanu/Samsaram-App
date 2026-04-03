
import React from 'react';
import { auth } from '../firebase';

const BannedPage: React.FC = () => {
  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="max-w-sm w-full bg-zinc-900/40 border border-red-900/30 p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
        <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-8 ring-4 ring-red-600/20">
          <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-8v6m-5.253-1.747L3.34 16c-.77 1.333.192 3 1.732 3h13.856c1.54 0 2.502-1.667 1.732-3l-3.407-5.747c-.77-1.333-2.694-1.333-3.464 0z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-black text-white mb-4 leading-tight">അക്കൗണ്ട് ബാൻ ചെയ്യപ്പെട്ടു</h2>
        
        <div className="space-y-4 text-zinc-400 text-sm leading-relaxed mb-10 px-2">
          <p>
            സുരക്ഷാ കാരണങ്ങളാലോ ഞങ്ങളുടെ നിബന്ധനകൾ ലംഘിച്ചതിനാലോ നിങ്ങളുടെ അക്കൗണ്ട് താൽക്കാലികമായി റദ്ദാക്കിയിരിക്കുകയാണ്.
          </p>
          <div className="p-4 bg-black/40 rounded-2xl border border-zinc-800">
            <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2">സഹായത്തിനായി ബന്ധപ്പെടുക</p>
            <a href="mailto:support@kinnaram.online" className="text-red-500 font-bold text-sm underline">
              support@kinnaram.online
            </a>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all active:scale-95 shadow-xl"
        >
          മടങ്ങുക
        </button>
      </div>
    </div>
  );
};

export default BannedPage;
