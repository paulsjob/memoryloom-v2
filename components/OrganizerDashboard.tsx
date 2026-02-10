
import React, { useState, useEffect, useRef } from 'react';
import { Project, Contributor, StoryboardTheme, CommunityAsset, AssetComment, SavedSequence } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { analyzeSubmissions, AnalysisResult, Submission } from '../services/geminiService';
import { cn, formatDate, generateId } from '../lib/utils';
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
  projects, activeProjectId, isAiEnabled, onConnectAi, onCreateProject, 
  onOpenProject, onPreviewProject, onNudgeContributor, onAddContributor, addToast, onRefreshProjects
}) => {
  const [tab, setTab] = useState<'contributors' | 'library'>('contributors');
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewingVideoUrl, setViewingVideoUrl] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CommunityAsset | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisResult | null>(null);
  const [isSequencing, setIsSequencing] = useState(false);
  const [hidePlayerText, setHidePlayerText] = useState(false);

  // Spark Comment State
  const [sparkAuthor, setSparkAuthor] = useState('');
  const [sparkText, setSparkText] = useState('');

  // Batch Upload States
  const [pendingAssets, setPendingAssets] = useState<{file: File, asset: Partial<CommunityAsset>, preview: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Video Preview States
  const [isPlaying, setIsPlaying] = useState(false);
  const [storyboard, setStoryboard] = useState<StoryboardTheme[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Persistent Sequencing: Auto-weave if never sequenced
  useEffect(() => {
    if (activeProject && !activeProject.storyboard) {
      handleSequenceLoom();
    } else if (activeProject?.storyboard) {
      setStoryboard(activeProject.storyboard);
    }
  }, [activeProjectId]);

  const handleSequenceLoom = async () => {
    if (!activeProject) return;
    setIsSequencing(true);
    try {
      const submittedContributors = activeProject.contributors.filter(c => c.status === 'submitted');
      const submissions: Submission[] = [
        ...submittedContributors.map(c => ({ 
          id: c.memories[0]?.id || c.id, 
          name: c.name, 
          message: "A memory thread.", 
          type: 'testimony' 
        })),
        ...activeProject.communityAssets.map(a => ({
          id: a.id,
          name: a.contributorName,
          message: a.description,
          type: a.type
        }))
      ];

      const result = await analyzeSubmissions(activeProject.title, activeProject.milestone, submissions);
      setAiAnalysis(result);

      if (result?.themes) {
        const newStoryboard = result.themes.map((t: any, i: number): StoryboardTheme => {
          // Find matching asset or contributor
          const contributor = activeProject.contributors.find(c => c.memories[0]?.id === t.assetId);
          const asset = activeProject.communityAssets.find(a => a.id === t.assetId);
          
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
            videoUrl: videoUrl,
            contributorName: contributorName,
            assetId: t.assetId,
            assetType: contributor ? 'video' : (asset?.type)
          };
        });

        const newVersion: SavedSequence = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          storyboard: newStoryboard,
          snapshotName: `Edit ${ (activeProject.storyboardHistory?.length || 0) + 1 }`
        };

        const updatedProjects = projects.map(p => {
          if (p.id === activeProject.id) {
            return { ...p, storyboard: newStoryboard, storyboardHistory: [...(p.storyboardHistory || []), newVersion] };
          }
          return p;
        });

        setStoryboard(newStoryboard);
        onRefreshProjects(updatedProjects);
        addToast("Narrative Woven!", "success");
      }
    } catch (err) {
      addToast("Sequencing issue.", "info");
    } finally {
      setIsSequencing(false);
    }
  };

  const restoreVersion = (version: SavedSequence) => {
    if (!activeProject) return;
    const updatedProjects = projects.map(p => {
      if (p.id === activeProject.id) return { ...p, storyboard: version.storyboard };
      return p;
    });
    setStoryboard(version.storyboard);
    onRefreshProjects(updatedProjects);
    setShowHistoryModal(false);
    addToast(`Restored ${version.snapshotName}`, "success");
  };

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
        setCurrentClipIndex(prev => (prev + 1) % Math.max(storyboard.length, 1));
        setProgress(0);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems = files.map(file => {
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      return {
        file,
        preview: isVideo || file.type.startsWith('image') ? URL.createObjectURL(file) : '',
        asset: {
          id: generateId(),
          contributorName: 'Organizer',
          type: isVideo ? 'video' : (isAudio ? 'audio' : 'photo'),
          title: file.name.split('.')[0],
          description: '',
          createdAt: new Date().toISOString()
        } as Partial<CommunityAsset>
      };
    });
    setPendingAssets(prev => [...prev, ...newItems]);
  };

  const finalizeUploads = async () => {
    if (!activeProject || pendingAssets.some(a => !a.asset.title || !a.asset.description)) {
      addToast("Please fill in details for all threads.", "info");
      return;
    }
    setIsUploading(true);
    try {
      const newAssets: CommunityAsset[] = [];
      for (const item of pendingAssets) {
        const finalAsset = item.asset as CommunityAsset;
        await mediaStore.saveVideo(finalAsset.id, item.file);
        newAssets.push(finalAsset);
      }
      const updatedProjects = projects.map(p => {
        if (p.id === activeProject.id) return { ...p, communityAssets: [...p.communityAssets, ...newAssets] };
        return p;
      });
      onRefreshProjects(updatedProjects);
      addToast(`${newAssets.length} threads secured`, 'success');
      setPendingAssets([]);
      setShowUploadModal(false);
    } catch (err) { addToast("Secure fail.", "error"); } finally { setIsUploading(false); }
  };

  const handleAddSpark = () => {
    if (!sparkAuthor || !sparkText || !selectedAsset || !activeProject) return;
    const newComment: AssetComment = { id: generateId(), author: sparkAuthor, text: sparkText, createdAt: new Date().toISOString() };
    const updatedProjects = projects.map(p => {
      if (p.id === activeProject.id) {
        return { ...p, communityAssets: p.communityAssets.map(a => a.id === selectedAsset.id ? { ...a, comments: [...(a.comments || []), newComment] } : a) };
      }
      return p;
    });
    onRefreshProjects(updatedProjects);
    setSparkText('');
    addToast("Spark shared!", "success");
    setSelectedAsset(prev => prev ? { ...prev, comments: [...(prev.comments || []), newComment] } : null);
  };

  if (!activeProject) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-5xl font-bold italic serif mb-12">My Tributes</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {projects.map(p => (
            <Card key={p.id} onClick={() => onOpenProject(p.id)} className="p-0 overflow-hidden">
              <div className="h-48 bg-stone-200"><img src={`https://picsum.photos/seed/${p.id}/600/400`} className="w-full h-full object-cover" alt="" /></div>
              <div className="p-8">
                <Badge status={p.status} /><h3 className="text-2xl font-bold mt-4">{p.title}</h3>
                <p className="text-stone-500 italic serif mb-4">For {p.recipientName}</p>
                <div className="text-[10px] font-bold text-stone-400 border-t pt-4">Deadline: {formatDate(p.deadline)}</div>
              </div>
            </Card>
          ))}
          <button onClick={onCreateProject} className="border-2 border-dashed rounded-[3rem] p-12 text-center hover:bg-stone-50 transition-colors">
            <span className="text-4xl block mb-4">+</span><span className="text-xs font-bold uppercase tracking-widest text-stone-400">New Tribute</span>
          </button>
        </div>
      </div>
    );
  }

  const currentClip = storyboard[currentClipIndex];
  const visualAssets = activeProject.communityAssets.filter(a => a.type === 'photo' || a.type === 'video');
  const audioAssets = activeProject.communityAssets.filter(a => a.type === 'audio');

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-stone-900/90 backdrop-blur-xl z-[550] flex items-center justify-center p-6" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-white max-w-lg w-full rounded-[3rem] p-10 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h2 className="text-3xl font-bold serif italic mb-8">Edit History</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {activeProject.storyboardHistory?.map((v) => (
                <button key={v.id} onClick={() => restoreVersion(v)} className="w-full p-6 text-left border rounded-3xl hover:bg-amber-50 flex justify-between items-center group">
                  <div><span className="block font-bold text-stone-800">{v.snapshotName}</span><span className="text-[10px] text-stone-400">{formatDate(v.timestamp)}</span></div>
                  <span className="text-[10px] font-bold uppercase text-amber-600 opacity-0 group-hover:opacity-100">Restore</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowHistoryModal(false)} className="w-full mt-8 text-[10px] font-bold uppercase text-stone-400">Close</button>
          </div>
        </div>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-stone-900/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4 md:p-12" onClick={() => setSelectedAsset(null)}>
           <div className="bg-white max-w-6xl w-full rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="md:w-3/5 bg-stone-950 flex items-center justify-center relative">
                 {selectedAsset.type === 'photo' && <img src={selectedAsset.url} className="max-h-full object-contain" />}
                 {selectedAsset.type === 'video' && <video src={selectedAsset.url} controls className="max-h-full w-full" />}
                 {selectedAsset.type === 'audio' && (
                    <div className="text-center p-12 text-white">
                       <svg className="w-32 h-32 mx-auto mb-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                       <audio src={selectedAsset.url} controls className="w-full" />
                    </div>
                 )}
                 <div className="absolute top-8 left-8 bg-black/40 backdrop-blur rounded-full px-4 py-2 border border-white/20"><span className="text-[10px] text-white font-bold uppercase tracking-widest italic">By {selectedAsset.contributorName}</span></div>
              </div>
              <div className="md:w-2/5 p-12 flex flex-col overflow-y-auto bg-stone-50/30">
                 <div className="flex-1 space-y-10">
                    <div><h3 className="text-3xl font-bold serif italic mb-2">{selectedAsset.title}</h3><p className="text-stone-500 italic">"{selectedAsset.description}"</p></div>
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 border-b pb-2">Memory Sparks</h4>
                       <div className="space-y-4">
                          {selectedAsset.comments?.map(c => (
                            <div key={c.id} className="p-4 bg-white border border-stone-100 rounded-2xl shadow-sm"><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-stone-800">{c.author}</span><span className="text-[9px] text-stone-400">{new Date(c.createdAt).toLocaleDateString()}</span></div><p className="text-xs text-stone-600 italic">"{c.text}"</p></div>
                          ))}
                          {(!selectedAsset.comments || selectedAsset.comments.length === 0) && <p className="text-[10px] text-stone-400 italic text-center py-4">No sparks yet.</p>}
                       </div>
                       <div className="p-6 bg-white border border-stone-200 rounded-[2rem] space-y-4">
                          <input type="text" placeholder="Your Name" value={sparkAuthor} onChange={e => setSparkAuthor(e.target.value)} className="w-full text-xs p-3 bg-stone-50 border rounded-xl outline-none focus:ring-1 focus:ring-amber-500" />
                          <textarea placeholder="Reaction..." value={sparkText} onChange={e => setSparkText(e.target.value)} className="w-full text-xs p-3 bg-stone-50 border rounded-xl outline-none resize-none h-16" />
                          <Button size="sm" onClick={handleAddSpark} className="w-full">Spark Connection</Button>
                       </div>
                    </div>
                 </div>
                 <Button onClick={() => setSelectedAsset(null)} variant="ghost" className="mt-8">Close Gallery</Button>
              </div>
           </div>
        </div>
      )}

      {/* NEW UPLOAD FLOW: INTEGRATED DETAILS */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-stone-900/90 backdrop-blur-xl z-[450] flex items-center justify-center p-6" onClick={() => !isUploading && setShowUploadModal(false)}>
           <div className="bg-white w-full max-w-4xl rounded-[4rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="px-10 py-8 border-b flex justify-between items-center bg-stone-50/50">
                 <div><h2 className="text-3xl font-bold serif italic">Weave your contribution</h2><p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1 italic">Describe your threads to help the AI director</p></div>
                 <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                 {pendingAssets.length === 0 ? (
                    <label className="block w-full py-24 bg-stone-50 border-4 border-dashed border-stone-100 rounded-[4rem] text-center cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-all group">
                       <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform text-amber-600"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                       <h3 className="text-2xl font-bold italic serif mb-2">Select your media threads</h3>
                       <p className="text-stone-400 text-sm">Photos, Videos, or Music Clips</p>
                       <input type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={handleFileSelect} />
                    </label>
                 ) : (
                    <div className="space-y-12">
                       {pendingAssets.map((item, idx) => (
                          <div key={idx} className="p-8 bg-stone-50 rounded-[3rem] border-2 border-white shadow-sm flex flex-col md:flex-row gap-8 animate-in slide-in-from-bottom-4">
                             <div className="w-full md:w-1/3 aspect-video md:aspect-square rounded-2xl overflow-hidden shrink-0 bg-stone-900 flex items-center justify-center relative group">
                                {item.asset.type === 'photo' && <img src={item.preview} className="w-full h-full object-cover" />}
                                {item.asset.type === 'video' && <video src={item.preview} className="w-full h-full object-cover" />}
                                {item.asset.type === 'audio' && <svg className="w-16 h-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>}
                                <button onClick={() => setPendingAssets(pendingAssets.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white/50 hover:text-red-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                             </div>
                             <div className="flex-1 space-y-4">
                                <div><label className="text-[9px] font-bold uppercase text-stone-400 tracking-widest ml-1">Thread Title</label><input type="text" placeholder="Title your memory" value={item.asset.title} onChange={e => { const np = [...pendingAssets]; np[idx].asset.title = e.target.value; setPendingAssets(np); }} className="w-full p-4 bg-white border rounded-2xl outline-none focus:ring-1 focus:ring-amber-500" /></div>
                                <div><label className="text-[9px] font-bold uppercase text-stone-400 tracking-widest ml-1">The Backstory</label><textarea placeholder="Why is this meaningful?" value={item.asset.description} onChange={e => { const np = [...pendingAssets]; np[idx].asset.description = e.target.value; setPendingAssets(np); }} className="w-full p-4 bg-white border rounded-2xl outline-none focus:ring-1 focus:ring-amber-500 h-20 resize-none" /></div>
                             </div>
                          </div>
                       ))}
                       <div className="pt-4"><Button onClick={finalizeUploads} className="w-full py-5 rounded-3xl text-xl shadow-2xl">Secure Threads to Loom</Button></div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <nav className="flex items-center gap-3 mb-10">
        <button onClick={() => onOpenProject(null)} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-800">Tributes</button>
        <span className="text-stone-300">/</span><span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">{activeProject.recipientName}</span>
      </nav>

      <div className="grid lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 space-y-16">
           <div className="flex justify-between items-end border-b pb-10">
              <div><h1 className="text-5xl font-bold italic serif mb-4">{activeProject.recipientName}'s Hub</h1><p className="text-stone-500 text-lg">Woven from <span className="text-amber-600 font-bold">{activeProject.contributors.filter(c => c.status === 'submitted').length + activeProject.communityAssets.length}</span> threads.</p></div>
              <div className="flex gap-4"><Button onClick={() => onPreviewProject(activeProject.id)} variant="ghost" className="rounded-2xl px-6">Produce Film</Button></div>
           </div>

           {/* Hero Player */}
           <div className="relative aspect-video bg-stone-950 rounded-[4rem] overflow-hidden shadow-2xl border-[6px] border-white group">
              {currentClip?.videoUrl && (
                <video ref={videoRef} src={currentClip.videoUrl} onTimeUpdate={onTimeUpdate} onPlay={() => { if(!hidePlayerText) setTimeout(() => setHidePlayerText(true), 2000); }} className="w-full h-full object-cover opacity-80" playsInline />
              )}
              
              <div className={cn("absolute inset-0 flex flex-col items-center justify-center text-center p-12 pointer-events-none transition-all duration-1000", hidePlayerText ? "opacity-0 translate-y-4" : "opacity-100")}>
                 <div className="bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 px-4 py-2 rounded-full mb-4"><span className="text-amber-500 font-bold text-[10px] uppercase tracking-widest italic">{isAiEnabled && !isSequencing ? '✨ Narrative Engine Active' : 'Sequencing Narrative...'}</span></div>
                 <h2 className="text-4xl md:text-6xl text-white font-bold italic serif mb-2 drop-shadow-2xl">{currentClip?.themeName || 'Opening Moments'}</h2>
                 <p className="text-white/60 text-xs font-bold uppercase tracking-[0.3em]">{currentClip?.emotionalBeat || 'Warm Welcome'}</p>
                 {currentClip?.contributorName && (<div className="mt-8"><span className="text-[10px] font-bold text-white/40 uppercase tracking-widest italic">Thread by</span><p className="text-amber-500 font-bold italic serif text-xl">{currentClip.contributorName}</p></div>)}
              </div>

              <div className="absolute top-10 right-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setHidePlayerText(!hidePlayerText)} className="bg-black/40 backdrop-blur-md border border-white/20 p-2 rounded-full text-white/60 hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg></button>
              </div>

              {!isPlaying && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center cursor-pointer" onClick={() => setIsPlaying(true)}>
                   <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-2xl"><svg className="w-10 h-10 ml-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                </div>
              )}

              <div className="absolute bottom-10 inset-x-12 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all z-20">
                 <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20">{isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}</button>
                 <div className="bg-black/60 px-6 py-2 rounded-full border border-white/10 text-[11px] font-mono text-white">Clip {String(currentClipIndex + 1).padStart(2, '0')} / {storyboard.length}</div>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/10"><div className="h-full bg-amber-500 shadow-[0_0_15px_#f59e0b] transition-all duration-300" style={{ width: `${progress}%` }} /></div>
           </div>

           <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-stone-100">
                <div className="flex items-center gap-10">
                   <button onClick={() => setTab('contributors')} className={cn("text-[10px] font-bold uppercase tracking-[0.3em] pb-5 border-b-2 transition-all", tab === 'contributors' ? "text-stone-900 border-amber-500" : "text-stone-300 border-transparent")}>Contributors</button>
                   <button onClick={() => setTab('library')} className={cn("text-[10px] font-bold uppercase tracking-[0.3em] pb-5 border-b-2 transition-all", tab === 'library' ? "text-stone-900 border-amber-500" : "text-stone-300 border-transparent")}>Loom Library</button>
                </div>
                {tab === 'library' && (<Button onClick={() => setShowUploadModal(true)} variant="ghost" size="sm" className="mb-4 rounded-full border-amber-200 text-amber-600 hover:bg-amber-50 px-6">+ Upload Assets</Button>)}
              </div>

              {tab === 'contributors' ? (
                <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                   <table className="w-full text-left">
                      <thead className="bg-stone-50/50"><tr className="border-b"><th className="px-10 py-6 text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Contributor</th><th className="px-10 py-6 text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold text-center">Status</th><th className="px-10 py-6 text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold text-right">Action</th></tr></thead>
                      <tbody className="divide-y">
                         {activeProject.contributors.map(c => (
                           <tr key={c.id} onClick={() => { const video = c.memories.find(m => m.type === 'video'); if (video) setViewingVideoUrl(video.url); }} className={cn("transition-colors", c.status === 'submitted' ? "hover:bg-amber-50/30 cursor-pointer group" : "opacity-80")}>
                             <td className="px-10 py-8"><span className={cn("font-bold block mb-1", c.status === 'submitted' ? "text-stone-800" : "text-stone-400")}>{c.name}</span><span className="text-[10px] text-stone-300 font-bold uppercase italic">{c.relationship || 'Friend'}</span></td>
                             <td className="px-10 py-8 text-center"><Badge status={c.status} /></td>
                             <td className="px-10 py-8 text-right">{c.status === 'invited' ? <Button size="sm" variant="ghost">Nudge</Button> : <div className="text-green-600 font-bold text-[10px] tracking-widest uppercase flex items-center justify-end gap-2">Secured <div className="w-2 h-2 rounded-full bg-green-500" /></div>}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              ) : (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 pb-12">
                   {(visualAssets.length > 0 || audioAssets.length > 0) ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {[...visualAssets, ...audioAssets].map(asset => (
                            <Card key={asset.id} onClick={() => setSelectedAsset(asset)} className="p-0 overflow-hidden group border-stone-100 hover:border-amber-200 shadow-sm relative">
                              <div className="aspect-square bg-stone-100 relative overflow-hidden flex items-center justify-center">
                                  {asset.type === 'photo' && <img src={asset.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                                  {asset.type === 'video' && <div className="w-full h-full bg-stone-900 flex items-center justify-center text-white/20"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></div>}
                                  {asset.type === 'audio' && <svg className="w-16 h-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>}
                                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur rounded-md text-[8px] font-bold text-white/80 uppercase tracking-widest italic">{asset.contributorName}</div>
                                  {asset.comments && asset.comments.length > 0 && <div className="absolute bottom-3 right-3 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-lg">{asset.comments.length}</div>}
                              </div>
                              <div className="p-4 bg-white"><h4 className="font-bold text-stone-800 truncate text-sm">{asset.title}</h4></div>
                            </Card>
                          ))}
                      </div>
                   ) : (
                     <div className="py-24 text-center bg-stone-50 rounded-[4rem] border-4 border-dashed border-stone-100 group hover:border-amber-200 transition-colors cursor-pointer" onClick={() => setShowUploadModal(true)}>
                        <p className="text-stone-400 italic serif text-lg max-w-sm mx-auto">The Loom Library is empty. Share photos, videos, and music to flesh out the story.</p>
                     </div>
                   )}
                </div>
              )}
           </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
           <div className="bg-stone-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-8"><span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Intelligence Center</span><div className={cn("w-2 h-2 rounded-full", (isAiEnabled && !isSequencing) ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-stone-700")} /></div>
                 <h4 className="text-3xl font-bold italic serif mb-6">Director Suite</h4>
                 <p className="text-stone-400 text-sm leading-relaxed mb-10 italic">Woven narrative based on everything secured in the Loom.</p>
                 <div className="space-y-3">
                   <Button onClick={handleSequenceLoom} className="w-full bg-amber-500 text-stone-900" disabled={isSequencing || !isAiEnabled}>{isSequencing ? 'Resequencing...' : 'Re-Mix Loom Arc'}</Button>
                   <Button variant="ghost" onClick={() => setShowHistoryModal(true)} className="w-full bg-white/5 border-white/10 text-white">Version History</Button>
                 </div>
              </div>
           </div>
           <div className="bg-white rounded-[3rem] p-10 border shadow-sm relative overflow-hidden"><h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-8 italic">Project Health</h4><div className="space-y-4"><div className="flex justify-between items-center text-xs"><span className="font-bold">Sync Status</span><span className="font-bold text-green-500">Threads Secured</span></div><div className="flex justify-between items-center text-xs"><span className="font-bold">Library Assets</span><span className="text-stone-500">{activeProject.communityAssets.length} Threads</span></div></div></div>
        </div>
      </div>

      {viewingVideoUrl && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[400] flex items-center justify-center p-4 md:p-12" onClick={() => setViewingVideoUrl(null)}>
          <div className="w-full max-w-5xl aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <video src={viewingVideoUrl} autoPlay controls className="w-full h-full" /><button onClick={() => setViewingVideoUrl(null)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;
