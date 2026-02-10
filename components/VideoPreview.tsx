
import React, { useState, useEffect, useRef } from 'react';
import { Project, StoryboardTheme } from '../types';
import { analyzeSubmissions, reorderStoryboard, Submission } from '../services/geminiService';
import { Button } from './ui/Button';
import { LoadingScreen } from './ui/LoadingScreen';
import { cn } from '../lib/utils';

interface VideoPreviewProps {
  project: Project;
  isAiEnabled: boolean;
  onConnectAi: () => void;
  onBack: () => void;
  onError?: (error: any) => void;
  // Added addToast to props definition
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ 
  project, 
  isAiEnabled, 
  onConnectAi, 
  onBack, 
  onError,
  addToast 
}) => {
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [renderStep, setRenderStep] = useState(0);
  const [isMasterpiece, setIsMasterpiece] = useState(false);
  const [storyboard, setStoryboard] = useState<StoryboardTheme[]>([]);
  
  const [directorInput, setDirectorInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const renderSteps = [
    { title: "Analyzing semantic flow...", subtitle: "Identifying emotional arcs." },
    { title: "Matching the rhythm...", subtitle: "Aligning to the score." },
    { title: "Color grading...", subtitle: "Applying cinematic warmth." },
    { title: "Final Assembly...", subtitle: "Weaving the masterpiece." }
  ];

  useEffect(() => {
    let isMounted = true;
    async function initSequence() {
      if (project.storyboard) {
        setStoryboard(project.storyboard);
        setLoading(false);
        return;
      }

      try {
        const subs: Submission[] = [
          ...project.contributors.filter(c => c.status === 'submitted').map(c => ({ 
            id: c.memories[0]?.id || c.id, 
            name: c.name, 
            message: "Heartfelt testimony.", 
            type: 'testimony' 
          })),
          ...project.communityAssets.map(a => ({
            id: a.id,
            name: a.contributorName,
            message: a.description,
            type: a.type
          }))
        ];
        
        const result = await analyzeSubmissions(project.title, project.milestone, subs);
        if (!isMounted) return;
        
        if (result?.themes) {
          const newStoryboard = result.themes.map((t: any, i: number): StoryboardTheme => {
            const contributor = project.contributors.find(c => c.memories[0]?.id === t.assetId);
            const asset = project.communityAssets.find(a => a.id === t.assetId);
            const videoUrl = contributor ? contributor.memories[0]?.url : (asset?.url);
            const contributorName = contributor ? contributor.name : (asset?.contributorName);

            return {
              id: `theme-${i}-${Date.now()}`,
              themeName: t.themeName,
              contributors: t.contributors,
              suggestedTransition: t.suggestedTransition,
              isPinned: true,
              order: i,
              emotionalBeat: t.emotionalBeat || 'Narrative Segment',
              isClimax: t.isClimax,
              videoUrl: videoUrl,
              contributorName: contributorName,
              assetId: t.assetId,
              assetType: contributor ? 'video' : (asset?.type)
            };
          });
          setStoryboard(newStoryboard);
        }
      } catch (err) { 
        if (onError) onError(err);
      } finally { if (isMounted) setLoading(false); }
    }
    initSequence();
    return () => { isMounted = false; };
  }, [project, onError]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => setIsPlaying(false));
      else videoRef.current.pause();
    }
  }, [isPlaying, currentClipIndex]);

  const onTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
      if (p >= 99) {
        setCurrentClipIndex(curr => (curr + 1) % Math.max(storyboard.length, 1));
        setProgress(0);
      }
    }
  };

  const handleDirectorChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directorInput.trim() || !isAiEnabled) return;
    setIsChatting(true);
    try {
      const updated = await reorderStoryboard(storyboard, directorInput);
      if (updated) {
        setStoryboard(updated.map((t, i) => ({ ...t, order: i, isPinned: true })));
        setDirectorInput("");
        // Fixed: Use addToast passed from props
        addToast("Narrative Re-Woven!", "success");
      }
    } catch (err) {
      if (onError) onError(err);
    } finally { setIsChatting(false); }
  };

  const handleFinalRender = () => {
    setRendering(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= renderSteps.length) { clearInterval(interval); setRendering(false); setIsMasterpiece(true); } else { setRenderStep(step); }
    }, 1500);
  };

  const currentClip = storyboard[currentClipIndex];

  if (loading) return <LoadingScreen title="Assembling Narrative..." subtitle="Preparing the Director's Preview." />;
  if (rendering) return <LoadingScreen title={renderSteps[renderStep].title} subtitle={renderSteps[renderStep].subtitle} />;

  if (isMasterpiece) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 text-center animate-in fade-in duration-1000">
        <h1 className="text-4xl md:text-6xl font-bold italic serif mb-6">{project.recipientName}: The Tribute</h1>
        <div className="aspect-video bg-stone-900 rounded-[4rem] overflow-hidden mb-8 shadow-2xl relative border-[12px] border-white group">
          <img src={`https://picsum.photos/seed/${project.id}/1200/800`} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[10s]" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full flex items-center justify-center shadow-2xl text-white hover:scale-110 transition-transform"><svg className="h-10 w-10 ml-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <Button size="lg" className="px-12 bg-stone-900">Download Master</Button>
          <Button variant="ghost" size="lg" className="px-12" onClick={() => setIsMasterpiece(false)}>Back to Director</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <button onClick={onBack} className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2 hover:text-stone-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7 7-7" /></svg>
            Back to Hub
          </button>
          <h1 className="text-4xl font-bold italic serif">The Director's Suite</h1>
        </div>
        <Button onClick={handleFinalRender} disabled={storyboard.length === 0} className="rounded-2xl px-8 py-4 shadow-xl">Produce Final Film</Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
           {/* Player */}
           <div className="relative aspect-video bg-stone-950 rounded-[3rem] overflow-hidden shadow-2xl border-[6px] border-white group">
              {currentClip?.videoUrl && (
                <video ref={videoRef} src={currentClip.videoUrl} onTimeUpdate={onTimeUpdate} className="w-full h-full object-cover opacity-80" playsInline />
              )}
              
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-12 pointer-events-none group-hover:opacity-100 transition-opacity">
                {currentClip ? (
                  <div className="animate-in fade-in duration-700">
                    <span className="text-amber-500 font-bold text-[10px] uppercase tracking-widest block mb-4 italic">
                      {isAiEnabled ? '✨ AI Intelligence Active' : 'Standard Heuristic Sequencing'}
                    </span>
                    <h2 className="text-4xl md:text-5xl text-white font-bold italic serif mb-4 drop-shadow-lg">{currentClip.themeName}</h2>
                    <p className="text-white/60 text-xs font-bold tracking-[0.3em] uppercase">{currentClip.emotionalBeat}</p>
                  </div>
                ) : (
                  <p className="text-stone-600">Sequencing narrative threads...</p>
                )}
              </div>
              
              <div className="absolute bottom-10 inset-x-12 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all">
                 <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 bg-white/10 backdrop-blur-2xl rounded-full flex items-center justify-center text-white border border-white/20">
                   {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                 </button>
                 <div className="bg-black/40 px-6 py-2 rounded-full text-[10px] font-mono text-white border border-white/10">
                    {String(currentClipIndex + 1).padStart(2, '0')} / {storyboard.length} • {Math.floor(progress)}%
                 </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/10"><div className="h-full bg-amber-500 transition-all duration-300 shadow-[0_0_15px_#f59e0b]" style={{ width: `${progress}%` }} /></div>
           </div>

           {/* Timeline */}
           <div className="space-y-6">
              <h3 className="text-2xl font-bold italic serif text-stone-800">Narrative Arc</h3>
              <div className="space-y-4">
                {storyboard.map((t, i) => (
                  <div key={t.id} className={cn("p-6 rounded-[2rem] border-2 transition-all flex items-center gap-8 group cursor-pointer", currentClipIndex === i ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-white border-white hover:border-stone-100 shadow-sm")}>
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0", currentClipIndex === i ? "bg-amber-500 text-white" : "bg-stone-900 text-white")}>{i + 1}</div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 italic">{t.emotionalBeat}</p>
                        <h4 className="font-bold text-lg text-stone-800">{t.themeName}</h4>
                        <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Featuring {t.contributorName || 'Family'}</p>
                    </div>
                    {t.assetType === 'audio' && <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>}
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* AI Integration Card */}
        <div className="lg:col-span-4 space-y-10">
           <div className={cn("rounded-[3rem] p-10 transition-all shadow-2xl relative overflow-hidden", isAiEnabled ? "bg-stone-900 text-white" : "bg-white border-4 border-dashed border-stone-100")}>
              <div className="relative z-10">
                <h4 className="font-bold italic serif text-2xl mb-4">Director Chat</h4>
                {isAiEnabled ? (
                  <form onSubmit={handleDirectorChat} className="space-y-6">
                    <p className="text-stone-400 text-sm italic">Edit the narrative arc with natural language.</p>
                    <textarea value={directorInput} onChange={e => setDirectorInput(e.target.value)} placeholder="e.g. 'Start with Michael's wishes and end with a climax'" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-stone-200 outline-none h-32 resize-none focus:ring-1 focus:ring-amber-500" />
                    <Button type="submit" className="w-full bg-amber-500 text-stone-900 py-4" disabled={isChatting || !directorInput.trim()}>{isChatting ? 'Re-weaving...' : 'Update Narrative'}</Button>
                  </form>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-stone-500 mb-8 leading-relaxed">Connect a Narrative Engine to enable real-time natural language editing.</p>
                    <Button variant="ghost" className="w-full border-stone-900 rounded-2xl" onClick={onConnectAi}>Unlock Engine</Button>
                  </div>
                )}
              </div>
           </div>

           <div className="bg-white rounded-[3rem] p-10 border shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-8 italic">Director's Notes</h4>
              <div className="space-y-6">
                 <div className="flex justify-between items-center text-xs"><span className="font-bold text-stone-800">Tempo</span><span className="text-stone-500">120 BPM</span></div>
                 <div className="flex justify-between items-center text-xs"><span className="font-bold text-stone-800">Color Profile</span><span className="text-stone-500 italic">Cinematic Gold</span></div>
                 <div className="flex justify-between items-center text-xs"><span className="font-bold text-stone-800">Transitions</span><span className="text-stone-500 italic">Cross dissolve</span></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
