
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import OrganizerDashboard from './components/OrganizerDashboard';
import ProjectCreation from './components/ProjectCreation';
import ContributorPortal from './components/ContributorPortal';
import VideoPreview from './components/VideoPreview';
import { Project, AppView, MilestoneType, Memory, Contributor } from './types';
import { useProject } from './hooks/useProject';
import { ToastContainer } from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import { mediaStore } from './lib/mediaStore';

// Map to your local /public/videos folder
const LOCAL_VIDEOS = [
  "/videos/nana_1.mp4",
  "/videos/nana_2.mp4",
  "/videos/nana_3.mp4",
  "/videos/nana_4.mp4",
  "/videos/nana_5.mp4",
  "/videos/nana_6.mp4",
  "/videos/nana_7.mp4",
];

const createDummyContributor = (id: string, name: string, relation: string, videoIndex: number): Contributor => ({
  id,
  name,
  relationship: relation,
  status: 'submitted',
  memories: [{
    id: `m-${id}`,
    contributorId: id,
    contributorName: name,
    type: 'video',
    url: LOCAL_VIDEOS[videoIndex],
    createdAt: new Date().toISOString()
  } as Memory]
});

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
      createDummyContributor('c1', 'James', 'Grandson', 0),
      createDummyContributor('c2', 'Lily', 'Granddaughter', 1),
      createDummyContributor('c3', 'Uncle Bob', 'Brother', 2),
      createDummyContributor('c4', 'Sarah', 'Niece', 3),
      createDummyContributor('c5', 'Michael', 'Son', 4),
      createDummyContributor('c6', 'Aunt May', 'Sister', 5),
      createDummyContributor('c7', 'David', 'Old Friend', 6),
      { 
        id: 'c8', 
        name: 'Linda', 
        relationship: 'Cousin', 
        status: 'invited', 
        memories: [] 
      },
    ]
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const { projects, setProjects, createProject, nudgeContributor, addContributor } = useProject(INITIAL_PROJECTS);
  const { toasts, addToast, removeToast } = useToast();

  // Load persisted media on startup
  useEffect(() => {
    const loadPersistedMedia = async () => {
      const updatedProjects = await Promise.all(projects.map(async (project) => {
        const updatedContributors = await Promise.all(project.contributors.map(async (c) => {
          if (c.status === 'submitted') {
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
          }
          return c;
        }));
        return { ...project, contributors: updatedContributors };
      }));
      setProjects(updatedProjects);
    };
    loadPersistedMedia();
  }, []);

  useEffect(() => {
    const checkKey = async () => {
      if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        setHasApiKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      addToast("Narrative Engine Connected!", "success");
    }
  };

  const handleLaunch = (projectData: Partial<Project>) => {
    const newProject = createProject(projectData);
    setActiveProjectId(newProject.id);
    setView('organizer-dashboard');
    addToast(`Project for ${newProject.recipientName} is live!`, 'success');
  };

  const handleApiError = (error: any) => {
    if (error?.message?.includes("Requested entity was not found.")) {
      setHasApiKey(false);
      addToast("AI Engine session expired. Switching to Standard Mode.", "info");
    }
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
            isAiEnabled={hasApiKey}
            onConnectAi={handleSelectKey}
            onCreateProject={() => setView('create-project')}
            onOpenProject={(id) => {
              setActiveProjectId(id);
              setView('organizer-dashboard');
            }}
            onPreviewProject={(id) => {
              setActiveProjectId(id);
              setView('preview-video');
            }}
            onNudgeContributor={nudgeContributor}
            onAddContributor={addContributor}
            addToast={addToast}
            onRefreshProjects={(newProjects) => setProjects(newProjects)}
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
        return (
          <VideoPreview 
            project={activeProject} 
            isAiEnabled={hasApiKey}
            onConnectAi={handleSelectKey}
            onBack={() => setView('organizer-dashboard')} 
            onError={handleApiError} 
          />
        );
      default:
        return <LandingPage onStart={() => setView('create-project')} />;
    }
  };

  return (
    <Layout onNavigate={(v) => { 
      if (v === 'landing' || v === 'organizer-dashboard') setActiveProjectId(null); 
      setView(v); 
    }}>
      {renderView()}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="fixed bottom-4 right-4 flex gap-2 bg-white/50 backdrop-blur border border-white/30 p-2 rounded-full shadow-lg opacity-20 hover:opacity-100 transition-opacity z-[100]">
        <button onClick={() => { setActiveProjectId(null); setView('landing'); }} className="text-[10px] font-bold px-2 py-1">Home</button>
        <button onClick={() => { setActiveProjectId(null); setView('organizer-dashboard'); }} className="text-[10px] font-bold px-2 py-1">Gallery</button>
      </div>
    </Layout>
  );
};

export default App;
