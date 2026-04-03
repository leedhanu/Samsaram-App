
import React, { useState, useEffect } from 'react';
import { User, AppNotification } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface HeaderProps {
  user: User;
  onNotificationClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', 'in', [user.uid, 'all'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      const sortedNotifs = notifs.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }).slice(0, 6);
      
      setNotifications(sortedNotifs);
    }, (error) => {
      console.error("Notification listener error:", error);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <img src="https://kinnaram.online/uploads/hlogo.png" alt="Kinnaram" className="h-10" />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center bg-zinc-900 rounded-full px-4 py-1.5 border border-zinc-800">
          <span className="text-[#ebfc5f] mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002 2v9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="font-bold text-white text-sm">₹{user.wallet.toFixed(2)}</span>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            className="p-2 bg-zinc-900 rounded-full border border-zinc-800 text-zinc-400 relative active:scale-90 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {hasUnread && <div className="absolute top-0 right-0 h-3 w-3 bg-[#d64e02] rounded-full border-2 border-black"></div>}
          </button>

          {showNotifPanel && (
            <div className="absolute right-0 mt-3 w-72 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                <h3 className="font-bold text-sm">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-sm">No notifications yet</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className="p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition">
                      <p className="text-white text-sm font-semibold mb-1">{notif.title}</p>
                      <p className="text-zinc-400 text-xs">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
