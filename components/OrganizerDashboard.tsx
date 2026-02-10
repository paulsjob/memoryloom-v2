
import React, { useState, useEffect, useRef } from 'react';
import { Project, Contributor, StoryboardTheme } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { generateNudgeMessage, analyzeSubmissions } from '../services/geminiService';
import { cn, formatDate } from '../lib/utils';
import { mediaStore } from '../lib/mediaStore';

interface OrganizerDashboardProps {
  projects: Project[];
  activeProjectId: string | null;
  isAiEnabled: boolean;
  onConnectAi: () => void;
  onCreateProject: () => void;
  onOpenProject: (id: string | null) => void;
  onPreviewProject: (id: string) => void;
  onNudgeContributor: (projectId: string, contributorId: string) => void;
  onAddContributor: (projectId: string, name: string, relationship?: string, email?: string) => void;
  addToast: (msg: string, type?: any) => void;
  onRefreshProjects: (newProjects: Project[]) => void;
}

const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({ 
  projects, 
  activeProjectId,
  isAiEnabled,
  onConnectAi,
  onCreateProject, 
  onOpenProject,
  onPreviewProject,
  onNudgeContributor,
  onAddContributor,
  addToast,
  onRefreshProjects
}) => {
  const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);
  const [currentNudge, setCurrentNudge] = useState<any>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', relationship: '', email: '' });
  const [viewingVideoUrl, setViewingVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Video Preview States
  const [isPlaying, setIsPlaying] = useState(false);
  const [storyboard, setStoryboard] = useState<StoryboardTheme[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Initialize Storyboard when project opens
  useEffect(() => {
    if (activeProject) {
      const runInitialAnalysis = async () => {
        const submittedContributors = activeProject.contributors.filter(c => c.status === 'submitted');
        const subs = submittedContributors.map(c => ({ name: c.name, message: "A beautiful memory." }));
        const result = await analyzeSubmissions(activeProject.title, activeProject.milestone, subs.length > 0 ? subs : [{ name: 'Family', message: 'Waiting...' }]);
        
        if (result?.themes) {
          setStoryboard(result.themes.map((t: any, i: number) => {
            const matchedContributor = submittedContributors.find(c => t.contributors.includes(c.name));
            return {
              id: `theme-${i}-${Date.now()}`,
              themeName: t.themeName,
              contributors: t.contributors,
              suggestedTransition: t.suggestedTransition,
              isPinned: true,
              order: i,
              emotionalBeat: t.emotionalBeat || 'Narrative Segment',
              isClimax: t.isClimax,
              videoUrl: matchedContributor?.memories.find(m => m.type === 'video')?.url
            };
          }));
        }
      };
      runInitialAnalysis();
    }
  }, [activeProjectId, projects]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => { setIsPlaying(false); setVideoError("Asset lost during sync"); });
      else videoRef.current.pause();
    }
  }, [isPlaying, currentClipIndex]);

  const onTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
      if (p >= 99) setCurrentClipIndex(prev => (prev + 1) % Math.max(storyboard.length, 1));
    }
  };

  const handleRecoveryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeProject) return;
    const files = Array.from(e.target.files);
    
    addToast(`Restoring ${files.length} videos to the loom...`, 'info');

    // Save each file to IndexedDB based on expected filenames
    for (const file of files) {
      // Find which contributor this file belongs to based on nana_X pattern
      const match = file.name.match(/nana_(\d+)/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const key = `/videos/nana_${match[1]}.mp4`;
        await mediaStore.saveVideo(key, file);
      }
    }

    // Reload the URLs in the current project state
    const newProjects = await Promise.all(projects.map(async (p) => {
      const updatedContributors = await Promise.all(p.contributors.map(async (c) => {
        const memory = c.memories.find(m => m.type === 'video');
        if (memory) {
          const persistedUrl = await mediaStore.getVideoUrl(memory.url);
          if (persistedUrl) {
            return {
              ...c,
              memories: c.memories.map(m => m.id === memory.id ? { ...m, url: persistedUrl } : m)
            };
          }
        }
        return c;
      }));
      return { ...p, contributors: updatedContributors };
    }));

    onRefreshProjects(newProjects);
    setVideoError(null);
    setShowRecoveryModal(false);
    addToast("Loom assets successfully restored and persisted!", "success");
  };

  if (!activeProject) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-5xl font-bold italic serif mb-12">My Tributes</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {projects.map(p => (
            <Card key={p.id} onClick={() => onOpenProject(p.id)} className="p-0 overflow-hidden">
              <div className="h-48 bg-stone-200">
                <img src={`https://picsum.photos/seed/${p.id}/600/400`} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="p-8">
                <Badge status={p.status} />
                <h3 className="text-2xl font-bold mt-4">{p.title}</h3>
                <p className="text-stone-500 italic serif mb-4">For {p.recipientName}</p>
                <div className="text-[10px] font-bold text-stone-400 border-t pt-4">Deadline: {formatDate(p.deadline)}</div>
              </div>
            </Card>
          ))}
          <button onClick={onCreateProject} className="border-2 border-dashed rounded-[3rem] p-12 text-center hover:bg-stone-50 transition-colors">
            <span className="text-4xl block mb-4">+</span>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">New Tribute</span>
          </button>
        </div>
      </div>
    );
  }

  const currentClip = storyboard[currentClipIndex];
  const missingCount = activeProject.contributors.filter(c => c.status === 'submitted' && c.memories[0]?.url.includes('/videos/nana_') && !c.memories[0].url.startsWith('blob:')).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-stone-900/90 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
          <div className="bg-white max-w-lg w-full rounded-[3rem] p-12 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
            <h2 className="text-3xl font-bold serif italic mb-4">Restore Assets</h2>
            <p className="text-stone-500 mb-8 leading-relaxed">
              To keep your videos safe from repository syncs, we'll store them in your browser. 
              Please select your 7 <strong>nana_X.mp4</strong> files.
            </p>
            <label className="block w-full py-6 bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-all mb-4">
              <span className="text-sm font-bold text-amber-600">Click to select files</span>
              <input type="file" multiple accept="video/*" className="hidden" onChange={handleRecoveryUpload} />
            </label>
            <button onClick={() => setShowRecoveryModal(false)} className="text-[10px] font-bold uppercase text-stone-400 tracking-widest hover:text-stone-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Main UI */}
      <nav className="flex items-center gap-3 mb-10">
        <button onClick={() => onOpenProject(null)} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-800">Tributes</button>
        <span className="text-stone-300">/</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">{activeProject.recipientName}</span>
      </nav>

      <div className="grid lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 space-y-16">
           <div className="flex justify-between items-end border-b pb-10">
              <div>
                <h1 className="text-5xl font-bold italic serif mb-4">{activeProject.recipientName}'s Hub</h1>
                <p className="text-stone-500 text-lg">We've gathered <span className="text-amber-600 font-bold">{activeProject.contributors.filter(c => c.status === 'submitted').length}</span> stories.</p>
              </div>
              <Button onClick={() => setShowInviteModal(true)} variant="ghost" className="rounded-2xl px-8">+ Contributor</Button>
           </div>

           {/* Hero Player */}
           <div className="relative aspect-video bg-stone-950 rounded-[4rem] overflow-hidden shadow-2xl border-[6px] border-white group">
              {currentClip?.videoUrl && !videoError ? (
                <video 
                  ref={videoRef} 
                  src={currentClip.videoUrl} 
                  onTimeUpdate={onTimeUpdate} 
                  className="w-full h-full object-cover opacity-80" 
                  onError={() => setVideoError("Asset lost")}
                />
              ) : null}
              
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                 {videoError ? (
                   <div className="animate-in fade-in">
                      <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-4">⚠️ Asset Lost During Sync</p>
                      <h2 className="text-3xl text-white font-bold italic serif mb-6">Persistent Storage Required</h2>
                      <Button onClick={() => setShowRecoveryModal(true)} size="sm">Restore Clips</Button>
                   </div>
                 ) : (
                   <>
                    <span className="text-amber-500 font-bold text-[10px] uppercase tracking-widest mb-4 italic">{isAiEnabled ? '✨ Narrative Engine Active' : 'Sequencing...'}</span>
                    <h2 className="text-4xl md:text-6xl text-white font-bold italic serif mb-2 drop-shadow-xl">{currentClip?.themeName}</h2>
                    <p className="text-white/60 text-[10px] uppercase tracking-widest drop-shadow-lg">{currentClip?.emotionalBeat}</p>
                   </>
                 )}
              </div>

              <div className="absolute bottom-10 inset-x-12 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all z-20">
                 <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20">
                   {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                 </button>
                 <div className="bg-black/60 px-6 py-2 rounded-full border border-white/10 text-[11px] font-mono text-white">
                   {String(currentClipIndex + 1).padStart(2, '0')} / {String(Math.floor(progress)).padStart(2, '0')}%
                 </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/10"><div className="h-full bg-amber-500 shadow-[0_0_15px_#f59e0b]" style={{ width: `${progress}%` }} /></div>
           </div>

           <div className="space-y-10">
              <h2 className="text-4xl font-bold italic serif">Loom Contributors</h2>
              <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-stone-50/50"><tr className="border-b"><th className="px-10 py-6 text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Contributor</th><th className="px-10 py-6 text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold text-center">Status</th><th className="px-10 py-6 text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold text-right">Action</th></tr></thead>
                    <tbody className="divide-y">
                       {activeProject.contributors.map(c => (
                         <tr key={c.id} onClick={() => {
                            const video = c.memories.find(m => m.type === 'video');
                            if (video) { setVideoError(null); setViewingVideoUrl(video.url); }
                         }} className={cn("transition-colors", c.status === 'submitted' ? "hover:bg-amber-50/30 cursor-pointer group" : "opacity-80")}>
                           <td className="px-10 py-8">
                              <span className={cn("font-bold block mb-1", c.status === 'submitted' ? "text-stone-800" : "text-stone-400")}>{c.name}</span>
                              <span className="text-[10px] text-stone-300 font-bold uppercase italic">{c.relationship || 'Friend'}</span>
                           </td>
                           <td className="px-10 py-8 text-center"><Badge status={c.status} /></td>
                           <td className="px-10 py-8 text-right">
                              {c.status === 'invited' ? <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); addToast("Nudge functionality ready!"); }}>Nudge</Button> : <div className="text-green-600 font-bold text-[10px] tracking-widest uppercase flex items-center justify-end gap-2">Secured <div className="w-2 h-2 rounded-full bg-green-500" /></div>}
                           </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
           <div className="bg-stone-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-8">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Intelligence Center</span>
                    <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_#22c55e]", isAiEnabled ? "bg-green-500" : "bg-stone-700")} />
                 </div>
                 <h4 className="text-3xl font-bold italic serif mb-6">Director Suite</h4>
                 <p className="text-stone-400 text-sm leading-relaxed mb-10 italic">Analyze emotional peaks and weave a cinematic gift.</p>
                 {!isAiEnabled ? <Button onClick={onConnectAi} className="w-full bg-amber-500 text-stone-900">Connect Engine</Button> : <div className="p-8 bg-white/5 rounded-3xl border border-white/10 text-center"><button onClick={() => onPreviewProject(activeProject.id)} className="text-xs font-bold uppercase tracking-widest hover:text-amber-500 transition-colors">Adjust Narrative Arc</button></div>}
              </div>
           </div>

           <div className="bg-white rounded-[3rem] p-10 border shadow-sm relative overflow-hidden">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-8 italic">Media Health</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">Sync Status</span>
                    <span className={cn("font-bold", missingCount > 0 ? "text-red-500" : "text-green-500")}>{missingCount > 0 ? `${missingCount} Assets Missing` : 'All Clips Persisted'}</span>
                 </div>
                 {missingCount > 0 && (
                   <button onClick={() => setShowRecoveryModal(true)} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest border rounded-2xl border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">Repair Loom</button>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Video Modal Overlay */}
      {viewingVideoUrl && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[400] flex items-center justify-center p-4 md:p-12" onClick={() => setViewingVideoUrl(null)}>
          <div className="w-full max-w-5xl aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <video src={viewingVideoUrl} autoPlay controls className="w-full h-full" />
            <button onClick={() => setViewingVideoUrl(null)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;
