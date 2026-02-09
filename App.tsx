
import React, { useState } from 'react';
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

const INITIAL_PROJECTS: Project[] = [
  {
    id: '1',
    title: "Nana's 80th Bash",
    recipientName: "Nana Rose",
    milestone: MilestoneType.BIRTHDAY,
    deadline: '2024-05-20',
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
  const { projects, createProject, nudgeContributor, addContributor } = useProject(INITIAL_PROJECTS);
  const { toasts, addToast, removeToast } = useToast();

  const handleLaunch = (projectData: Partial<Project>) => {
    const newProject = createProject(projectData);
    setActiveProjectId(newProject.id);
    // Stay in dashboard but switch focus
    setView('organizer-dashboard');
    addToast(`Project for ${newProject.recipientName} is live!`, 'success');
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  const renderView = () => {
    switch (view) {
      case 'landing':
        return <LandingPage onStart={() => setView('create-project')} />;
      case 'organizer-dashboard':
        return (
          <OrganizerDashboard 
            projects={projects} 
            activeProjectId={activeProjectId}
            onCreateProject={() => setView('create-project')}
            onOpenProject={(id) => {
              setActiveProjectId(id);
              // We stay in the dashboard now to show logistics/management
            }}
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
        return (
          <ProjectCreation 
            onCancel={() => setView('landing')} 
            onSubmit={handleLaunch}
          />
        );
      case 'contributor-portal':
        if (!activeProject) return setView('landing');
        return (
          <ContributorPortal 
            project={activeProject} 
            onFinish={() => {
              addToast("Your memory was successfully added!");
              setView('landing');
            }} 
          />
        );
      case 'preview-video':
        if (!activeProject) return setView('organizer-dashboard');
        return <VideoPreview project={activeProject} onBack={() => setView('organizer-dashboard')} />;
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
