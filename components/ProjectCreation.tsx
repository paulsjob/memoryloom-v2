
import React, { useState } from 'react';
import { MilestoneType, Project } from '../types';
import { generateInviteCopy } from '../services/geminiService';
import { Button } from './ui/Button';

interface ProjectCreationProps {
  onCancel: () => void;
  onSubmit: (project: Partial<Project>) => void;
}

const ProjectCreation: React.FC<ProjectCreationProps> = ({ onCancel, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<Project>>({
    recipientName: '',
    milestone: MilestoneType.BIRTHDAY,
    deadline: '',
    title: '',
  });

  const milestones = Object.values(MilestoneType);

  const handleNext = async () => {
    if (step === 3) {
      setLoading(true);
      const copy = await generateInviteCopy(formData.recipientName!, formData.milestone!);
      setInvites(copy);
      setLoading(false);
      setStep(4);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => setStep(step - 1);

  const handleShareWhatsApp = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareEmail = (text: string) => {
    const subject = encodeURIComponent(`Help us surprise ${formData.recipientName}!`);
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(text)}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <div className="mb-12">
        <div className="flex items-center gap-4 text-sm text-stone-400 font-medium mb-4">
          <span className={`${step >= 1 ? 'text-amber-600' : ''}`}>1. Details</span>
          <span className="w-8 h-px bg-stone-200"></span>
          <span className={`${step >= 2 ? 'text-amber-600' : ''}`}>2. Tone</span>
          <span className="w-8 h-px bg-stone-200"></span>
          <span className={`${step >= 3 ? 'text-amber-600' : ''}`}>3. Launch</span>
          <span className="w-8 h-px bg-stone-200"></span>
          <span className={`${step >= 4 ? 'text-amber-600' : ''}`}>4. Share</span>
        </div>
        <h1 className="text-4xl font-bold text-stone-900 italic serif">
          {step === 1 && "Who are we celebrating?"}
          {step === 2 && "Setting the mood"}
          {step === 3 && "Review your project"}
          {step === 4 && "Your project is live!"}
        </h1>
      </div>

      <div className="space-y-8 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-stone-800 italic serif">Crafting the perfect invites...</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Recipient's Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                placeholder="e.g. Grandma Betty, Captain Miller..."
                value={formData.recipientName}
                onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">What's the occasion?</label>
              <div className="grid grid-cols-2 gap-3">
                {milestones.map(m => (
                  <button
                    key={m}
                    onClick={() => setFormData({...formData, milestone: m})}
                    className={`px-4 py-3 text-sm rounded-xl border text-left transition-all ${formData.milestone === m ? 'border-amber-500 bg-amber-50 text-amber-700 font-semibold ring-1 ring-amber-500' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">When do you need the video ready?</label>
              <input 
                type="date" 
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={formData.deadline}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'cinematic', label: 'Cinematic & Heartfelt', desc: 'Slow pacing, sweeping music.' },
                  { id: 'playful', label: 'Fun & Playful', desc: 'Upbeat music, dynamic cuts.' },
                  { id: 'documentary', label: 'Documentary', desc: 'Narrative-driven, chronological.' },
                  { id: 'minimal', label: 'Simple & Clean', desc: 'Unobtrusive music, voice first.' },
                ].map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setFormData({...formData, theme: theme.id as any})}
                    className={`p-4 rounded-2xl border text-left transition-all ${formData.theme === theme.id ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-stone-200 bg-white hover:border-stone-300'}`}
                  >
                    <div className="font-bold text-stone-800">{theme.label}</div>
                    <div className="text-sm text-stone-500">{theme.desc}</div>
                  </button>
                ))}
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
              <h4 className="font-bold text-stone-800 mb-2 italic serif text-lg">Tribute Summary</h4>
              <p className="text-stone-600 mb-1"><span className="font-semibold">Recipient:</span> {formData.recipientName}</p>
              <p className="text-stone-600 mb-1"><span className="font-semibold">Occasion:</span> {formData.milestone}</p>
              <p className="text-stone-600"><span className="font-semibold">Deadline:</span> {formData.deadline}</p>
            </div>
          </div>
        )}

        {step === 4 && invites && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-green-50 border border-green-100 p-6 rounded-[2rem] flex items-start gap-4">
              <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-green-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-green-900">Project Launched</h4>
                <p className="text-sm text-green-700">MemoryLoom is ready to receive clips for {formData.recipientName}.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-[2rem]">
                <p className="text-[10px] font-bold text-amber-600 mb-3 tracking-widest uppercase italic">WhatsApp Invite</p>
                <p className="text-sm text-stone-600 mb-6 italic leading-relaxed">"{invites.whatsapp}"</p>
                <div className="flex gap-2">
                   <Button onClick={() => handleShareWhatsApp(invites.whatsapp)} size="sm" className="flex-1 bg-green-600 hover:bg-green-700">Send via WhatsApp</Button>
                   <Button onClick={() => navigator.clipboard.writeText(invites.whatsapp)} variant="ghost" size="sm" className="px-4">Copy</Button>
                </div>
              </div>

              <div className="p-6 bg-stone-50 border border-stone-200 rounded-[2rem]">
                <p className="text-[10px] font-bold text-indigo-600 mb-3 tracking-widest uppercase italic">Email Invite</p>
                <p className="text-sm text-stone-600 mb-6 italic leading-relaxed line-clamp-2">"{invites.email}"</p>
                <div className="flex gap-2">
                   <Button onClick={() => handleShareEmail(invites.email)} size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700">Open in Mail</Button>
                   <Button onClick={() => navigator.clipboard.writeText(invites.email)} variant="ghost" size="sm" className="px-4">Copy</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-8 flex justify-between gap-4">
          {step === 1 && (
            <button onClick={onCancel} className="text-stone-500 font-semibold hover:text-stone-700">Cancel</button>
          )}
          {step > 1 && step < 4 && (
            <button onClick={handleBack} className="text-stone-500 font-semibold hover:text-stone-700 flex items-center gap-1">
              Back
            </button>
          )}
          
          {step < 4 ? (
            <button 
              onClick={handleNext}
              disabled={!formData.recipientName || (step === 1 && !formData.deadline)}
              className="bg-stone-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50 ml-auto"
            >
              {step === 3 ? "Launch Project" : "Continue"}
            </button>
          ) : (
            <button 
              onClick={() => onSubmit(formData)}
              className="bg-amber-500 text-white px-10 py-4 rounded-full font-bold hover:bg-amber-600 transition-all shadow-xl hover:scale-105 w-full"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCreation;
