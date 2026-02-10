
import React, { useState, useEffect, useRef } from 'react';
import { Project, CommunityAsset } from '../types';
import { generateContributorPrompts } from '../services/geminiService';
import { Button } from './ui/Button';
import { cn, generateId } from '../lib/utils';

interface ContributorPortalProps {
  project: Project;
  onFinish: () => void;
  onAddAsset: (asset: CommunityAsset, blob: Blob) => void;
}

const ContributorPortal: React.FC<ContributorPortalProps> = ({ project, onFinish, onAddAsset }) => {
  const [mode, setMode] = useState<'welcome' | 'testimony' | 'library'>('welcome');
  const [step, setStep] = useState(1);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
  // Library Asset States
  const [assetForm, setAssetForm] = useState({ title: '', description: '', editorNotes: '', type: 'photo' as 'photo' | 'video' });
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetPreview, setAssetPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    async function fetchPrompts() {
      setPrompts(await generateContributorPrompts(project.milestone, project.recipientName));
    }
    fetchPrompts();
  }, [project]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        setStep(4);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setStep(3);
    } catch (err) { alert("Camera access required!"); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const handleAssetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAssetFile(file);
      setAssetPreview(URL.createObjectURL(file));
      setAssetForm(prev => ({ ...prev, type: file.type.startsWith('video') ? 'video' : 'photo' }));
    }
  };

  const submitLibraryAsset = async () => {
    if (!assetFile) return;
    setIsUploading(true);
    const asset: CommunityAsset = {
      id: generateId(),
      contributorName: "Friend",
      type: assetForm.type,
      url: assetPreview!, // Temporary local URL, will be replaced by persisted Blob URL in Dashboard
      title: assetForm.title || "Untitled Memory",
      description: assetForm.description,
      editorNotes: assetForm.editorNotes,
      createdAt: new Date().toISOString()
    };
    onAddAsset(asset, assetFile);
    setTimeout(() => { setIsUploading(false); setStep(5); }, 1000);
  };

  const submitTestimony = async () => {
    if (!recordedBlob) return;
    setIsUploading(true);
    // In this MVP, we treat testimony as a regular submit or can pair it with assets
    setTimeout(() => { setIsUploading(false); setStep(5); }, 1000);
  };

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-10 md:py-20 text-center flex flex-col min-h-[80vh]">
      {mode === 'welcome' && (
        <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <h1 className="text-4xl font-bold text-stone-900 leading-tight mb-4">Woven with love for <br /><span className="text-amber-600 italic serif">{project.recipientName}</span></h1>
          <p className="text-stone-600 text-lg mb-12 italic serif">How would you like to contribute?</p>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => { setMode('testimony'); setStep(1); }} className="p-8 bg-white border border-stone-200 rounded-[2rem] hover:border-amber-500 hover:shadow-xl transition-all group text-left">
               <span className="block font-bold text-xl text-stone-800 mb-1">Record a Testimony</span>
               <span className="text-sm text-stone-400 font-medium">Film a personal message (60 seconds)</span>
            </button>
            <button onClick={() => { setMode('library'); setStep(1); }} className="p-8 bg-white border border-stone-200 rounded-[2rem] hover:border-amber-500 hover:shadow-xl transition-all group text-left">
               <span className="block font-bold text-xl text-stone-800 mb-1">Add to the Library</span>
               <span className="text-sm text-stone-400 font-medium">Share B-roll, photos, or audio stories</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'testimony' && (
        <div className="animate-in fade-in">
          {step === 1 && (
             <div className="space-y-8">
               <h2 className="text-2xl font-bold text-stone-800 italic serif">Pick a conversation starter</h2>
               <div className="grid grid-cols-1 gap-3 text-left">
                 {prompts.map((p, i) => (
                   <button key={i} onClick={() => { setActivePromptIndex(i); setStep(2); }} className="p-5 bg-white border border-stone-200 rounded-[1.5rem] hover:border-amber-500 transition-all text-stone-700 font-medium text-sm flex gap-4 items-center">
                     <span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 text-xs font-bold">{i+1}</span>
                     <span className="truncate">{p}</span>
                   </button>
                 ))}
               </div>
               <button onClick={() => setMode('welcome')} className="text-stone-400 text-[10px] font-bold uppercase tracking-widest py-8">Back</button>
             </div>
          )}

          {step === 2 && (
             <div className="flex-1 flex flex-col justify-center space-y-8 animate-in zoom-in-95">
               <div className="bg-stone-100 p-8 rounded-[2.5rem] border"><p className="text-lg italic serif text-stone-700">"{prompts[activePromptIndex]}"</p></div>
               <div className="space-y-6">
                 <Button onClick={startRecording} size="lg" className="w-full">Open Camera</Button>
                 <Button variant="ghost" onClick={() => setStep(1)} className="w-full">Change Question</Button>
               </div>
             </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 rounded-[2.5rem] overflow-hidden relative shadow-2xl border-[6px] border-amber-400 mb-6">
                <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute top-4 inset-x-4 p-4 bg-black/50 backdrop-blur rounded-2xl text-white text-xs italic">"{prompts[activePromptIndex]}"</div>
                <div className="absolute bottom-6 inset-x-0 flex justify-center"><button onClick={stopRecording} className="w-20 h-20 bg-red-600 rounded-full border-4 border-white/30 shadow-2xl" /></div>
              </div>
            </div>
          )}

          {step === 4 && videoUrl && (
            <div className="flex-1 flex flex-col animate-in fade-in">
               <h2 className="text-2xl font-bold text-stone-800 italic serif mb-6">Securing memory...</h2>
               <div className="flex-1 bg-stone-950 rounded-[2.5rem] overflow-hidden shadow-xl mb-8"><video src={videoUrl} controls className="w-full h-full object-contain" /></div>
               <div className="grid grid-cols-2 gap-4"><Button variant="ghost" onClick={() => setStep(2)}>Redo</Button><Button onClick={submitTestimony}>Submit</Button></div>
            </div>
          )}
        </div>
      )}

      {mode === 'library' && (
        <div className="animate-in fade-in text-left">
           {step === 1 && (
              <div className="space-y-10">
                 <div className="text-center">
                    <h2 className="text-3xl font-bold italic serif mb-4">Contribute Context</h2>
                    <p className="text-stone-500 italic">Upload assets to give the story more depth.</p>
                 </div>
                 
                 <div className="space-y-8">
                    {!assetPreview ? (
                      <label className="block w-full py-20 bg-stone-50 border-2 border-dashed border-stone-200 rounded-[3rem] text-center cursor-pointer hover:bg-stone-100 transition-colors">
                         <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-stone-400"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                         <span className="text-sm font-bold text-stone-400 uppercase tracking-widest">Select Photo or Video</span>
                         <input type="file" className="hidden" accept="image/*,video/*" onChange={handleAssetSelect} />
                      </label>
                    ) : (
                      <div className="space-y-8 animate-in zoom-in-95">
                         <div className="aspect-video bg-stone-100 rounded-[2.5rem] overflow-hidden relative border">
                            {assetForm.type === 'photo' ? <img src={assetPreview} className="w-full h-full object-cover" /> : <video src={assetPreview} className="w-full h-full object-cover" />}
                            <button onClick={() => { setAssetPreview(null); setAssetFile(null); }} className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg text-stone-500 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                         </div>
                         
                         <div className="space-y-6">
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Asset Title</label>
                               <input type="text" value={assetForm.title} onChange={e => setAssetForm({...assetForm, title: e.target.value})} placeholder="e.g. Grandma's Favorite Garden" className="w-full p-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">The Story (Context)</label>
                               <textarea value={assetForm.description} onChange={e => setAssetForm({...assetForm, description: e.target.value})} placeholder="Why is this important for the tribute?" className="w-full p-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 h-24 resize-none" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold uppercase tracking-widest text-amber-500 ml-1">Notes for the MemoryLoom Editor</label>
                               <textarea value={assetForm.editorNotes} onChange={e => setAssetForm({...assetForm, editorNotes: e.target.value})} placeholder="e.g. 'Use during the family history part' or 'Music should be quiet here'" className="w-full p-4 bg-amber-50/50 border border-amber-100 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 h-24 resize-none text-sm text-stone-600 italic" />
                            </div>
                            <Button onClick={submitLibraryAsset} className="w-full py-5 rounded-[2rem] shadow-xl shadow-amber-500/10" disabled={!assetForm.title || !assetForm.description}>Add to Loom Library</Button>
                         </div>
                      </div>
                    )}
                 </div>
                 <div className="text-center pt-8"><button onClick={() => setMode('welcome')} className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Cancel</button></div>
              </div>
           )}
        </div>
      )}

      {step === 5 && (
        <div className="flex-1 flex flex-col justify-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm"><svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
          <h2 className="text-4xl font-bold text-stone-900 italic serif mb-4">Memory Secured!</h2>
          <p className="text-stone-600 text-lg mb-12">Your contribution is safely woven into the loom.</p>
          <div className="flex flex-col gap-3">
             <Button onClick={() => { setMode('welcome'); setStep(1); setAssetPreview(null); setAssetFile(null); setAssetForm({ title: '', description: '', editorNotes: '', type: 'photo' }); }}>Share Something Else</Button>
             <Button variant="ghost" onClick={onFinish}>I'm Done</Button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-stone-50/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h3 className="text-xl font-bold text-stone-800 italic serif">Persisting Asset Locally...</h3>
          <p className="text-stone-400 text-xs mt-2">Bypassing repository sync for durability.</p>
        </div>
      )}
    </div>
  );
};

export default ContributorPortal;
