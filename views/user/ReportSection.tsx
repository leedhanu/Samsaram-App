
import React, { useState } from 'react';
import { User } from '../../types';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const issues = [
  'Recharge Issue',
  'Calling Issue',
  'Video Removel Request',
  'Staff Related Issue',
  'Account Deletion',
  'New Host Registration',
  'Other Issues'
];

const ReportSection: React.FC<{ user: User }> = ({ user }) => {
  const [category, setCategory] = useState(issues[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        userId: user.uid,
        userName: user.fullName,
        userMobile: user.mobile,
        category,
        description,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setSuccess(true);
      setDescription('');
    } catch (error) {
      alert("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-[#d64e02]/10 border border-[#d64e02]/30 p-4 rounded-2xl">
        <p className="text-[#d64e02] text-xs font-semibold text-center italic">
          "ഞങ്ങൾ Kinnaram Short Videos സെക്ഷനിൽ ആഡ് ചെയ്‌തിരിക്കുന്ന വീഡിയോസ് ഞങ്ങളുടെ സെർവറിൽ ഹോസ്റ്റ് ചെയ്‌ത വീഡിയോസ് അല്ല ഇൻറർനെറ്റിൽ നിന്നും ലഭിക്കുന്ന വിവിധ സോഴ്സ്കളിൽ ഉള്ള വീഡിയോ ലിങ്ക് മാത്രമാണ് ഞങ്ങൾ ഇവിടെ നൽകിയിരിക്കുന്നത്"
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6">Submit a Report</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-xs mb-1 ml-1">Full Name</label>
            <input type="text" value={user.fullName} readOnly className="w-full bg-black/50 border border-zinc-800 p-3 rounded-xl text-zinc-500 outline-none" />
          </div>
          <div>
            <label className="block text-zinc-400 text-xs mb-1 ml-1">Mobile Number</label>
            <input type="text" value={user.mobile} readOnly className="w-full bg-black/50 border border-zinc-800 p-3 rounded-xl text-zinc-500 outline-none" />
          </div>
          <div>
            <label className="block text-zinc-400 text-xs mb-1 ml-1">Issue Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-white outline-none focus:ring-1 focus:ring-[#d64e02]"
            >
              {issues.map(iss => <option key={iss} value={iss}>{iss}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-zinc-400 text-xs mb-1 ml-1">Describe Issue</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-white outline-none h-32 focus:ring-1 focus:ring-[#d64e02]"
              placeholder="Tell us what happened..."
              required
            ></textarea>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-[#d64e02] py-4 rounded-xl text-white font-bold shadow-xl active:scale-95 transition disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>

        {success && (
          <p className="mt-4 text-center text-[#97fa55] text-sm font-bold animate-bounce">
            Report submitted successfully!
          </p>
        )}
      </div>
    </div>
  );
};

export default ReportSection;
