
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

  const activeProject = projects.find(p => p.id === activeProjectId);

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

  // View 1: Project List (The Root)
  if (!activeProject) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold italic serif text-stone-900 mb-2">My Tributes</h1>
          <p className="text-stone-500">Managing {projects.length} active projects.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map(project => (
            <Card key={project.id} onClick={() => onOpenProject(project.id)} className="group">
              <div className="h-40 bg-stone-100 flex items-center justify-center relative overflow-hidden">
                 <span className="text-5xl font-serif text-stone-200 italic group-hover:scale-110 transition-transform">
                   {project.recipientName[0]}
                 </span>
                 <div className="absolute top-4 right-4">
                   <Badge status={project.status} />
                 </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-stone-800 mb-1 group-hover:text-amber-600 transition-colors">{project.title}</h3>
                <p className="text-sm text-stone-500 mb-4">For {project.recipientName}</p>
                <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                  <span>{project.contributors.filter(c => c.status === 'submitted').length} Clips</span>
                  <span>Ends {formatDate(project.deadline)}</span>
                </div>
              </div>
            </Card>
          ))}
          
          <button 
            onClick={onCreateProject} 
            className="border-2 border-dashed border-stone-200 rounded-[3rem] p-8 flex flex-col items-center justify-center gap-4 group hover:border-amber-300 hover:bg-amber-50/30 transition-all min-h-[280px]"
          >
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
              <span className="text-3xl font-bold text-stone-400">+</span>
            </div>
            <span className="font-bold text-xs text-stone-400 group-hover:text-stone-600 uppercase tracking-[0.2em]">Start New Tribute</span>
          </button>
        </div>
      </div>
    );
  }

  // View 2: Project Logistics Center (The Drill-down)
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Modals */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <h3 className="text-2xl font-bold italic serif mb-6">Grow the Group</h3>
            <form onSubmit={handleAddContributor} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Full Name</label>
                <input required type="text" className="w-full p-4 bg-stone-50 rounded-xl outline-none border border-stone-100 focus:ring-2 focus:ring-amber-500" placeholder="e.g. Auntie Em" value={inviteForm.name} onChange={e => setInviteForm({...inviteForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Relationship</label>
                <input type="text" className="w-full p-4 bg-stone-50 rounded-xl outline-none border border-stone-100 focus:ring-2 focus:ring-amber-500" placeholder="e.g. Best friend" value={inviteForm.relationship} onChange={e => setInviteForm({...inviteForm, relationship: e.target.value})} />
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full">Add to project</Button>
                <button type="button" onClick={() => setShowInviteModal(false)} className="w-full py-3 mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentNudge && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl p-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <h3 className="text-2xl font-bold italic serif mb-6">Send Magic Nudge</h3>
            <div className="space-y-4">
               {[ { vibe: 'Funny', text: currentNudge.funny, color: 'amber' }, { vibe: 'Heartfelt', text: currentNudge.heartfelt, color: 'indigo' }].map((n, i) => (
                 <div key={i} className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2 italic", n.color === 'amber' ? "text-amber-600" : "text-indigo-600")}>{n.vibe}</p>
                    <p className="text-stone-700 italic mb-6 leading-relaxed">"{n.text}"</p>
                    <div className="flex gap-2">
                       <Button size="sm" onClick={() => handleWhatsApp(n.text)} className="bg-green-600">WhatsApp</Button>
                       <Button size="sm" variant="ghost" onClick={() => handleCopy(n.text)}>Copy Text</Button>
                    </div>
                 </div>
               ))}
               <button onClick={() => setCurrentNudge(null)} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-2 mb-8 md:mb-12">
        <button onClick={() => onOpenProject(null)} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-800 transition-colors">Tributes</button>
        <span className="text-stone-300 text-xs">/</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">{activeProject.recipientName}</span>
      </nav>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-12">
              <div>
                <h1 className="text-4xl font-bold italic serif text-stone-900 mb-2 leading-tight">
                  {activeProject.recipientName}'s Hub
                </h1>
                <p className="text-stone-500">
                  {activeProject.contributors.filter(c => c.status === 'submitted').length} of {activeProject.contributors.length} memories gathered.
                </p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                 <Button onClick={() => setShowInviteModal(true)} variant="ghost" size="sm" className="flex-1 sm:flex-none">+ Invite</Button>
                 <Button 
                   onClick={() => onPreviewProject(activeProject.id)} 
                   size="sm" 
                   className="flex-1 sm:flex-none"
                   disabled={activeProject.contributors.filter(c => c.status === 'submitted').length === 0}
                 >
                   Preview Film
                 </Button>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                       <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-stone-400">Contributor</th>
                       <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-center">Status</th>
                       <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-100">
                    {activeProject.contributors.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-8 py-12 text-center text-stone-400 italic">No one invited yet. Click "Invite" to get started!</td>
                      </tr>
                    ) : activeProject.contributors.map(c => (
                      <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <span className="font-bold text-stone-800 block leading-tight mb-1">{c.name}</span>
                           <span className="text-[10px] text-stone-400 uppercase font-bold tracking-tight italic">{c.relationship || 'Friend'}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <Badge status={c.status} />
                        </td>
                        <td className="px-8 py-6 text-right">
                           {c.status === 'invited' ? (
                             <Button 
                               onClick={() => handleFetchNudge(c, activeProject)} 
                               size="sm" 
                               variant="ghost" 
                               className="ml-auto" 
                               disabled={nudgeLoading === c.id}
                             >
                               {nudgeLoading === c.id ? '...' : 'Nudge'}
                             </Button>
                           ) : (
                             <span className="text-green-600 text-[10px] font-bold uppercase tracking-widest">Memory Secured</span>
                           )}
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Scoped Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Narrative Intelligence</span>
                    <div className={cn("w-2 h-2 rounded-full", isAiEnabled ? "bg-green-500 shadow-[0_0_10px_green]" : "bg-stone-600")}></div>
                 </div>
                 
                 <h4 className="text-2xl font-bold italic serif mb-4">
                   {isAiEnabled ? 'Magic Loom Active ✨' : 'Standard Editing'}
                 </h4>
                 
                 <p className="text-stone-400 text-sm leading-relaxed mb-8">
                    {isAiEnabled 
                      ? `We're using Gemini 3 Pro to intelligently group these ${activeProject.contributors.length} contributors into an emotional arc for ${activeProject.recipientName}.`
                      : 'Connect an Intelligence Engine to unlock cinematic sequencing, mood-matching soundtracks, and real-time editing.'}
                 </p>

                 {!isAiEnabled ? (
                   <Button onClick={onConnectAi} className="w-full bg-amber-500 text-stone-900 border-0">Connect Gemini</Button>
                 ) : (
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-300">Analysis Engine Ready</span>
                   </div>
                 )}
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-6 italic">Project Settings</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center py-3 border-b border-stone-50">
                    <span className="text-xs font-bold text-stone-800">Milestone</span>
                    <span className="text-xs text-stone-500">{activeProject.milestone}</span>
                 </div>
                 <div className="flex justify-between items-center py-3 border-b border-stone-50">
                    <span className="text-xs font-bold text-stone-800">Deadline</span>
                    <span className="text-xs text-stone-500">{formatDate(activeProject.deadline)}</span>
                 </div>
                 <div className="flex justify-between items-center py-3">
                    <span className="text-xs font-bold text-stone-800">Vibe</span>
                    <span className="text-xs text-stone-500 italic uppercase">{activeProject.theme}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
