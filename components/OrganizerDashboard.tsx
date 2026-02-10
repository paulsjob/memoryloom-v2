
import React, { useState, useEffect, useRef } from 'react';
import { Project, Contributor, StoryboardTheme } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { generateNudgeMessage, analyzeSubmissions } from '../services/geminiService';
import { cn, formatDate } from '../lib/utils';

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
}

interface NudgeOptions {
  funny: string;
  heartfelt: string;
  contributorId: string;
  projectId: string;
  recipientName: string;
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
  addToast
}) => {
  const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);
  const [currentNudge, setCurrentNudge] = useState<NudgeOptions | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', relationship: '', email: '' });
  const [viewingVideoUrl, setViewingVideoUrl] = useState<string | null>(null);

  // Video Preview States (Dashboard Main Player)
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
        
        const analysisData = subs.length > 0 ? subs : [{ name: 'Family', message: 'Waiting for memories...' }];
        const result = await analyzeSubmissions(activeProject.title, activeProject.milestone, analysisData);
        
        if (result?.themes) {
          setStoryboard(result.themes.map((t: any, i: number) => {
            const matchedContributor = submittedContributors.find(c => t.contributors.includes(c.name));
            const videoUrl = matchedContributor?.memories.find(m => m.type === 'video')?.url;

            return {
              id: `theme-${i}-${Date.now()}`,
              themeName: t.themeName,
              contributors: t.contributors,
              suggestedTransition: t.suggestedTransition,
              isPinned: true,
              order: i,
              emotionalBeat: t.emotionalBeat || 'Narrative Segment',
              isClimax: t.isClimax,
              videoUrl: videoUrl
            };
          }));
        }
      };
      runInitialAnalysis();
    }
  }, [activeProjectId]);

  // Video Sync Logic
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentClipIndex]);

  const onTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
      if (p >= 99) {
        setCurrentClipIndex(prev => (prev + 1) % Math.max(storyboard.length, 1));
      }
    }
  };

  const handleFetchNudge = async (contributor: Contributor, project: Project) => {
    setNudgeLoading(contributor.id);
    try {
      const nudgeData = await generateNudgeMessage(project.recipientName, project.milestone, project.deadline, project.theme);
      setCurrentNudge({
        ...nudgeData,
        contributorId: contributor.id,
        projectId: project.id,
        recipientName: project.recipientName
      });
    } catch (err) {
      addToast("Standard mode active: generating basic nudge.", "info");
    } finally {
      setNudgeLoading(null);
    }
  };

  const markAsNudged = () => {
    if (!currentNudge) return;
    onNudgeContributor(currentNudge.projectId, currentNudge.contributorId);
    setCurrentNudge(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addToast("Nudge copied to clipboard!", "success");
      markAsNudged();
    });
  };

  const handleWhatsApp = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    markAsNudged();
  };

  const handleAddContributor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !inviteForm.name) return;
    onAddContributor(activeProjectId, inviteForm.name, inviteForm.relationship, inviteForm.email);
    addToast(`${inviteForm.name} added to the loom!`, 'success');
    setInviteForm({ name: '', relationship: '', email: '' });
    setShowInviteModal(false);
  };

  const openContributorVideo = (c: Contributor) => {
    if (c.status !== 'submitted') return;
    const video = c.memories.find(m => m.type === 'video');
    if (video) {
      setViewingVideoUrl(video.url);
    } else {
      addToast("No video file found for this contributor.", "error");
    }
  };

  // View 1: Project List
  if (!activeProject) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-12 text-center sm:text-left">
          <h1 className="text-4xl md:text-5xl font-bold italic serif text-stone-900 mb-2 leading-tight">My Tributes</h1>
          <p className="text-stone-500 font-medium tracking-wide">Managing {projects.length} active woven stories.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {projects.map(project => (
            <Card key={project.id} onClick={() => onOpenProject(project.id)} className="group border-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] bg-white">
              <div className="h-56 bg-stone-100 relative overflow-hidden">
                 <img 
                   src={`https://picsum.photos/seed/${project.id}/600/400`} 
                   className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000 ease-out" 
                   alt={project.title}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent opacity-60" />
                 <div className="absolute top-4 right-4">
                   <Badge status={project.status} />
                 </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-stone-800 mb-2 group-hover:text-amber-600 transition-colors">{project.title}</h3>
                <p className="text-stone-500 mb-6 italic serif">For {project.recipientName}</p>
                <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold uppercase tracking-widest border-t border-stone-50 pt-4">
                  <span className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    {project.contributors.filter(c => c.status === 'submitted').length} Clips gathered
                  </span>
                  <span>{formatDate(project.deadline)}</span>
                </div>
              </div>
            </Card>
          ))}
          
          <button 
            onClick={onCreateProject} 
            className="border-2 border-dashed border-stone-200 rounded-[3rem] p-10 flex flex-col items-center justify-center gap-6 group hover:border-amber-400 hover:bg-amber-50/20 transition-all min-h-[320px] shadow-sm hover:shadow-inner"
          >
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center group-hover:bg-amber-100 group-hover:text-amber-600 transition-all duration-500 transform group-hover:rotate-12">
              <span className="text-4xl font-light text-stone-400 group-hover:text-amber-600">+</span>
            </div>
            <div className="text-center">
              <span className="block font-bold text-xs text-stone-400 group-hover:text-stone-600 uppercase tracking-[0.3em] mb-1">Start New Tribute</span>
              <span className="text-[10px] text-stone-300 uppercase tracking-widest font-medium">Create a new gift</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const currentClip = storyboard[currentClipIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Modals */}
      {viewingVideoUrl && (
        <div 
          className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 md:p-12 animate-in fade-in zoom-in-95 duration-300"
          onClick={() => setViewingVideoUrl(null)}
        >
          <div className="absolute top-8 right-8 z-[210]">
            <button className="text-white/60 hover:text-white transition-colors">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div 
            className="w-full max-w-5xl aspect-video bg-black rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <video 
              src={viewingVideoUrl} 
              autoPlay 
              controls 
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl p-10 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <h3 className="text-3xl font-bold italic serif mb-2">Grow the Group</h3>
            <p className="text-stone-400 text-sm mb-8 italic">The more voices, the richer the loom.</p>
            <form onSubmit={handleAddContributor} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-1">Full Name</label>
                <input required type="text" className="w-full p-4 bg-stone-50 rounded-2xl outline-none border border-stone-100 focus:ring-2 focus:ring-amber-500 transition-all" placeholder="e.g. Auntie Em" value={inviteForm.name} onChange={e => setInviteForm({...inviteForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-1">Relationship</label>
                <input type="text" className="w-full p-4 bg-stone-50 rounded-2xl outline-none border border-stone-100 focus:ring-2 focus:ring-amber-500 transition-all" placeholder="e.g. Best friend" value={inviteForm.relationship} onChange={e => setInviteForm({...inviteForm, relationship: e.target.value})} />
              </div>
              <div className="pt-4 space-y-3">
                <Button type="submit" className="w-full py-5 rounded-2xl text-lg shadow-xl shadow-amber-500/10">Add to project</Button>
                <button type="button" onClick={() => setShowInviteModal(false)} className="w-full py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-600 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentNudge && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl p-10 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <h3 className="text-3xl font-bold italic serif mb-2">Magic Nudge</h3>
            <p className="text-stone-400 text-sm mb-8 italic">A little push to help {currentNudge.recipientName} feel the love.</p>
            <div className="space-y-6">
               {[ { vibe: 'Funny', text: currentNudge.funny, color: 'amber' }, { vibe: 'Heartfelt', text: currentNudge.heartfelt, color: 'indigo' }].map((n, i) => (
                 <div key={i} className="p-8 bg-stone-50 rounded-[2.5rem] border border-stone-100 relative group overflow-hidden">
                    <div className={cn("absolute top-0 left-0 w-1.5 h-full opacity-60", n.color === 'amber' ? "bg-amber-500" : "bg-indigo-500")} />
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3 italic", n.color === 'amber' ? "text-amber-600" : "text-indigo-600")}>{n.vibe}</p>
                    <p className="text-stone-700 italic mb-8 leading-relaxed text-lg">"{n.text}"</p>
                    <div className="flex gap-3">
                       <Button size="sm" onClick={() => handleWhatsApp(n.text)} className="bg-green-600 border-0 hover:bg-green-700 rounded-xl px-6">WhatsApp</Button>
                       <Button size="sm" variant="ghost" onClick={() => handleCopy(n.text)} className="rounded-xl px-6">Copy Text</Button>
                    </div>
                 </div>
               ))}
               <button onClick={() => setCurrentNudge(null)} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-600">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-3 mb-10 md:mb-16">
        <button onClick={() => onOpenProject(null)} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-800 transition-colors">Tributes</button>
        <span className="text-stone-300 text-xs font-light">/</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">{activeProject.recipientName}</span>
      </nav>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12 lg:gap-16">
        <div className="lg:col-span-8 space-y-16">
           {/* Hub Header */}
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 sm:gap-8 border-b border-stone-100 pb-10">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold italic serif text-stone-900 mb-4 leading-tight">
                  {activeProject.recipientName}'s Hub
                </h1>
                <p className="text-stone-500 text-lg leading-relaxed">
                  We've gathered <span className="text-amber-600 font-bold">{activeProject.contributors.filter(c => c.status === 'submitted').length}</span> stories so far. The film is taking shape.
                </p>
              </div>
              <div className="flex gap-4">
                 <Button onClick={() => setShowInviteModal(true)} variant="ghost" size="md" className="shadow-none rounded-2xl border-stone-200 px-8">+ Add Contributor</Button>
              </div>
           </div>

           {/* Primary Video Player */}
           <div className="relative w-full aspect-video bg-stone-950 rounded-[3rem] md:rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[6px] border-white ring-1 ring-stone-100 group">
              {currentClip?.videoUrl ? (
                <video 
                  ref={videoRef}
                  src={currentClip.videoUrl} 
                  onTimeUpdate={onTimeUpdate}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-70 group-hover:opacity-90"
                  playsInline
                />
              ) : null}

              <div className="absolute inset-0 flex items-center justify-center text-center px-12 pointer-events-none">
                 {storyboard.length > 0 ? (
                    <div className="animate-in fade-in duration-1000">
                       <span className="text-amber-500 font-bold text-[10px] uppercase tracking-widest block mb-4 italic drop-shadow-lg opacity-80">
                          {isAiEnabled ? '✨ Narrative Engine Active' : 'Sequencing memories...'}
                       </span>
                       <h2 className="text-4xl md:text-6xl text-white font-bold italic serif mb-4 drop-shadow-2xl">
                          {currentClip?.themeName || activeProject.recipientName}
                       </h2>
                       <p className="text-white/70 text-[10px] font-bold tracking-[0.3em] uppercase italic drop-shadow-lg">
                          {currentClip?.emotionalBeat || 'Drafting Narrative'}
                       </p>
                    </div>
                 ) : (
                    <div className="text-stone-500 text-center">
                       <div className="w-20 h-20 bg-stone-800/50 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur">
                          <svg className="w-10 h-10 opacity-30 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                       </div>
                       <p className="text-lg italic serif text-stone-400">The loom is waiting for the first thread...</p>
                    </div>
                 )}
              </div>

              {/* Player UI */}
              <div className="absolute bottom-10 inset-x-12 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 transform translate-y-4 group-hover:translate-y-0">
                 <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all border border-white/20 shadow-2xl"
                 >
                    {isPlaying ? (
                       <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8h2v4H7V8zm4 0h2v4h-2V8z"/></svg>
                    ) : (
                       <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.5 7l5 3-5 3V7z"/></svg>
                    )}
                 </button>
                 <div className="bg-black/60 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/10 shadow-2xl">
                    <span className="text-[11px] font-mono text-white/90 tracking-[0.2em] font-bold">
                       {String(currentClipIndex + 1).padStart(2, '0')} <span className="mx-2 opacity-30">/</span> {String(Math.floor(progress)).padStart(2, '0')}%
                    </span>
                 </div>
              </div>
              
              {/* Progress Bar */}
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/5 z-20">
                 <div 
                   className="h-full bg-amber-500 transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.8)]" 
                   style={{ width: `${progress}%` }} 
                 />
              </div>
           </div>

           {/* Logistics Section (Contributor Table) */}
           <div className="space-y-10">
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold italic serif text-stone-900 leading-tight">
                  Loom Contributors
                </h1>
                <div className="text-[10px] font-bold text-stone-300 uppercase tracking-widest italic">
                  Click a submitted line to watch
                </div>
              </div>
              <div className="bg-white rounded-[3rem] border border-stone-100 overflow-hidden shadow-sm">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-stone-50/50 border-b border-stone-100">
                          <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">Contributor</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 text-center">Status</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 text-right">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                       {activeProject.contributors.length === 0 ? (
                         <tr>
                           <td colSpan={3} className="px-10 py-16 text-center text-stone-400 italic font-medium">No one invited yet. Click "Invite" to get started!</td>
                         </tr>
                       ) : activeProject.contributors.map(c => (
                         <tr 
                           key={c.id} 
                           onClick={() => openContributorVideo(c)}
                           className={cn(
                             "transition-all duration-300",
                             c.status === 'submitted' ? "hover:bg-amber-50/30 cursor-pointer group/row" : "opacity-80"
                           )}
                         >
                           <td className="px-10 py-8">
                              <span className={cn(
                                "font-bold block leading-tight mb-1 transition-colors",
                                c.status === 'submitted' ? "text-stone-800 group-hover/row:text-amber-700" : "text-stone-400"
                              )}>{c.name}</span>
                              <span className="text-[10px] text-stone-300 uppercase font-bold tracking-widest italic group-hover/row:text-amber-400 transition-colors">{c.relationship || 'Friend'}</span>
                           </td>
                           <td className="px-10 py-8 text-center">
                              <Badge status={c.status} />
                           </td>
                           <td className="px-10 py-8 text-right">
                              {c.status === 'invited' ? (
                                <Button 
                                  onClick={(e) => { e.stopPropagation(); handleFetchNudge(c, activeProject); }} 
                                  size="sm" 
                                  variant="ghost" 
                                  className="ml-auto rounded-xl border-stone-100 px-5" 
                                  disabled={nudgeLoading === c.id}
                                >
                                  {nudgeLoading === c.id ? '...' : 'Send Nudge'}
                                </Button>
                              ) : (
                                <div className="flex items-center justify-end gap-3">
                                   <span className="text-green-600 text-[10px] font-bold uppercase tracking-[0.2em] font-mono opacity-80">SECURED</span>
                                   <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center group-hover/row:bg-green-500 group-hover/row:text-white transition-all transform group-hover/row:scale-110">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.5 7l5 3-5 3V7z"/></svg>
                                   </div>
                                </div>
                              )}
                           </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-10 pt-10 lg:pt-0">
           <div className="bg-stone-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-amber-500/20" />
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-8">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 italic">Intelligence Center</span>
                    <div className={cn("w-2 h-2 rounded-full", isAiEnabled ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]" : "bg-stone-700")}></div>
                 </div>
                 
                 <h4 className="text-3xl font-bold italic serif mb-6 leading-tight">
                   {isAiEnabled ? 'Magic Loom Active ✨' : 'Standard Loom'}
                 </h4>
                 
                 <p className="text-stone-400 text-sm leading-relaxed mb-10 italic">
                    {isAiEnabled 
                      ? `Gemini 3 Pro is analyzing ${activeProject.contributors.length} unique perspectives to weave an emotional cinematic arc for ${activeProject.recipientName}.`
                      : 'Connect an Intelligence Engine to unlock cinematic sequencing, real-time mood analysis, and automated editing.'}
                 </p>

                 {!isAiEnabled ? (
                   <Button onClick={onConnectAi} className="w-full bg-amber-500 text-stone-900 border-0 py-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-[1.02]">Connect Intelligence</Button>
                 ) : (
                   <div className="p-8 bg-white/5 rounded-3xl border border-white/10 text-center backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/60 mb-4 italic font-serif italic">Director Suite Active</p>
                      <button 
                        onClick={() => onPreviewProject(activeProject.id)}
                        className="text-xs text-white font-bold uppercase tracking-widest hover:text-amber-500 transition-colors border-b border-white/20 pb-1"
                      >
                        Adjust Narrative Arc
                      </button>
                   </div>
                 )}
              </div>
           </div>

           <div className="bg-white rounded-[3rem] p-10 border border-stone-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-stone-50 rounded-full -mr-12 -mt-12 opacity-50" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-8 italic">Project Brief</h4>
              <div className="space-y-6">
                 <div className="flex justify-between items-center py-4 border-b border-stone-50">
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-tighter opacity-70">Milestone</span>
                    <span className="text-xs text-stone-500 italic font-serif">{activeProject.milestone}</span>
                 </div>
                 <div className="flex justify-between items-center py-4 border-b border-stone-50">
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-tighter opacity-70">Deadline</span>
                    <span className="text-xs text-stone-500">{formatDate(activeProject.deadline)}</span>
                 </div>
                 <div className="flex justify-between items-center py-4">
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-tighter opacity-70">Vibe</span>
                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest italic">{activeProject.theme}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
