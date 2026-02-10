
import React, { useState, useEffect, useRef } from 'react';
import { Project, StoryboardTheme } from '../types';
import { analyzeSubmissions, reorderStoryboard } from '../services/geminiService';
import { Button } from './ui/Button';
import { LoadingScreen } from './ui/LoadingScreen';
import { cn } from '../lib/utils';

interface VideoPreviewProps {
  project: Project;
  isAiEnabled: boolean;
  onConnectAi: () => void;
  onBack: () => void;
  onError?: (error: any) => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ project, isAiEnabled, onConnectAi, onBack, onError }) => {
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
        
        // analyzeSubmissions now has fallbacks for No-AI state
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
      } catch (err) { 
        if (onError) onError(err);
      } finally { if (isMounted) setLoading(false); }
    }
    runAnalysis();
    return () => { isMounted = false; };
  }, [project, onError]);

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
    if (!directorInput.trim() || !isAiEnabled) return;
    setIsChatting(true);
    try {
      const updated = await reorderStoryboard(storyboard, directorInput);
      if (updated) {
        setStoryboard(updated.map((t, i) => ({ ...t, order: i, isPinned: true })));
        setDirectorInput("");
      }
    } catch (err) {
      if (onError) onError(err);
    } finally {
      setIsChatting(false);
    }
  };

  const handleFinalRender = () => {
    setRendering(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= renderSteps.length) { clearInterval(interval); setRendering(false); setIsMasterpiece(true); } else { setRenderStep(step); }
    }, 1500);
  };

  const activeStoryboard = storyboard.filter(t => t.isPinned);
  const currentClip = activeStoryboard[currentClipIndex];

  if (loading) return <LoadingScreen title="Assembling Preview..." subtitle="Preparing your project for review." />;
  if (rendering) return <LoadingScreen title={renderSteps[renderStep].title} subtitle={renderSteps[renderStep].subtitle} />;

  if (isMasterpiece) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 text-center animate-in fade-in duration-1000">
        <h1 className="text-4xl md:text-6xl font-bold italic serif mb-6">{project.recipientName}: The Tribute</h1>
        <div className="aspect-video bg-stone-900 rounded-[3rem] overflow-hidden mb-8 shadow-2xl relative border-8 border-white">
          <img src={`https://picsum.photos/seed/${project.id}/1200/800`} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl"><svg className="h-8 w-8 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.5 7l5 3-5 3V7z"/></svg></div>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <Button variant="secondary" size="lg">Download Master</Button>
          <Button variant="ghost" size="lg" onClick={() => setIsMasterpiece(false)}>Back to Director</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <button onClick={onBack} className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7 7-7" /></svg>
            Back to Hub
          </button>
          <h1 className="text-4xl font-bold italic serif">The Director's Suite</h1>
        </div>
        <Button onClick={handleFinalRender} disabled={activeStoryboard.length === 0}>Produce Final Film</Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
           {/* Player */}
           <div className="relative aspect-video bg-stone-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-stone-800">
              <div className="absolute inset-0 flex items-center justify-center text-center px-12">
                {currentClip ? (
                  <div className="animate-in fade-in duration-700">
                    <span className="text-amber-500 font-bold text-[10px] uppercase tracking-widest block mb-4 italic">
                      {isAiEnabled ? '✨ AI Intelligence Active' : 'Standard Heuristic Sequencing'}
                    </span>
                    <h2 className="text-4xl text-white font-bold italic serif mb-4">{currentClip.themeName}</h2>
                    <p className="text-white/50 text-xs font-bold tracking-widest uppercase">{currentClip.emotionalBeat}</p>
                  </div>
                ) : (
                  <p className="text-stone-600">No clips in current timeline</p>
                )}
              </div>
              
              <div className="absolute bottom-6 inset-x-8 flex justify-between items-center">
                 <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center text-white">
                   {isPlaying ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8h2v4H7V8zm4 0h2v4h-2V8z"/></svg> : <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.5 7l5 3-5 3V7z"/></svg>}
                 </button>
                 <div className="text-[10px] font-mono text-white/40">{String(currentClipIndex + 1).padStart(2, '0')}:{String(Math.floor(progress)).padStart(2, '0')}</div>
              </div>
           </div>

           {/* Timeline */}
           <div className="space-y-4">
              <h3 className="text-xl font-bold italic serif text-stone-800">Narrative Arc</h3>
              {storyboard.map((t, i) => (
                <div key={t.id} className="p-6 bg-white rounded-3xl border border-stone-100 flex items-center gap-6 shadow-sm">
                   <div className="w-10 h-10 bg-stone-900 text-white rounded-2xl flex items-center justify-center font-bold text-xs">{i + 1}</div>
                   <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.emotionalBeat}</p>
                      <h4 className="font-bold text-lg">{t.themeName}</h4>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* AI Integration Card */}
        <div className="lg:col-span-4 space-y-6">
           <div className={cn(
             "rounded-[3rem] p-8 transition-all",
             isAiEnabled ? "bg-stone-900 text-white shadow-2xl" : "bg-white border-2 border-dashed border-stone-200 text-stone-900"
           )}>
              <h4 className="font-bold italic serif text-xl mb-4">Director Chat</h4>
              {isAiEnabled ? (
                <form onSubmit={handleDirectorChat} className="space-y-4">
                   <textarea 
                     value={directorInput} 
                     onChange={e => setDirectorInput(e.target.value)} 
                     placeholder="e.g. 'Start with the funny stories'" 
                     className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-stone-200 outline-none h-32 resize-none" 
                   />
                   <Button type="submit" className="w-full bg-amber-500 text-stone-900" disabled={isChatting || !directorInput.trim()}>Re-weave Arc</Button>
                </form>
              ) : (
                <div className="text-center py-6">
                   <p className="text-sm text-stone-500 mb-6">Connect a Narrative Engine to enable real-time natural language editing.</p>
                   <Button variant="ghost" className="w-full border-stone-900" onClick={onConnectAi}>Unlock Engine</Button>
                </div>
              )}
           </div>

           <div className="bg-stone-50 rounded-[3rem] p-8 border">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-6 italic">Director's Notes</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">Tempo</span>
                    <span className="text-stone-500">120 BPM</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">Color Profile</span>
                    <span className="text-stone-500 italic">Cinematic Gold</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">Transitions</span>
                    <span className="text-stone-500 italic">{analysis?.themes[0]?.suggestedTransition || 'Fade'}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
