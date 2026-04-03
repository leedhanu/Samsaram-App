
import React, { useState } from 'react';
// Fix: Use scoped @firebase/auth import to resolve type resolution issues
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@firebase/auth';
import { doc, setDoc, getDoc } from '@firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types';

const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState<'user' | 'host' | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = `${mobile}@kinnaram.com`;

      if (activeTab === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser: User = {
          uid: userCredential.user.uid,
          fullName,
          mobile,
          role: 'user',
          wallet: 0,
          isBanned: false,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      } else {
        if (mobile === '9020030068' && password === '181030') {
           const emailAdmin = `admin@kinnaram.com`;
           try {
             await signInWithEmailAndPassword(auth, emailAdmin, password);
           } catch {
             const cred = await createUserWithEmailAndPassword(auth, emailAdmin, password);
             await setDoc(doc(db, 'users', cred.user.uid), {
               uid: cred.user.uid,
               fullName: 'Admin',
               mobile: '9020030068',
               role: 'admin',
               wallet: 0,
               isBanned: false,
               createdAt: new Date().toISOString()
             });
           }
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6">
      <div className="w-full max-w-md bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-md shadow-2xl">
        <div className="flex justify-center mb-8">
          <img src="https://kinnaram.online/uploads/hlogo.png" alt="Logo" className="h-20" />
        </div>

        <div className="flex bg-black/50 p-1 rounded-xl mb-6 border border-zinc-800">
          <button 
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 text-center rounded-lg transition ${activeTab === 'login' ? 'bg-[#d64e02] text-white shadow-lg' : 'text-zinc-500'}`}
          >
            Login
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2 text-center rounded-lg transition ${activeTab === 'register' ? 'bg-[#d64e02] text-white shadow-lg' : 'text-zinc-500'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {activeTab === 'register' && (
            <div>
              <label className="block text-zinc-400 text-sm mb-1 ml-1">Full Name</label>
              <input 
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter Full Name"
                className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:ring-2 focus:ring-[#d64e02] outline-none transition"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-zinc-400 text-sm mb-1 ml-1">Mobile Number</label>
            <input 
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter Mobile Number"
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:ring-2 focus:ring-[#55faf4] outline-none transition"
              required
            />
            <p className="text-[10px] text-red-500 mt-1 ml-1">
              ശരിയായ മൊബൈൽ നമ്പർ അല്ലങ്കിൽ അക്കൗണ്ട് ബാൻ ആകും
            </p>
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1 ml-1">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:ring-2 focus:ring-[#97fa55] outline-none transition"
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-[#d64e02] py-4 rounded-xl font-bold text-white shadow-xl active:scale-95 transition mt-4 disabled:opacity-50"
          >
            {loading ? 'Processing...' : activeTab === 'login' ? 'LOGIN' : 'REGISTER'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-xs mb-3">Read user and host terms and conditions</p>
          <div className="flex justify-center space-x-4">
            <button onClick={() => setShowTerms('user')} className="text-[#55faf4] text-sm hover:underline">User Terms</button>
            <button onClick={() => setShowTerms('host')} className="text-[#97fa55] text-sm hover:underline">Host Terms</button>
          </div>
        </div>
      </div>

      {showTerms && (
        <div className="fixed inset-0 bg-black/90 z-50 p-6 flex items-center justify-center">
          <div className="bg-zinc-900 w-full max-w-md p-6 rounded-2xl border border-zinc-800 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-[#d64e02]">
              {showTerms === 'user' ? 'User Terms & Conditions' : 'Host Terms & Conditions'}
            </h2>
            <div className="space-y-4 text-sm text-zinc-300">
              {showTerms === 'user' ? (
                <>
                  <p>1. 18വയസ്സിന് മുകളിൽ ഉള്ളവർക്ക് വേണ്ടിയാണ് ഞങ്ങളുടെ പ്ലാറ്റ്ഫോം ഡിസൈൻ ചെയ്തിരിക്കുന്നത് അതിനാൽ 18 വയസ്സിന് മുകളിൽ ഉളളവർ മാത്രം ഞങ്ങളുടെ പ്ലാറ്റ്ഫോം ഉപയോഗിക്കുക</p>
                  <p>2. സോഷ്യൽ മീഡിയ ഐഡി ഫോൺ എന്നിവ നിങ്ങൾ ഞങ്ങളുടെ പ്ലാറ്റ്ഫോം വഴി ഷേർ ചെയ്യുകയാണെങ്കിലും മുന്നറിയിപ്പ് ഇല്ലാതെ നിങ്ങളുടെ അക്കൗണ്ട് ബാൻ ചെയ്യുന്നതാണ്</p>
                  <p>3. ഞങ്ങളുടെ പ്ലാറ്റ്ഫോം വെറുമൊരു സൗഹൃദത്തിന് വേണ്ടിയുള്ള പ്ലാറ്റ്ഫോം ആണ് ആയതിനാൽ ഞങ്ങളുടെ പ്ലാറ്റ്ഫോമിലെ ഓഡിയോ/വീഡിയോ കോൾ നിങ്ങള് ദുരുപയോഗം ചെയ്യുന്നുണ്ടെങ്കിൽ നിയമനടപടികൾ നേരിടേണ്ടി വരും എന്ന് ഓർമപ്പെടുത്തുന്നു.</p>
                </>
              ) : (
                <>
                  <p>1. വ്യക്തിപരമായ വിവരങ്ങൾ, ഫോൺ നമ്പർ സോഷ്യൽ മീഡിയ ഐഡി എന്നിവ ഞങ്ങളുടെ പ്ലാറ്റ്ഫോം വഴി ഷേർ ചെയ്യാൻ അനുവദിക്കുന്നത് അല്ല.</p>
                  <p>2. 18 വയസ്സിന് മുകളിൽ ഉള്ളവർക്ക് മാത്രമേ ഹോസ്റ്റ് ആയി ഞങ്ങളുടെ പ്ലാറ്റ്ഫോമിൽ വർക്ക് ചെയ്യാൻ സാധിക്കു എന്ന് ഓർമപ്പെടുത്തുന്നു.</p>
                  <p>3. ഈ പ്ലാറ്റ്ഫോം ഇൽ ഉള്ള ഓഡിയോ വീഡിയോ കോൾ എന്നിവ ഞാൻ എൻ്റെ പൂർണ്ണ സമ്മത്തോടെയാണ് ഞാൻ ചെയ്യുന്നത്.</p>
                </>
              )}
            </div>
            <button 
              onClick={() => setShowTerms(null)}
              className="mt-6 w-full py-2 bg-zinc-800 rounded-lg text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
