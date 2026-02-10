
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import OrganizerDashboard from './components/OrganizerDashboard';
import ProjectCreation from './components/ProjectCreation';
import ContributorPortal from './components/ContributorPortal';
import VideoPreview from './components/VideoPreview';
import { Project, AppView, MilestoneType } from './types';
import { useProject } from './hooks/useProject';
import { ToastContainer } from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import { Button } from './components/ui/Button';

// Extended window type for AI Studio helpers
// Fix: Use the named AIStudio interface for window.aistudio to match environment-provided types.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio: AIStudio;
  }
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: '1',
    title: "Nana's 80th Bash",
    recipientName: "Nana Rose",
    milestone: MilestoneType.BIRTHDAY,
    deadline: '2024-12-20',
    organizerEmail: 'organizer@test.com',
    status: 'COLLECTING',
    isDraft: false,
    theme: 'cinematic',
    contributors: [
      { id: 'c1', name: 'James', relationship: 'Grandson', email: 'james@test.com', status: 'submitted', memories: [] },
      { id: 'c2', name: 'Lily', relationship: 'Granddaughter', email: 'lily@test.com', status: 'submitted', memories: [] },
      { id: 'c3', name: 'Uncle Bob', relationship: 'Brother', email: 'bob@test.com', status: 'invited', memories: [] },
    ]
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const { projects, createProject, nudgeContributor, addContributor } = useProject(INITIAL_PROJECTS);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const checkKey = async () => {
      // Check if we are in an environment with selection support
      if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        // Fallback: check if the injected environment variable is present
        setHasApiKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Per instructions: assume success after triggering to avoid race conditions
      setHasApiKey(true);
    }
  };

  const handleLaunch = (projectData: Partial<Project>) => {
    const newProject = createProject(projectData);
    setActiveProjectId(newProject.id);
    setView('organizer-dashboard');
    addToast(`Project for ${newProject.recipientName} is live!`, 'success');
  };

  /**
   * Global API Error Handler
   * Resets the API key state if the requested entity is not found,
   * indicating the session or project associated with the key is invalid.
   */
  const handleApiError = (error: any) => {
    if (error?.message?.includes("Requested entity was not found.")) {
      setHasApiKey(false);
      addToast("Your API key session has expired. Please select a project with billing enabled.", "error");
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  const renderView = () => {
    // API Key Gate for High Quality / Pro features
    if (hasApiKey === false) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-700">
             <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto text-amber-500 shadow-xl shadow-amber-100">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
             </div>
             <div>
                <h2 className="text-3xl font-bold text-stone-900 italic serif mb-4">Unlock Narrative Intelligence</h2>
                <p className="text-stone-500 mb-8 leading-relaxed">
                  MemoryLoom uses Gemini 3 Pro to weave your memories into cinematic stories. Please select a paid API key to continue.
                </p>
                <div className="space-y-4">
                  <Button onClick={handleSelectKey} size="lg" className="w-full">Select API Key</Button>
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-amber-600 transition-colors"
                  >
                    Learn about Billing & Setup
                  </a>
                </div>
             </div>
          </div>
        </div>
      );
    }

    if (hasApiKey === null) return null; // Still checking

    switch (view) {
      case 'landing':
        return <LandingPage onStart={() => setView('create-project')} />;
      case 'organizer-dashboard':
        return (
          <OrganizerDashboard 
            projects={projects} 
            activeProjectId={activeProjectId}
            onCreateProject={() => setView('create-project')}
            onOpenProject={(id) => setActiveProjectId(id)}
            onPreviewProject={(id) => {
              setActiveProjectId(id);
              setView('preview-video');
            }}
            onNudgeContributor={nudgeContributor}
            onAddContributor={addContributor}
            addToast={addToast}
          />
        );
      case 'create-project':
        return <ProjectCreation onCancel={() => setView('landing')} onSubmit={handleLaunch} />;
      case 'contributor-portal':
        if (!activeProject) { setTimeout(() => setView('landing'), 0); return null; }
        return (
          <ContributorPortal 
            project={activeProject} 
            onFinish={() => {
              addToast("Memory successfully added!");
              setView('landing');
            }} 
          />
        );
      case 'preview-video':
        if (!activeProject) { setTimeout(() => setView('organizer-dashboard'), 0); return null; }
        return <VideoPreview project={activeProject} onBack={() => setView('organizer-dashboard')} onError={handleApiError} />;
      default:
        return <LandingPage onStart={() => setView('create-project')} />;
    }
  };

  return (
    <Layout onNavigate={setView}>
      {renderView()}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Quick Switcher (Dev only) */}
      <div className="fixed bottom-4 right-4 flex gap-2 bg-white/50 backdrop-blur border border-white/30 p-2 rounded-full shadow-lg opacity-20 hover:opacity-100 transition-opacity z-[100]">
        <button onClick={() => setView('landing')} className="text-[10px] font-bold px-2 py-1">Home</button>
        <button onClick={() => { setActiveProjectId(projects[0].id); setView('contributor-portal'); }} className="text-[10px] font-bold px-2 py-1">Portal</button>
        <button onClick={() => setView('organizer-dashboard')} className="text-[10px] font-bold px-2 py-1">Dash</button>
      </div>
    </Layout>
  );
};

export default App;
