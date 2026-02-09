
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

  // Simulate environment analysis
  useEffect(() => {
    if (isRecording || step === 4) {
      const interval = setInterval(() => {
        setQualityScore({
          light: Math.random() > 0.2 ? 1 : 0,
          sound: Math.random() > 0.3 ? 1 : 0,
          frame: 1
        });
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

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
    } catch (err) {
      alert("We need camera access to record!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsUploading(true);
    await storage.uploadMemory(new File([], "message.webm"));
    setIsUploading(false);
    setStep(5);
  };

  const isEverythingGood = qualityScore.light && qualityScore.sound && qualityScore.frame;

  return (
    <div className="max-w-xl mx-auto px-6 py-12 md:py-20 text-center">
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-stone-900 leading-tight">
            Help us celebrate <br /><span className="text-amber-600 italic serif">{project.recipientName}</span>!
          </h1>
          <p className="text-stone-600 text-lg">
            We're creating a surprise tribute for {project.recipientName}'s {project.milestone}. 
          </p>
          <Button onClick={() => setStep(2)} size="lg" className="w-full">Get Started</Button>
          <p className="text-xs text-stone-400">Takes less than 60 seconds.</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-in fade-in">
          <h2 className="text-2xl font-bold text-stone-800 italic serif">Choose a memory to share</h2>
          <div className="space-y-3 text-left">
            {prompts.map((p, i) => (
              <button
                key={i}
                onClick={() => { setActivePromptIndex(i); setStep(3); }}
                className="w-full p-6 bg-white border border-stone-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all text-stone-700 font-medium text-sm flex gap-4 items-center group"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 group-hover:bg-amber-100 group-hover:text-amber-600 flex items-center justify-center shrink-0 text-xs font-bold transition-colors">{i+1}</div>
                <span className="leading-relaxed">{p}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="text-stone-400 text-sm font-medium hover:text-stone-600 underline underline-offset-4">Back</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8 animate-in zoom-in-95 duration-300">
          <h2 className="text-2xl font-bold text-stone-800">Recording Tips</h2>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-white border border-stone-200 rounded-2xl text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1 italic">Light</p>
                <p className="text-sm text-stone-600">Find a window and face towards the light.</p>
             </div>
             <div className="p-4 bg-white border border-stone-200 rounded-2xl text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1 italic">Sound</p>
                <p className="text-sm text-stone-600">Avoid noisy rooms or background music.</p>
             </div>
          </div>
          <div className="bg-stone-100 p-8 rounded-3xl border border-stone-200">
             <p className="text-lg font-medium italic serif text-stone-700 leading-relaxed">"{prompts[activePromptIndex]}"</p>
          </div>
          <div className="flex flex-col gap-4">
            <Button onClick={startRecording} size="lg">I'm Ready</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>Choose Different Prompt</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 relative max-w-lg mx-auto animate-in fade-in">
          {/* Subtle Glow Guardrail */}
          <div className={cn(
            "aspect-[3/4] rounded-[2.5rem] overflow-hidden relative shadow-2xl border-[6px] transition-all duration-1000",
            isEverythingGood ? "border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.3)]" : "border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.2)]"
          )}>
            <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover grayscale-[10%]" />
            
            {/* Dynamic Director HUD */}
            <div className="absolute top-6 left-6 right-6 flex flex-col gap-3">
              <div className={cn(
                "px-4 py-2 backdrop-blur-md rounded-full border text-white flex items-center justify-center gap-2 transition-all duration-500",
                isEverythingGood ? "bg-green-600/60 border-green-400/30" : "bg-amber-600/60 border-amber-400/30"
              )}>
                <div className={cn("w-2 h-2 rounded-full animate-pulse", isEverythingGood ? "bg-white" : "bg-amber-100")}></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">{directorTip}</span>
              </div>
              
              <div className="px-6 py-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/20 text-white text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1 italic">Speaking Point</p>
                <p className="text-sm font-medium leading-relaxed italic">"{prompts[activePromptIndex]}"</p>
              </div>
            </div>

            <div className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-4">
              <p className="text-white text-[10px] font-bold uppercase tracking-widest bg-red-600 px-3 py-1 rounded-full animate-pulse">Recording Live</p>
              <button onClick={stopRecording} className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center border-4 border-white/30 hover:scale-110 transition-transform shadow-2xl group">
                 <div className="w-8 h-8 bg-white rounded-sm group-hover:rounded-lg transition-all"></div>
              </button>
            </div>
          </div>
          
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex flex-col items-center gap-1">
               <div className={cn("w-2 h-2 rounded-full", qualityScore.light ? "bg-green-500 shadow-[0_0_10px_green]" : "bg-stone-300")}></div>
               <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">Lighting</span>
            </div>
            <div className="flex flex-col items-center gap-1">
               <div className={cn("w-2 h-2 rounded-full", qualityScore.sound ? "bg-green-500 shadow-[0_0_10px_green]" : "bg-stone-300")}></div>
               <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">Audio</span>
            </div>
          </div>
        </div>
      )}

      {step === 6 && videoUrl && (
        <div className="space-y-8 animate-in fade-in">
          <h2 className="text-3xl font-bold text-stone-800 italic serif">Beautifully done.</h2>
          <p className="text-stone-500">Take a quick look to make sure you're happy with it.</p>
          <div className="aspect-[3/4] bg-stone-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative max-w-lg mx-auto border-4 border-white">
             <video ref={previewRef} src={videoUrl} controls className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Button variant="ghost" onClick={() => { setVideoUrl(null); setStep(3); }}>Record Again</Button>
             <Button onClick={handleFinalSubmit} className="shadow-amber-200 shadow-xl">Submit Memory</Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-8 animate-in zoom-in-95">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-green-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-stone-900 italic serif">Sent with love.</h2>
          <p className="text-stone-600 text-lg max-w-sm mx-auto leading-relaxed mb-12">We'll weave your message into {project.recipientName}'s tribute. They are going to love it.</p>
          
          <div className="bg-stone-100 p-8 rounded-[3rem] border border-stone-200 text-left space-y-4">
             <h4 className="font-bold text-stone-800">Pass the Torch</h4>
             <p className="text-sm text-stone-600">Know someone else who should be in this video? Send them the link to help the organizer out!</p>
             <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="flex-1" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Magic Link copied! Send it to a friend.");
                }}>Copy Invite Link</Button>
                <Button size="sm" className="flex-1">Share via WhatsApp</Button>
             </div>
          </div>

          <div className="pt-8">
            <Button onClick={onFinish} variant="secondary">Back to Home</Button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-stone-50/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="relative mb-8">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-stone-800 italic serif mb-2">Saving your memory...</h3>
          <p className="text-stone-500">Securing your message in the Loom.</p>
        </div>
      )}
    </div>
  );
};

export default ContributorPortal;
