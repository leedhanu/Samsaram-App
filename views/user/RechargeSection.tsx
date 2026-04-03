
import React, { useState } from 'react';
import { User, RechargeRequest } from '../../types';
import { uploadFile } from '../../services/uploadService';
import { addDoc, collection, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';

const packages = [
  { id: '1', amount: 40, minutes: 4, icon: '💎' },
  { id: '2', amount: 110, minutes: 11, icon: '🔥' },
  { id: '3', amount: 210, minutes: 21, icon: '👑' },
  { id: '4', amount: 320, minutes: 32, icon: '🦁' },
  { id: '5', amount: 420, minutes: 42, icon: '🚀' },
  { id: '6', amount: 650, minutes: 65, icon: '🥇' },
];

const RechargeSection: React.FC<{ user: User }> = ({ user }) => {
  const [selectedPkg, setSelectedPkg] = useState<typeof packages[0] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'packages' | 'payment' | 'success'>('packages');

  const handleRazorpayPayment = async (pkg: typeof packages[0]) => {
    setLoading(true);
    try {
      // 1. Create Order on Server
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pkg.amount }),
      });
      const order = await orderResponse.json();

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_Q18QdAv2M6WC78',
        amount: order.amount,
        currency: order.currency,
        name: "Kinnaram",
        description: `${pkg.minutes} Minutes Pack`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            setLoading(true);
            // 3. Verify Payment on Server
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyResponse.ok) {
              // 4. Update Wallet in Firestore
              const userRef = doc(db, 'users', user.uid);
              await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                const currentWallet = userDoc.data().wallet || 0;
                transaction.update(userRef, {
                  wallet: currentWallet + pkg.amount
                });
              });

              // 5. Log Transaction
              await addDoc(collection(db, 'rechargeRequests'), {
                userId: user.uid,
                userName: user.fullName,
                userMobile: user.mobile,
                amount: pkg.amount,
                status: 'approved',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                method: 'razorpay',
                createdAt: serverTimestamp(),
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
              });

              setStep('success');
            } else {
              alert("Payment verification failed!");
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("Error updating wallet. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user.fullName,
          contact: user.mobile,
        },
        theme: {
          color: "#d64e02",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert("Payment Failed: " + response.error.description);
        setLoading(false);
      });
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to initiate payment.");
      setLoading(false);
    }
  };

  const handleManualRecharge = async () => {
    if (!file || !selectedPkg) return;
    setLoading(true);
    try {
      const url = await uploadFile(file, 'screenshots');
      await addDoc(collection(db, 'rechargeRequests'), {
        userId: user.uid,
        userName: user.fullName,
        userMobile: user.mobile,
        amount: selectedPkg.amount,
        screenshotUrl: url,
        status: 'pending',
        createdAt: serverTimestamp(),
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
      });
      setStep('success');
    } catch (error) {
      alert("Failed to process recharge. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in">
        <div className="w-20 h-20 bg-[#97fa55] rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-[#97fa55]/30">
          <svg className="w-10 h-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold mb-4">Request Sent!</h2>
        <p className="text-zinc-400 leading-relaxed px-6">
          നിങ്ങളുടെ റീചാർജ് ഞങ്ങൾ verify ചെയ്യുകയാണ് 10മിനിറ്റ് ഉള്ളിൽ നിങ്ങളുടെ റീചാർജ് അമ്മൗണ്ട് വാലറ്റിൽ ക്രെഡിറ്റ് ആകുന്നതാണ്
        </p>
        <button 
          onClick={() => setStep('packages')}
          className="mt-8 px-10 py-3 bg-[#d64e02] rounded-xl text-white font-bold"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (selectedPkg && step === 'payment') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right">
        <button onClick={() => setStep('packages')} className="flex items-center text-[#55faf4] font-bold">
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center shadow-xl">
          <h2 className="text-xl font-bold mb-4">Scan & Pay</h2>
          <div className="flex justify-center mb-4">
            <img src="https://kinnaram.online/qr.jpg" alt="QR Code" className="w-64 h-64 rounded-2xl bg-white p-2" />
          </div>
          <a 
            href="https://kinnaram.online/qr.jpg" 
            download="Kinnaram_QR.jpg"
            className="inline-block px-6 py-2 bg-zinc-800 rounded-lg text-sm text-white mb-6 border border-zinc-700"
          >
            Download QR
          </a>

          <div className="bg-black/50 p-4 rounded-xl text-xs text-zinc-400 text-left space-y-2 border border-zinc-800">
            <p>മുകളിൽ കാണുന്ന QR കോഡ് സ്കാൻ ചെയ്തു നിങ്ങളുടെ പാക്കേജ് അമ്മൗണ്ട് <b>₹{selectedPkg.amount}</b> പേയ്മെൻ്റ് ചെയ്തതിനു ശേഷം പേയ്മെൻ്റ് screenshoot അപ്‌ലോഡ് ചെയ്തു Recharge Now എന്ന ബട്ടണിൽ ക്ലിക്ക് ചെയ്യുക</p>
          </div>

          <div className="mt-6">
            <input 
              type="file" 
              accept="image/*"
              id="screenshot-input"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label 
              htmlFor="screenshot-input"
              className="w-full flex items-center justify-center py-4 border-2 border-dashed border-zinc-800 rounded-2xl cursor-pointer hover:border-[#d64e02] transition"
            >
              {file ? (
                <div className="flex items-center text-[#97fa55]">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                  {file.name}
                </div>
              ) : (
                <div className="text-zinc-500 text-sm">Upload Payment Screenshot</div>
              )}
            </label>
          </div>

          <button 
            disabled={!file || loading}
            onClick={handleManualRecharge}
            className="w-full bg-[#d64e02] py-4 rounded-xl text-white font-bold mt-6 shadow-xl active:scale-95 transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Recharge Now'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-2xl font-bold text-[#d64e02]">Select Package</h2>
      <div className="grid grid-cols-2 gap-4">
        {packages.map(pkg => (
          <div key={pkg.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl flex flex-col items-center justify-center hover:border-[#d64e02] transition shadow-lg group">
            <span className="text-4xl mb-2 group-hover:scale-110 transition">{pkg.icon}</span>
            <span className="text-xl font-black text-white">₹{pkg.amount}</span>
            <span className="text-zinc-500 text-[10px] mt-1 mb-4">{pkg.minutes} Minutes Pack</span>
            
            <div className="w-full space-y-2">
              <button
                disabled={loading}
                onClick={() => handleRazorpayPayment(pkg)}
                className="w-full bg-[#d64e02] py-2 rounded-xl text-white text-xs font-bold shadow-lg active:scale-95 transition disabled:opacity-50"
              >
                Pay Online
              </button>
              <button
                onClick={() => { setSelectedPkg(pkg); setStep('payment'); }}
                className="w-full bg-zinc-800 py-2 rounded-xl text-zinc-400 text-[10px] font-bold active:scale-95 transition"
              >
                Manual (QR)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RechargeSection;
