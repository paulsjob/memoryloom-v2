
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
      addToast("Failed to generate nudge. Please try again.", "error");
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
    }).catch(() => {
      addToast("Could not copy. Please select and copy manually.", "error");
    });
  };

  const handleEmail = (text: string) => {
    if (!currentNudge) return;
    const subject = encodeURIComponent(`Quick nudge for ${currentNudge.recipientName}'s tribute video!`);
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    markAsNudged();
  };

  const handleSMS = (text: string) => {
    const body = encodeURIComponent(text);
    window.location.href = `sms:?&body=${body}`;
    markAsNudged();
  };

  const handleWhatsApp = (text: string) => {
    const body = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${body}`, '_blank');
    markAsNudged();
  };

  const handleAddContributor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForLogistics || !inviteForm.name) return;
    onAddContributor(selectedProjectForLogistics, inviteForm.name, inviteForm.relationship, inviteForm.email);
    addToast(`${inviteForm.name} added to the loom!`, 'success');
    setInviteForm({ name: '', relationship: '', email: '' });
    setShowInviteModal(false);
  };

  const activeProjectLogistics = projects.find(p => p.id === selectedProjectForLogistics);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Modals remain mostly the same but ensure p-4/p-6 padding is responsive */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-6 md:p-8 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl md:text-2xl font-bold italic serif text-stone-900">Grow the Group</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-stone-400 hover:text-stone-600 p-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddContributor} className="p-6 md:p-8 space-y-5">
               <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Full Name</label>
                  <input required type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-stone-800" placeholder="e.g. Auntie Em" value={inviteForm.name} onChange={e => setInviteForm({...inviteForm, name: e.target.value})} />
               </div>
               <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Relationship</label>
                  <input type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-stone-800" placeholder="e.g. Best friend" value={inviteForm.relationship} onChange={e => setInviteForm({...inviteForm, relationship: e.target.value})} />
               </div>
               <div className="pt-2 pb-6 sm:pb-0">
                  <Button type="submit" className="w-full" size="lg">Add to Project</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      {currentNudge && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-6 md:p-8 border-b border-stone-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl md:text-2xl font-bold italic serif text-stone-900">Send Magic Nudge</h3>
                <p className="text-stone-500 text-xs md:text-sm">Reach out to your friend.</p>
              </div>
              <button onClick={() => setCurrentNudge(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              {[ { vibe: 'Lighthearted', text: currentNudge.funny, color: 'amber' }, { vibe: 'Heartfelt', text: currentNudge.heartfelt, color: 'indigo' }].map((n, i) => (
                <div key={i} className="bg-stone-50 rounded-2xl border border-stone-100 overflow-hidden">
                  <div className="p-5">
                    <p className={`text-[10px] font-bold uppercase tracking-widest text-${n.color}-600 mb-2 italic`}>{n.vibe}</p>
                    <p className="text-stone-700 text-sm leading-relaxed italic">"{n.text}"</p>
                  </div>
                  <div className="p-3 bg-stone-100/50 border-t border-stone-200 flex gap-2">
                     <button onClick={() => handleWhatsApp(n.text)} className="flex-1 py-3 bg-white rounded-xl text-green-600 border border-stone-200 flex items-center justify-center shadow-sm">
                       <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.187-2.59-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.852.449-1.271.607-1.445.157-.175.347-.218.463-.218.115 0 .231.001.332.005.109.004.258-.041.404.311.157.379.541 1.319.588 1.415.047.097.078.21.012.342-.066.133-.1.216-.199.332-.099.117-.208.261-.297.35-.1.1-.205.21-.087.41.117.2.521.859 1.119 1.391.77.686 1.42.901 1.621.999.201.099.319.083.437-.053.118-.136.508-.589.644-.789.137-.201.273-.169.462-.099.19.069 1.2.566 1.407.671.208.104.347.154.397.241.05.087.05.504-.094.908z"/></svg>
                     </button>
                     <button onClick={() => handleCopy(n.text)} className="flex-1 py-3 bg-white rounded-xl text-stone-600 border border-stone-200 flex items-center justify-center shadow-sm">
                       <span className="text-[10px] font-bold uppercase tracking-widest">Copy</span>
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-2 italic serif leading-tight">
            {activeTab === 'projects' ? 'My Projects' : 'Logistics Hub'}
          </h1>
          <p className="text-stone-500 text-sm md:text-base">
            {activeTab === 'projects' 
              ? `Managing ${projects.length} tributes.` 
              : "Track progress and send nudges."}
          </p>
        </div>
        <div className="flex w-full md:w-auto bg-stone-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('projects')}
            className={cn("flex-1 md:flex-none px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all", activeTab === 'projects' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500")}
          >
            All Projects
          </button>
          <button 
            onClick={() => setActiveTab('logistics')}
            className={cn("flex-1 md:flex-none px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all", activeTab === 'logistics' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500")}
          >
            Logistics
          </button>
        </div>
      </div>

      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {projects.map(project => (
            <Card key={project.id} onClick={() => onOpenProject(project.id)} className={cn("group", activeProjectId === project.id && "ring-2 ring-amber-500")}>
              <div className="h-32 md:h-40 bg-stone-100 flex items-center justify-center relative overflow-hidden">
                 <span className="text-4xl md:text-5xl font-serif text-stone-200 italic group-hover:scale-110 transition-transform">
                   {project.recipientName[0]}
                 </span>
                 <div className="absolute top-3 right-3">
                   <Badge status={project.status} />
                 </div>
              </div>
              <div className="p-5 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-stone-800 mb-1 group-hover:text-amber-600 transition-colors">{project.title}</h3>
                <p className="text-sm text-stone-500 mb-4">For {project.recipientName}</p>
                <div className="flex justify-between items-center text-[10px] md:text-xs text-stone-400 font-medium uppercase tracking-wider">
                  <span>{project.contributors.filter(c => c.status === 'submitted').length} Clips</span>
                  <span>Ends {formatDate(project.deadline)}</span>
                </div>
              </div>
            </Card>
          ))}
          <button onClick={onCreateProject} className="border-2 border-dashed border-stone-200 rounded-[2.5rem] md:rounded-[3rem] p-8 text-center hover:border-amber-300 hover:bg-amber-50/30 transition-all flex flex-col items-center justify-center gap-2 group min-h-[200px]">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
              <span className="text-2xl font-bold text-stone-400">+</span>
            </div>
            <span className="font-bold text-sm text-stone-400 group-hover:text-stone-600 uppercase tracking-widest">New Tribute</span>
          </button>
        </div>
      )}

      {activeTab === 'logistics' && (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
           {/* Mobile Project Ribbon / Desktop Sidebar */}
           <div className="lg:col-span-4 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-3 pb-4 lg:pb-0 scrollbar-hide">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectForLogistics(p.id)}
                  className={cn(
                    "min-w-[200px] lg:min-w-0 text-left p-5 md:p-6 rounded-[2rem] border transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2",
                    selectedProjectForLogistics === p.id ? "bg-stone-900 border-stone-900 text-white shadow-xl" : "bg-white border-stone-200"
                  )}
                >
                  <div className="truncate">
                    <p className="font-bold text-base md:text-lg truncate">{p.recipientName}</p>
                    <p className={cn("text-[10px] md:text-xs uppercase font-bold tracking-widest opacity-60", selectedProjectForLogistics === p.id ? "text-stone-300" : "text-stone-500")}>
                      {p.contributors.filter(c => c.status === 'submitted').length} / {p.contributors.length} Ready
                    </p>
                  </div>
                  <div className={cn("hidden lg:flex w-8 h-8 rounded-full items-center justify-center", selectedProjectForLogistics === p.id ? "bg-stone-800" : "bg-stone-50")}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              ))}
           </div>

           {/* Contributor Content */}
           <div className="lg:col-span-8">
             {!selectedProjectForLogistics ? (
               <div className="p-12 text-center bg-white rounded-[2.5rem] border border-stone-200 border-dashed">
                  <h3 className="text-xl font-bold text-stone-800 italic serif mb-2">Select a project</h3>
                  <p className="text-stone-500 text-sm">See who needs a nudge to submit.</p>
               </div>
             ) : (
               <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <h3 className="text-xl md:text-2xl font-bold italic serif">Contributor Status</h3>
                     <div className="flex gap-2 w-full sm:w-auto">
                        <Button size="sm" variant="ghost" className="flex-1 sm:flex-none" onClick={() => setShowInviteModal(true)}>+ Invite</Button>
                        <Button size="sm" variant="secondary" className="flex-1 sm:flex-none" onClick={() => onPreviewProject(selectedProjectForLogistics)} disabled={activeProjectLogistics?.contributors.filter(c => c.status === 'submitted').length === 0}>Review Film</Button>
                     </div>
                  </div>

                  {/* Desktop Table - Hidden on Small Screens */}
                  <div className="hidden sm:block bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                       <thead className="bg-stone-50 border-b border-stone-200">
                          <tr>
                            <th className="px-6 md:px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Name</th>
                            <th className="px-6 md:px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-center">Status</th>
                            <th className="px-6 md:px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-stone-100">
                          {activeProjectLogistics?.contributors.map(c => (
                            <tr key={c.id} className="hover:bg-stone-50/50">
                              <td className="px-6 md:px-8 py-5">
                                <span className="font-bold text-stone-800 block">{c.name}</span>
                                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-tight">{c.relationship}</span>
                              </td>
                              <td className="px-6 md:px-8 py-5 text-center"><Badge status={c.status} /></td>
                              <td className="px-6 md:px-8 py-5 text-right">
                                {c.status === 'invited' ? (
                                  <Button onClick={() => handleFetchNudge(c, activeProjectLogistics)} size="sm" variant="ghost" className="ml-auto" disabled={nudgeLoading === c.id}>Nudge</Button>
                                ) : (
                                  <span className="text-green-600 text-[10px] font-bold uppercase tracking-widest">Ready</span>
                                )}
                              </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List - Hidden on Desktop */}
                  <div className="sm:hidden space-y-4">
                    {activeProjectLogistics?.contributors.map(c => (
                      <div key={c.id} className="bg-white p-5 rounded-[2rem] border border-stone-200 flex justify-between items-center shadow-sm">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-bold text-stone-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-2">{c.relationship || 'Friend'}</p>
                          <Badge status={c.status} />
                        </div>
                        {c.status === 'invited' && (
                          <Button onClick={() => handleFetchNudge(c, activeProjectLogistics)} size="sm" variant="ghost" className="shrink-0" disabled={nudgeLoading === c.id}>Nudge</Button>
                        )}
                      </div>
                    ))}
                  </div>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;
