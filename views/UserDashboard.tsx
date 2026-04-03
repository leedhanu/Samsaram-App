
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RechargeSection from './user/RechargeSection';
import ReportSection from './user/ReportSection';
import FriendsCorner from './user/FriendsCorner';
import VideoSection from './user/VideoSection';
import CallOverlay from './user/CallOverlay';
import { User, Host } from '../types';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface UserDashboardProps {
  user: User;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeCall, setActiveCall] = useState<{ host: Host; type: 'audio' | 'video' } | null>(null);

  const footerItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> 
    },
    { 
      id: 'recharge', 
      label: 'Recharge', 
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
    },
    { 
      id: 'report', 
      label: 'Report', 
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> 
    },
    { 
      id: 'logout', 
      label: 'Logout', 
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> 
    }
  ];

  const handleNav = (id: string) => {
    if (id === 'logout') {
      auth.signOut();
    } else {
      setActiveTab(id);
    }
  };

  const startCall = (host: Host, type: 'audio' | 'video') => {
    const minBalance = type === 'audio' ? 10 : 35;
    if (user.wallet < minBalance) {
      alert(`മിനിമം ബാലൻസ് ₹${minBalance} വേണം`);
      return;
    }
    setActiveCall({ host, type });
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <Header user={user} />
      
      <main className="flex-1 p-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <FriendsCorner onCall={startCall} />
            <VideoSection />
          </div>
        )}
        {activeTab === 'recharge' && <RechargeSection user={user} />}
        {activeTab === 'report' && <ReportSection user={user} />}
      </main>

      <Footer activeId={activeTab} items={footerItems} onSelect={handleNav} />

      {activeCall && (
        <CallOverlay 
          user={user} 
          host={activeCall.host} 
          type={activeCall.type} 
          onEnd={() => setActiveCall(null)} 
        />
      )}
    </div>
  );
};

export default UserDashboard;
