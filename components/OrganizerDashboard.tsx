
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

  // When activeProjectId changes (e.g. from creation), switch tabs automatically
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
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Invite Modal Overlay */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-md z-[150] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-2xl font-bold italic serif text-stone-900">Grow the Group</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-stone-400 hover:text-stone-600 p-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddContributor} className="p-8 space-y-5">
               <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Full Name</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all text-stone-800"
                    placeholder="e.g. Auntie Em"
                    value={inviteForm.name}
                    onChange={e => setInviteForm({...inviteForm, name: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Relationship / Role</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all text-stone-800"
                    placeholder="e.g. Best friend from college"
                    value={inviteForm.relationship}
                    onChange={e => setInviteForm({...inviteForm, relationship: e.target.value})}
                  />
                  <p className="mt-1.5 text-[10px] text-stone-400 italic font-medium leading-tight">This helps our AI host frame the nudge and interview prompts.</p>
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Email (Optional)</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all text-stone-800"
                    placeholder="em@family.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                  />
               </div>
               <div className="pt-2">
                  <Button type="submit" className="w-full" size="lg">Add to Project</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Nudge Selection Overlay */}
      {currentNudge && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-md z-[150] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="p-8 border-b border-stone-100 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold italic serif text-stone-900">Send Magic Nudge</h3>
                <p className="text-stone-500 text-sm">Choose a vibe and a channel to reach your friend.</p>
              </div>
              <button onClick={() => setCurrentNudge(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group relative bg-stone-50 rounded-3xl border border-stone-100 flex flex-col h-full hover:border-amber-300 transition-all overflow-hidden">
                <div className="p-6 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-3 italic">Lighthearted</p>
                  <p className="text-stone-700 text-sm leading-relaxed italic">"{currentNudge.funny}"</p>
                </div>
                <div className="p-4 bg-stone-100/50 border-t border-stone-200 grid grid-cols-4 gap-2">
                   <button onClick={() => handleWhatsApp(currentNudge.funny)} className="p-3 bg-white rounded-xl hover:bg-green-50 text-green-600 border border-stone-200 flex items-center justify-center transition-all hover:scale-105 shadow-sm" title="WhatsApp">
                     <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.187-2.59-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.852.449-1.271.607-1.445.157-.175.347-.218.463-.218.115 0 .231.001.332.005.109.004.258-.041.404.311.157.379.541 1.319.588 1.415.047.097.078.21.012.342-.066.133-.1.216-.199.332-.099.117-.208.261-.297.35-.1.1-.205.21-.087.41.117.2.521.859 1.119 1.391.77.686 1.42.901 1.621.999.201.099.319.083.437-.053.118-.136.508-.589.644-.789.137-.201.273-.169.462-.099.19.069 1.2.566 1.407.671.208.104.347.154.397.241.05.087.05.504-.094.908z"/></svg>
                   </button>
                   <button onClick={() => handleSMS(currentNudge.funny)} className="p-3 bg-white rounded-xl hover:bg-blue-50 text-blue-500 border border-stone-200 flex items-center justify-center transition-all hover:scale-105 shadow-sm" title="SMS">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                   </button>
                   <button onClick={() => handleEmail(currentNudge.funny)} className="p-3 bg-white rounded-xl hover:bg-stone-50 text-stone-600 border border-stone-200 flex items-center justify-center transition-all hover:scale-105 shadow-sm" title="Email">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                   </button>
                   <button onClick={() => handleCopy(currentNudge.funny)} className="p-3 bg-white rounded-xl hover:bg-amber-50 text-amber-600 border border-stone-200 flex items-center justify-center transition-all hover:scale-105 shadow-sm" title="Copy Text">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 00-2 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                   </button>
                </div>
              </div>

              <div className="group relative bg-stone-50 rounded-3xl border border-stone-100 flex flex-col h-full hover:border-indigo-300 transition-all overflow-hidden">
                <div className="p-6 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-3 italic">Heartfelt</p>
                  <p className="text-stone-700 text-sm leading-relaxed italic">"{currentNudge.heartfelt}"</p>
                </div>
                <div className="p-4 bg-stone-100/50 border-t border-stone-200 grid grid-cols-4 gap-2">
                   <button onClick={() => handleWhatsApp(currentNudge.heartfelt)} className="p-3 bg-white rounded-xl hover:bg-green-50 text-green-600 border border-stone-200 flex items-center justify-center transition-all hover:scale-105 shadow-sm" title="WhatsApp">
                     <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.187-2.59-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.852.449-1.271.607-1.445.157-.175.347-.218.463-.218.115 0 .231.001.332.005.109.004.258-.041.404.311.157.379.541 1.319.588 1.415.047.097.078.21.012.342-.066.133-.1.216-.199.332-.099.117-.208.261-.297.35-.1.1-.205.21-.087.41.117.2.521.859 1.119 1.391.77.686 1.42.901 1.621.999.201.099.319.083.437-.053.118-.136.508-.589.644-.789.137-.201.273-.169.462-.099.19.069 1.2.566 1.407.671.208.104.347.154.397.241.05.087.05.504-.094.908z"/></svg>
                   </button>
                   <button onClick={() => handleSMS(currentNudge.heartfelt)} className="p-3 bg-white rounded-xl hover:bg-blue-50 text-blue-500 border border-stone-200 flex items-center justify-center transition-all hover:scale-105 shadow-sm" title="SMS">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                   </button>
                   <button onClick={() => handleEmail(currentNudge.heartfelt)} className="p-3 bg-white rounded-xl hover:bg-stone-50 text-stone-600 border border-stone-200 flex items-center justify-center transition-all hover:scale-105 shadow-sm" title="Email">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                   </button>
                   <button onClick={() => handleCopy(currentNudge.heartfelt)} className="p-3 bg-white rounded-xl hover:bg-amber-50 text-amber-600 border border-stone-200 flex items-center justify-center transition-all hover:scale-105 shadow-sm" title="Copy Text">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 00-2 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                   </button>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
               <div className="flex items-center gap-3 text-stone-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs font-medium italic">Choosing an action will automatically update the contributor's nudge status.</p>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-stone-900 mb-2 italic serif">
            {activeTab === 'projects' ? 'My Projects' : 'Logistics Hub'}
          </h1>
          <p className="text-stone-500">
            {activeTab === 'projects' 
              ? `Managing ${projects.length} memories in progress.` 
              : "Track who's in, who's out, and who needs a nudge."}
          </p>
        </div>
        <div className="flex gap-2 bg-stone-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('projects')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === 'projects' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            All Projects
          </button>
          <button 
            onClick={() => setActiveTab('logistics')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === 'logistics' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            Logistics
          </button>
        </div>
      </div>

      {activeTab === 'projects' && (
        projects.length === 0 ? (
          <div className="border-2 border-dashed border-stone-200 rounded-[3rem] p-20 text-center bg-white/50">
            <h3 className="text-2xl font-bold text-stone-800 mb-2 italic serif">No tributes yet</h3>
            <p className="text-stone-500 max-w-xs mx-auto mb-8">Ready to make someone feel seen? Create your first tribute video project today.</p>
            <Button onClick={onCreateProject} size="lg">Start First Project</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {projects.map(project => (
              <Card 
                key={project.id} 
                onClick={() => onOpenProject(project.id)}
                className={cn("group", activeProjectId === project.id && "ring-2 ring-amber-500 shadow-xl")}
              >
                <div className="h-40 bg-stone-100 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-amber-500/5 group-hover:scale-110 transition-transform duration-700"></div>
                   <span className="text-4xl font-serif text-stone-300 relative z-10 group-hover:text-amber-400 group-hover:scale-125 transition-all duration-500">
                     {project.recipientName[0]}
                   </span>
                   <div className="absolute top-4 right-4">
                     <Badge status={project.status} />
                   </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-stone-800 mb-1 group-hover:text-amber-600 transition-colors">{project.title}</h3>
                  <p className="text-sm text-stone-500 mb-4">For {project.recipientName}</p>
                  
                  <div className="flex justify-between items-center text-xs text-stone-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {project.contributors.filter(c => c.status === 'submitted').length} Clips
                    </div>
                    <div>
                      Ends {formatDate(project.deadline)}
                    </div>
                  </div>

                  <div className="mt-4 w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-400 h-full transition-all duration-1000" 
                      style={{ width: `${(project.contributors.filter(c => c.status === 'submitted').length / Math.max(project.contributors.length, 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </Card>
            ))}
            <button 
              onClick={onCreateProject}
              className="border-2 border-dashed border-stone-200 rounded-[3rem] p-6 text-center hover:border-amber-300 hover:bg-amber-50/30 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                <span className="text-2xl font-bold">+</span>
              </div>
              <span className="font-bold text-stone-400 group-hover:text-stone-600">Start New Project</span>
            </button>
          </div>
        )
      )}

      {activeTab === 'logistics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in slide-in-from-right-10 duration-500">
           {/* Project Selector Sidebar */}
           <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 italic">Select a Project</h3>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectForLogistics(p.id)}
                  className={cn(
                    "w-full text-left p-6 rounded-3xl border transition-all flex items-center justify-between group",
                    selectedProjectForLogistics === p.id 
                      ? "bg-stone-900 border-stone-900 text-white shadow-xl" 
                      : "bg-white border-stone-200 text-stone-800 hover:border-amber-500 hover:shadow-md"
                  )}
                >
                  <div>
                    <p className="font-bold text-lg">{p.recipientName}</p>
                    <p className={cn("text-xs", selectedProjectForLogistics === p.id ? "text-stone-400" : "text-stone-500")}>
                      {p.contributors.filter(c => c.status === 'submitted').length} / {p.contributors.length} complete
                    </p>
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    selectedProjectForLogistics === p.id ? "bg-stone-800" : "bg-stone-50"
                  )}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
           </div>

           {/* Contributor List */}
           <div className="lg:col-span-8">
             {!selectedProjectForLogistics ? (
               <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border border-stone-200 border-dashed">
                  <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4 text-stone-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-stone-800 italic serif">Choose a project to manage</h3>
                  <p className="text-stone-500 max-w-xs mx-auto mt-2">See who hasn't submitted yet and send them a gentle AI nudge.</p>
               </div>
             ) : (
               <div className="space-y-6">
                  <div className="flex justify-between items-center mb-8">
                     <h3 className="text-2xl font-bold italic serif">Contributor Status</h3>
                     <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowInviteModal(true)}>Invite More People</Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => onPreviewProject(selectedProjectForLogistics)}
                          disabled={activeProjectLogistics?.contributors.filter(c => c.status === 'submitted').length === 0}
                        >
                          Review & Edit Film
                        </Button>
                     </div>
                  </div>

                  <div className="bg-white rounded-[3rem] border border-stone-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                       <thead className="bg-stone-50 border-b border-stone-200">
                          <tr>
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Name</th>
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-center">Status</th>
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-stone-100">
                          {activeProjectLogistics?.contributors.map(c => (
                            <tr key={c.id} className="group hover:bg-stone-50/50 transition-colors">
                              <td className="px-8 py-5">
                                <span className="font-bold text-stone-800">{c.name}</span>
                                <div className="flex flex-col">
                                  <p className="text-xs text-stone-500 italic mb-0.5">{c.relationship || 'Unspecified role'}</p>
                                  <p className="text-[10px] text-stone-400">{c.email || 'Invite link only'}</p>
                                  {c.lastRemindedAt && (
                                    <p className="text-[10px] text-amber-500 font-bold uppercase mt-1 italic">
                                      Last Nudged: {new Date(c.lastRemindedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-center">
                                <Badge status={c.status} />
                              </td>
                              <td className="px-8 py-5 text-right">
                                {c.status === 'invited' ? (
                                  <Button 
                                    onClick={() => handleFetchNudge(c, activeProjectLogistics)} 
                                    size="sm" 
                                    variant="ghost" 
                                    className="ml-auto"
                                    disabled={nudgeLoading === c.id}
                                  >
                                    {nudgeLoading === c.id ? 'Thinking...' : 'Magic Nudge'}
                                  </Button>
                                ) : (
                                  <div className="flex items-center justify-end gap-2 text-green-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Memory Secured</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
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
