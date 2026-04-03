
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black animate-in fade-in duration-700">
      <div className="relative mb-10">
        {/* ഗ്ലോ ഇഫക്റ്റ് */}
        <div className="absolute inset-0 bg-[#d64e02] blur-[60px] opacity-20 rounded-full scale-150"></div>
        <img 
          src="https://kinnaram.online/uploads/hlogo.png" 
          alt="Kinnaram Logo" 
          className="h-24 w-auto relative z-10 animate-pulse object-contain"
        />
      </div>
      
      {/* ലോഡിംഗ് ഡോട്ടുകൾ */}
      <div className="flex space-x-3">
        <div className="w-2.5 h-2.5 bg-[#d64e02] rounded-full animate-bounce [animation-duration:1s]"></div>
        <div className="w-2.5 h-2.5 bg-[#55faf4] rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></div>
        <div className="w-2.5 h-2.5 bg-[#97fa55] rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></div>
      </div>
      
      <p className="mt-8 text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
        Premium Connections
      </p>
    </div>
  );
};

export default SplashScreen;
