
import React, { useState, useEffect, useRef } from 'react';
import { Project, StoryboardTheme } from '../types';
import { analyzeSubmissions, reorderStoryboard } from '../services/geminiService';
import { Button } from './ui/Button';
import { LoadingScreen } from './ui/LoadingScreen';
import { cn } from '../lib/utils';

interface VideoPreviewProps {
  project: Project;
  onBack: () => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ project, onBack }) => {
  const [analysis, setAnalysis] = useState<any>(null);
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
  const playerTimerRef = useRef<number | null>(null);

  const renderSteps = [
    { title: "Analyzing semantic flow...", subtitle: "Identifying emotional arcs." },
    { title: "Matching the rhythm...", subtitle: "Aligning to the score." },
    { title: "Color grading...", subtitle: "Applying cinematic warmth." },
    { title: "Final Assembly...", subtitle: "Weaving the masterpiece." }
  ];

  useEffect(() => {
    let isMounted = true;
    async function runAnalysis() {
      try {
        const subs = project.contributors
          .filter(c => c.status === 'submitted')
          .map(c => ({ name: c.name, message: "They are amazing." }));
        const result = await analyzeSubmissions(project.title, project.milestone, subs.length > 0 ? subs : [{name: 'Family', message: 'Heart of our home.'}]);
        if (!isMounted) return;
        setAnalysis(result);
        if (result?.themes) {
          setStoryboard(result.themes.map((t: any, i: number) => ({
            id: `theme-${i}-${Date.now()}`,
            themeName: t.themeName,
            contributors: t.contributors,
            suggestedTransition: t.suggestedTransition,
            isPinned: true,
            order: i,
            emotionalBeat: t.emotionalBeat || 'Narrative Segment',
            isClimax: t.isClimax
          })));
        }
      } catch (err) { console.error(err); } finally { if (isMounted) setLoading(false); }
    }
    runAnalysis();
    return () => { isMounted = false; };
  }, [project]);

  useEffect(() => {
    if (isPlaying) {
      playerTimerRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setCurrentClipIndex(curr => (curr + 1) % Math.max(storyboard.length, 1));
            return 0;
          }
          return prev + 1;
        });
      }, 50);
    } else if (playerTimerRef.current) clearInterval(playerTimerRef.current);
    return () => { if (playerTimerRef.current) clearInterval(playerTimerRef.current); };
  }, [isPlaying, storyboard.length]);

  const handleDirectorChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directorInput.trim()) return;
    setIsChatting(true);
    const updated = await reorderStoryboard(storyboard, directorInput);
    if (updated) {
      setStoryboard(updated.map((t, i) => ({ ...t, order: i, isPinned: true })));
      setDirectorInput("");
    }
    setIsChatting(false);
  };

  const handleFinalRender = () => {
    setRendering(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= renderSteps.length) { clearInterval(interval); setRendering(false); setIsMasterpiece(true); } else { setRenderStep(step); }
    }, 1500);
  };

  const toggleTheme = (id: string) => {
    setStoryboard(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
  };

  const activeStoryboard = storyboard.filter(t => t.isPinned);
  const currentClip = activeStoryboard[currentClipIndex];

  if (loading) return <LoadingScreen title="Analyzing..." subtitle="Finding the emotional beats." />;
  if (rendering) return <LoadingScreen title={renderSteps[renderStep].title} subtitle={renderSteps[renderStep].subtitle} />;

  if (isMasterpiece) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 animate-in fade-in duration-1000 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500 mb-4 block">A MemoryLoom Original</span>
        <h1 className="text-4xl md:text-6xl font-bold text-stone-900 italic serif mb-6">{project.recipientName}: The Tribute</h1>
        <div className="aspect-video bg-stone-950 rounded-[2rem] md:rounded-[3rem] shadow-2xl border-4 md:border-8 border-white overflow-hidden relative mb-10">
           <img src={`https://picsum.photos/seed/${project.id}/1200/800`} className="w-full h-full object-cover opacity-60" />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-2xl"><svg className="h-10 w-10 text-stone-900 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
           </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
           <Button variant="secondary" size="lg" className="w-full sm:w-auto">Download Film</Button>
           <Button variant="ghost" size="lg" onClick={() => setIsMasterpiece(false)} className="w-full sm:w-auto">Back to Edit</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-6">
        <div>
          <button onClick={onBack} className="text-stone-400 flex items-center gap-2 font-bold text-xs uppercase tracking-widest hover:text-stone-800 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7 7-7" /></svg>
            Dashboard
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 italic serif leading-tight">Director’s View</h1>
        </div>
        <Button onClick={handleFinalRender} className="w-full md:w-auto" disabled={activeStoryboard.length === 0}>Produce Final Film</Button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-8 space-y-8 md:space-y-12 w-full">
           {/* Responsive Player */}
           <div className="relative aspect-video bg-stone-900 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border-2 md:border-4 border-stone-800">
              <div className="absolute inset-0">
                {activeStoryboard.length > 0 ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                     <img src={`https://picsum.photos/seed/${currentClip?.id}/800/600?grayscale&blur=2`} className="absolute inset-0 w-full h-full object-cover opacity-20" />
                     <div className="relative z-10 text-center px-6 md:px-12">
                        <span className="text-amber-400 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[10px] mb-2 block">
                           Act {currentClipIndex + 1} • {currentClip?.emotionalBeat}
                        </span>
                        <h2 className="text-xl md:text-4xl font-bold text-white italic serif mb-4 drop-shadow-md">
                           {currentClip?.themeName}
                        </h2>
                        <div className="flex justify-center flex-wrap gap-1">
                           {currentClip?.contributors.slice(0, 3).map((c, i) => (
                             <span key={i} className="px-2 py-0.5 bg-white/10 rounded-full text-white/70 text-[8px] font-bold border border-white/10">{c}</span>
                           ))}
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-600 text-sm">No segments selected</div>
                )}
              </div>

              {/* Mobile-Friendly HUD */}
              <div className="absolute bottom-3 inset-x-4 md:bottom-4 md:inset-x-8 flex justify-between items-center z-20">
                 <div className="flex gap-2">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 md:w-12 md:h-12 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full flex items-center justify-center text-white">
                      {isPlaying ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 8h2v4H7V8zm4 0h2v4h-2V8z"/></svg> : <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.5 7l5 3-5 3V7z"/></svg>}
                    </button>
                 </div>
                 <div className="text-[10px] font-mono text-white/50">{String(currentClipIndex + 1).padStart(2, '0')}:{String(Math.floor(progress)).padStart(2, '0')}</div>
              </div>
           </div>

           {/* Storyboard List */}
           <div className="space-y-4">
              <h3 className="text-xl font-bold italic serif text-stone-800 px-1">Narrative Sequence</h3>
              {storyboard.map((t, i) => (
                <div key={t.id} className={cn("bg-white border-2 rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 transition-all", t.isPinned ? "border-stone-200" : "border-stone-100 opacity-50")}>
                  <div className="flex items-start gap-4 md:gap-8">
                     <div className={cn("w-8 h-8 md:w-12 md:h-12 rounded-[0.75rem] md:rounded-[1.25rem] flex items-center justify-center text-xs md:text-sm font-bold shrink-0", t.isPinned ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-400")}>{i + 1}</div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                           <div className="min-w-0">
                              <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-stone-400 block mb-1">{t.emotionalBeat}</span>
                              <h4 className="text-lg md:text-2xl font-bold text-stone-800 truncate">{t.themeName}</h4>
                           </div>
                           <button onClick={() => toggleTheme(t.id)} className="p-2 text-stone-300 hover:text-stone-600"><svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/></svg></button>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Floating Sidebar on mobile / Sticky on Desktop */}
        <div className="w-full lg:col-span-4 lg:sticky lg:top-32 space-y-6">
           <div className="bg-stone-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 text-white shadow-2xl">
              <h4 className="font-bold text-lg italic serif mb-4">Director Chat</h4>
              <form onSubmit={handleDirectorChat} className="space-y-4">
                 <textarea value={directorInput} onChange={e => setDirectorInput(e.target.value)} placeholder="e.g. 'Start with the hiking stories'..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-stone-200 outline-none focus:ring-2 focus:ring-amber-500 h-24 md:h-32 resize-none" />
                 <Button type="submit" disabled={isChatting || !directorInput.trim()} className="w-full bg-amber-500 text-stone-900">Adjust Order</Button>
              </form>
           </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
