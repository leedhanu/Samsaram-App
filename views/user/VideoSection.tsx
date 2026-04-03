
import React, { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { ShortVideo } from '../../types';

const VideoSection: React.FC = () => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'Malayalam' | 'Hindi' | 'English' | 'Others'>('Malayalam');
  const [playingVideo, setPlayingVideo] = useState<ShortVideo | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShortVideo));
      setVideos(vids);
    });
    return () => unsubscribe();
  }, []);

  const categories = ['Malayalam', 'Hindi', 'English', 'Others'];

  if (showAll) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-500">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setShowAll(false)}
            className="p-2 bg-zinc-900 rounded-full text-white shrink-0 active:scale-90 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
              className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition ${activeCategory === cat ? 'bg-[#d64e02] text-white shadow-lg' : 'bg-zinc-900 text-zinc-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {videos.filter(v => v.category === activeCategory).map(vid => (
            <VideoCard key={vid.id} video={vid} onClick={() => setPlayingVideo(vid)} />
          ))}
        </div>

        {playingVideo && <VideoModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#ebfc5f]">Kinnaram Shorts</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {videos.slice(0, 4).map(vid => (
          <VideoCard key={vid.id} video={vid} onClick={() => setPlayingVideo(vid)} />
        ))}
      </div>

      <button 
        onClick={() => setShowAll(true)}
        className="w-full mt-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[#ebfc5f] font-bold shadow-xl active:scale-95 transition"
      >
        View All Shorts
      </button>

      {playingVideo && <VideoModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
    </section>
  );
};

const VideoCard: React.FC<{ video: ShortVideo; onClick: () => void }> = ({ video, onClick }) => {
  return (
    <div 
      className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-lg group active:scale-95 transition cursor-pointer" 
      onClick={onClick}
    >
      <div className="aspect-[9/16] relative bg-black">
        <img src={video.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
};

const VideoModal: React.FC<{ video: ShortVideo; onClose: () => void }> = ({ video, onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300">
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#d64e02] flex items-center justify-center font-black text-xs">K</div>
          <span className="font-bold text-sm text-white">Kinnaram Shorts</span>
        </div>
        <button 
          onClick={onClose}
          className="p-3 bg-zinc-800/80 rounded-full text-white active:scale-90 transition shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          <video 
            src={video.videoUrl} 
            className="w-full h-full object-cover" 
            autoPlay 
            controls 
            playsInline
            loop
          />
        </div>
      </div>

      <div className="p-8 text-center bg-gradient-to-t from-black/80 to-transparent">
         <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Category: {video.category}</p>
      </div>
    </div>
  );
};

export default VideoSection;
