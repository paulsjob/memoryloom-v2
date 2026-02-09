
import React, { useState, useEffect } from 'react';
import { Project, StoryboardTheme } from '../types';
import { analyzeSubmissions } from '../services/geminiService';
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

  const renderSteps = [
    { title: "Analyzing semantic flow...", subtitle: "Identifying the emotional arcs in every clip." },
    { title: "Matching the rhythm...", subtitle: "Aligning transitions to the emotional beats of the music." },
    { title: "Color grading the story...", subtitle: "Adding a cinematic warmth to every contributor's clip." },
    { title: "Weaving the final Loom...", subtitle: "Final assembly of the tribute masterpiece." }
  ];

  useEffect(() => {
    let isMounted = true;
    
    async function runAnalysis() {
      // Failsafe timeout: If AI doesn't respond in 15s, stop loading
      const timeoutId = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 15000);

      try {
        const subs = project.contributors
          .filter(c => c.status === 'submitted')
          .map(c => ({ 
            name: c.name, 
            message: "They are an amazing person who always helped me during hard times. I remember when we hiked the Alps together." 
          }));
        
        const result = await analyzeSubmissions(
          project.title, 
          project.milestone, 
          subs.length > 0 ? subs : [{name: 'Family', message: 'The heart of our home.'}]
        );
        
        if (!isMounted) return;

        setAnalysis(result);
        if (result?.themes) {
          setStoryboard(result.themes.map((t: any, i: number) => ({
            id: `theme-${i}`,
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
        console.error("Storyboard generation failed", err);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setLoading(false);
      }
    }
    
    runAnalysis();
    return () => { isMounted = false; };
  }, [project]);

  const handleFinalRender = () => {
    setRendering(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= renderSteps.length) {
        clearInterval(interval);
        setRendering(false);
        setIsMasterpiece(true);
      } else {
        setRenderStep(step);
      }
    }, 1500);
  };

  const toggleTheme = (id: string) => {
    setStoryboard(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newStoryboard = [...storyboard];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newStoryboard.length) return;
    
    [newStoryboard[index], newStoryboard[newIndex]] = [newStoryboard[newIndex], newStoryboard[index]];
    setStoryboard(newStoryboard);
  };

  if (loading) {
    return <LoadingScreen title="Analyzing memories..." subtitle="Finding the emotional beats in your contributors' messages." />;
  }

  if (rendering) {
    return <LoadingScreen title={renderSteps[renderStep].title} subtitle={renderSteps[renderStep].subtitle} />;
  }

  if (isMasterpiece) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in duration-1000">
        <div className="text-center mb-12">
           <span className="text-xs font-bold uppercase tracking-[0.3em] text-amber-500 mb-4 block">A MemoryLoom Original</span>
           <h1 className="text-5xl md:text-6xl font-bold text-stone-900 italic serif mb-4">{project.recipientName}: The Tribute</h1>
           <p className="text-stone-500 text-lg">Created with love by {project.contributors.length} people</p>
        </div>

        <div className="aspect-video bg-stone-950 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-8 border-white overflow-hidden relative group mb-12">
           <img src="https://picsum.photos/seed/render/1200/800" className="w-full h-full object-cover opacity-70" alt="Final Film" />
           <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-stone-900 fill-current ml-2" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </button>
           </div>
           <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
              <div className="space-y-1">
                 <p className="text-white font-bold text-sm tracking-widest uppercase">Now Playing</p>
                 <p className="text-white/60 text-xs font-medium">Loom Edit: {project.theme}</p>
              </div>
              <div className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">4K Cinematic Master</div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center">
           <Button variant="secondary" size="lg" className="px-12 bg-stone-900">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             Download Film
           </Button>
           <Button size="lg" className="px-12 bg-amber-500 shadow-amber-200 shadow-xl">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
             Share with {project.recipientName}
           </Button>
           <Button variant="ghost" size="lg" onClick={() => setIsMasterpiece(false)}>
             Back to Director's View
           </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <button onClick={onBack} className="text-stone-400 flex items-center gap-2 font-medium hover:text-stone-800 transition-colors mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <h1 className="text-4xl font-bold text-stone-900 italic serif">Director’s View</h1>
          <p className="text-stone-500 mt-2">Arrange the narrative flow of {project.recipientName}'s tribute.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Button onClick={handleFinalRender} size="lg" className="flex-1 md:flex-none shadow-xl shadow-amber-200" disabled={storyboard.filter(t => t.isPinned).length === 0}>Produce Final Film</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Storyboard Workspace */}
        <div className="lg:col-span-8">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold italic serif text-stone-800">The Narrative Arc</h3>
              <div className="flex items-center gap-4 text-xs font-bold text-stone-400 uppercase tracking-widest">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-stone-200"></div> Draft</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Climax</span>
              </div>
           </div>

           {storyboard.length === 0 ? (
             <div className="bg-white border-2 border-dashed border-stone-200 rounded-[3rem] p-16 text-center">
                <p className="text-stone-400 font-medium">We couldn't automatically generate a storyboard. Try toggling segments on or adding more clips.</p>
             </div>
           ) : (
             <div className="space-y-6">
                {storyboard.map((t, i) => (
                  <div 
                    key={t.id} 
                    className={cn(
                      "group relative bg-white border-2 rounded-[2.5rem] p-8 transition-all duration-500 hover:rotate-[0.5deg]",
                      t.isPinned ? "border-stone-200 shadow-sm opacity-100" : "border-stone-100 opacity-40 grayscale blur-[1px]",
                      t.isClimax && t.isPinned && "border-amber-400 ring-4 ring-amber-50"
                    )}
                  >
                    <div className="flex items-start gap-8">
                       <div className="flex flex-col items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-sm font-bold transition-all duration-500",
                            t.isPinned ? (t.isClimax ? "bg-amber-500 text-white shadow-lg" : "bg-stone-900 text-white shadow-lg") : "bg-stone-100 text-stone-400"
                          )}>
                            {i + 1}
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => moveItem(i, 'up')} disabled={i === 0} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 disabled:opacity-0"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                             <button onClick={() => moveItem(i, 'down')} disabled={i === storyboard.length - 1} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 disabled:opacity-0"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                          </div>
                       </div>

                       <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest",
                                    t.isClimax ? "bg-amber-100 text-amber-600" : "bg-indigo-50 text-indigo-600"
                                  )}>
                                    {t.emotionalBeat}
                                  </span>
                                  {t.isClimax && <span className="text-amber-500"><svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>}
                                </div>
                                <h4 className="text-2xl font-bold text-stone-800">{t.themeName}</h4>
                             </div>
                             <button onClick={() => toggleTheme(t.id)} className="p-2 text-stone-300 hover:text-stone-600 transition-colors">
                                {t.isPinned ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                             </button>
                          </div>
                          
                          <p className="text-sm text-stone-500 italic mb-6 leading-relaxed">AI Suggestion: {t.suggestedTransition}</p>
                          
                          <div className="flex flex-wrap gap-3">
                             {t.contributors.map((c, j) => (
                               <div key={j} className="flex items-center gap-3 bg-stone-50 px-4 py-3 rounded-2xl border border-stone-100 shadow-sm group/clip">
                                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-500 group-hover/clip:bg-amber-100 group-hover/clip:text-amber-600 transition-colors">
                                    {c[0]}
                                  </div>
                                  <span className="text-xs font-bold text-stone-700">{c}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 sticky top-32 space-y-8">
           <div className="bg-white p-8 rounded-[3rem] border border-stone-200 shadow-sm">
              <h4 className="font-bold text-stone-800 mb-8 text-xl italic serif">Director’s Brief</h4>
              
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4 italic">Narrative Arc</label>
                  <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="font-bold text-stone-800 text-sm">{analysis?.tone || 'Gathering Sentiment...'}</span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed italic">"{analysis?.closingSentiment || 'Waiting for clips to craft the final message.'}"</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4 italic">Soundtrack</label>
                  <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                     </div>
                     <div>
                       <span className="font-bold text-stone-800 block text-sm">{analysis?.musicGenre || 'Matching Tempo...'}</span>
                       <span className="text-[10px] text-stone-400 font-bold uppercase">Dynamic Mix</span>
                     </div>
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-amber-50 border border-amber-100 p-8 rounded-[3rem]">
              <h5 className="font-bold text-amber-900 mb-2">Pro-Tip</h5>
              <p className="text-xs text-amber-800 leading-relaxed">
                {storyboard.length > 0 
                  ? `The AI identified ${storyboard.find(t => t.isClimax)?.themeName || 'a key moment'} as the emotional climax. Keeping this segment toward the end creates the strongest impact.`
                  : "Collect at least 5 clips for our AI to identify the best emotional climax for your tribute."}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
