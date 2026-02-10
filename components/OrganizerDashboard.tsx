
import React, { useState, useEffect } from 'react';
import { Project, Contributor } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { generateNudgeMessage } from '../services/geminiService';
import { cn, formatDate } from '../lib/utils';

interface OrganizerDashboardProps {
  projects: Project[];
  activeProjectId: string | null;
  isAiEnabled: boolean;
  onConnectAi: () => void;
  onCreateProject: () => void;
  onOpenProject: (id: string) => void;
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
  const [activeTab, setActiveTab] = useState<'projects' | 'logistics'>(activeProjectId ? 'logistics' : 'projects');
  const [selectedProjectForLogistics, setSelectedProjectForLogistics] = useState<string | null>(activeProjectId);
  const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);
  const [currentNudge, setCurrentNudge] = useState<NudgeOptions | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', relationship: '', email: '' });

  useEffect(() => {
    if (activeProjectId) {
      setSelectedProjectForLogistics(activeProjectId);
      setActiveTab('logistics');
    }
  }, [activeProjectId]);

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
      addToast("Failed to generate nudge. Standard mode active.", "info");
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
    if (!selectedProjectForLogistics || !inviteForm.name) return;
    onAddContributor(selectedProjectForLogistics, inviteForm.name, inviteForm.relationship, inviteForm.email);
    addToast(`${inviteForm.name} added!`, 'success');
    setInviteForm({ name: '', relationship: '', email: '' });
    setShowInviteModal(false);
  };

  const activeProjectLogistics = projects.find(p => p.id === selectedProjectForLogistics);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {showInviteModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8">
            <h3 className="text-2xl font-bold italic serif mb-6">Invite a Friend</h3>
            <form onSubmit={handleAddContributor} className="space-y-4">
              <input required type="text" className="w-full p-4 bg-stone-50 rounded-xl outline-none border" placeholder="Full Name" value={inviteForm.name} onChange={e => setInviteForm({...inviteForm, name: e.target.value})} />
              <input type="text" className="w-full p-4 bg-stone-50 rounded-xl outline-none border" placeholder="Relationship" value={inviteForm.relationship} onChange={e => setInviteForm({...inviteForm, relationship: e.target.value})} />
              <Button type="submit" className="w-full">Add Contributor</Button>
              <button onClick={() => setShowInviteModal(false)} className="w-full py-2 text-stone-400 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {currentNudge && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl p-8">
            <h3 className="text-2xl font-bold italic serif mb-6">Magic Nudge</h3>
            <div className="space-y-4">
               {[ { vibe: 'Funny', text: currentNudge.funny }, { vibe: 'Heartfelt', text: currentNudge.heartfelt }].map((n, i) => (
                 <div key={i} className="p-6 bg-stone-50 rounded-2xl border">
                    <p className="text-[10px] font-bold uppercase text-stone-400 mb-2">{n.vibe}</p>
                    <p className="text-stone-700 italic mb-4">"{n.text}"</p>
                    <div className="flex gap-2">
                       <Button size="sm" onClick={() => handleWhatsApp(n.text)} className="bg-green-600">WhatsApp</Button>
                       <Button size="sm" variant="ghost" onClick={() => handleCopy(n.text)}>Copy</Button>
                    </div>
                 </div>
               ))}
               <button onClick={() => setCurrentNudge(null)} className="w-full py-2 text-stone-400 font-bold uppercase text-[10px]">Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold italic serif leading-tight">Dashboard</h1>
          <p className="text-stone-500">Managing {projects.length} tributes.</p>
        </div>
        <div className="flex w-full md:w-auto bg-stone-100 p-1 rounded-2xl">
          <button onClick={() => setActiveTab('projects')} className={cn("flex-1 px-6 py-2 rounded-xl text-xs font-bold transition-all", activeTab === 'projects' ? "bg-white shadow-sm" : "text-stone-500")}>Projects</button>
          <button onClick={() => setActiveTab('logistics')} className={cn("flex-1 px-6 py-2 rounded-xl text-xs font-bold transition-all", activeTab === 'logistics' ? "bg-white shadow-sm" : "text-stone-500")}>Logistics</button>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-8">
           {activeTab === 'projects' ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               {projects.map(p => (
                 <Card key={p.id} onClick={() => onOpenProject(p.id)} className={cn(activeProjectId === p.id && "ring-2 ring-amber-500")}>
                    <div className="h-32 bg-stone-100 flex items-center justify-center"><span className="text-3xl italic serif text-stone-300">{p.recipientName[0]}</span></div>
                    <div className="p-6">
                       <h3 className="font-bold text-lg">{p.recipientName}</h3>
                       <p className="text-xs text-stone-500">{p.milestone}</p>
                    </div>
                 </Card>
               ))}
               <button onClick={onCreateProject} className="border-2 border-dashed border-stone-200 rounded-[2.5rem] p-8 text-stone-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center h-full min-h-[160px]">+ New Project</button>
             </div>
           ) : (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-bold italic serif">Logistics Center</h3>
                   <Button size="sm" onClick={() => onPreviewProject(selectedProjectForLogistics || '')}>Preview Video</Button>
                </div>
                <div className="bg-white rounded-[2rem] border overflow-hidden">
                   {activeProjectLogistics?.contributors.map(c => (
                     <div key={c.id} className="p-6 border-b last:border-0 flex justify-between items-center">
                        <div>
                           <p className="font-bold">{c.name}</p>
                           <p className="text-[10px] text-stone-400 uppercase tracking-widest">{c.status}</p>
                        </div>
                        {c.status === 'invited' && <Button size="sm" variant="ghost" onClick={() => handleFetchNudge(c, activeProjectLogistics)}>Nudge</Button>}
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">Narrative Engine</span>
                    <div className={cn("w-2 h-2 rounded-full", isAiEnabled ? "bg-green-500 shadow-[0_0_10px_green]" : "bg-stone-600")}></div>
                 </div>
                 <h4 className="text-xl font-bold italic serif mb-4">{isAiEnabled ? 'Magic Loom Enabled ✨' : 'Standard Mode'}</h4>
                 <p className="text-stone-400 text-xs leading-relaxed mb-6">
                    {isAiEnabled 
                      ? 'MemoryLoom is using Gemini 3 Pro to intelligently sequence your videos and find emotional arcs.'
                      : 'Connect an Intelligence Engine to unlock automatic sequencing, mood matching, and director chat.'}
                 </p>
                 {!isAiEnabled ? (
                   <Button onClick={onConnectAi} className="w-full bg-amber-500 text-stone-900 border-0">Connect Gemini</Button>
                 ) : (
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-stone-300">
                      Engine Connected
                   </div>
                 )}
              </div>
           </div>
           
           <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-6">Coming Soon</h4>
              <div className="space-y-4 opacity-40 grayscale pointer-events-none">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400">GPT</div>
                    <span className="text-xs font-bold">OpenAI Integration</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400">CL</div>
                    <span className="text-xs font-bold">Claude Integration</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
