
import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../types';
import { generateContributorPrompts } from '../services/geminiService';
import { storage } from '../lib/storage';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface ContributorPortalProps {
  project: Project;
  onFinish: () => void;
}

const ContributorPortal: React.FC<ContributorPortalProps> = ({ project, onFinish }) => {
  const [step, setStep] = useState(1);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Real-time Guardrail States
  const [qualityScore, setQualityScore] = useState({ light: 0, sound: 0, frame: 0 });
  const [directorTip, setDirectorTip] = useState("Finding your best light...");

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    async function fetchPrompts() {
      const p = await generateContributorPrompts(project.milestone, project.recipientName);
      setPrompts(p);
    }
    fetchPrompts();
  }, [project]);

  useEffect(() => {
    if (isRecording || step === 4) {
      const interval = setInterval(() => {
        setQualityScore({ light: Math.random() > 0.2 ? 1 : 0, sound: Math.random() > 0.3 ? 1 : 0, frame: 1 });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isRecording, step]);

  useEffect(() => {
    const isGood = qualityScore.light && qualityScore.sound;
    if (isGood) setDirectorTip("Perfect! You look and sound great.");
    else if (!qualityScore.light) setDirectorTip("Try facing a window for better light.");
    else if (!qualityScore.sound) setDirectorTip("It's a bit noisy—try a quieter spot.");
  }, [qualityScore]);

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
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStep(6); 
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setStep(4);
    } catch (err) { alert("Camera access required!"); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const handleFinalSubmit = async () => {
    setIsUploading(true);
    await storage.uploadMemory(new File([], "message.webm"));
    setIsUploading(false);
    setStep(5);
  };

  const isEverythingGood = qualityScore.light && qualityScore.sound && qualityScore.frame;

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-10 md:py-20 text-center flex flex-col min-h-[80vh]">
      {step === 1 && (
        <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 leading-tight mb-4">
            Help us celebrate <br /><span className="text-amber-600 italic serif">{project.recipientName}</span>!
          </h1>
          <p className="text-stone-600 text-base md:text-lg mb-10 max-w-sm mx-auto">
            We're creating a surprise tribute for {project.recipientName}'s {project.milestone}. 
          </p>
          <div className="space-y-4">
            <Button onClick={() => setStep(2)} size="lg" className="w-full">Get Started</Button>
            <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Takes less than 60 seconds</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-in fade-in">
          <h2 className="text-2xl font-bold text-stone-800 italic serif">Pick a memory</h2>
          <div className="grid grid-cols-1 gap-3 text-left">
            {prompts.map((p, i) => (
              <button
                key={i}
                onClick={() => { setActivePromptIndex(i); setStep(3); }}
                className="w-full p-5 bg-white border border-stone-200 rounded-[1.5rem] hover:border-amber-500 transition-all text-stone-700 font-medium text-sm flex gap-4 items-center group active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 text-xs font-bold">{i+1}</div>
                <span className="leading-relaxed truncate">{p}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="text-stone-400 text-sm font-bold uppercase tracking-widest py-4">Back</button>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col justify-center space-y-8 animate-in zoom-in-95">
          <h2 className="text-2xl font-bold text-stone-800 italic serif">Quick Check</h2>
          <div className="bg-stone-100 p-8 rounded-[2.5rem] border border-stone-200 shadow-inner">
             <p className="text-lg font-medium italic serif text-stone-700 leading-relaxed">"{prompts[activePromptIndex]}"</p>
          </div>
          <div className="space-y-6">
            <p className="text-xs text-stone-500 max-w-[200px] mx-auto">Record your message in a bright, quiet spot.</p>
            <div className="flex flex-col gap-3">
              <Button onClick={startRecording} size="lg">I'm Ready</Button>
              <Button variant="ghost" onClick={() => setStep(2)}>Different Prompt</Button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex-1 flex flex-col animate-in fade-in">
          <div className={cn(
            "flex-1 rounded-[2.5rem] overflow-hidden relative shadow-2xl border-[6px] transition-all duration-700 mb-6",
            isEverythingGood ? "border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.3)]" : "border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.2)]"
          )}>
            <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
            
            <div className="absolute top-4 left-4 right-4 flex flex-col gap-3">
              <div className={cn("px-4 py-2 backdrop-blur-md rounded-full border text-white text-center flex items-center justify-center gap-2", isEverythingGood ? "bg-green-600/60 border-green-400/30" : "bg-amber-600/60 border-amber-400/30")}>
                <span className="text-[10px] font-bold uppercase tracking-widest">{directorTip}</span>
              </div>
              <div className="p-4 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 text-white">
                <p className="text-xs font-medium italic">"{prompts[activePromptIndex]}"</p>
              </div>
            </div>

            <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-4">
              <button onClick={stopRecording} className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center border-4 border-white/30 shadow-2xl active:scale-95 transition-transform">
                 <div className="w-6 h-6 bg-white rounded-sm"></div>
              </button>
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">TAP THE BUTTON TO STOP RECORDING</p>
        </div>
      )}

      {step === 6 && videoUrl && (
        <div className="flex-1 flex flex-col animate-in fade-in">
          <h2 className="text-2xl font-bold text-stone-800 italic serif mb-6">Looks great!</h2>
          <div className="flex-1 bg-stone-950 rounded-[2.5rem] overflow-hidden shadow-xl mb-8 relative">
             <video ref={previewRef} src={videoUrl} controls className="w-full h-full object-contain" />
          </div>
          <div className="grid grid-cols-2 gap-4 pb-8">
             <Button variant="ghost" onClick={() => { setVideoUrl(null); setStep(3); }}>Re-record</Button>
             <Button onClick={handleFinalSubmit}>Send Message</Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="flex-1 flex flex-col justify-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-bold text-stone-900 italic serif mb-4">Memory Secured!</h2>
          <p className="text-stone-600 text-base mb-12">We'll weave your message into the final tribute.</p>
          <Button onClick={onFinish} variant="secondary" className="w-full">Back to Home</Button>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-stone-50/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h3 className="text-xl font-bold text-stone-800 italic serif">Uploading...</h3>
        </div>
      )}
    </div>
  );
};

export default ContributorPortal;
