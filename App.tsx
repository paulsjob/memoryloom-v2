
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
import { mediaStore } from './lib/mediaStore';
import { seedMockData } from './lib/demoSeeder';

const INITIAL_PROJECTS: Project[] = [
  {
    id: '1',
    title: "Nana Rose's 80th",
    recipientName: "Nana Rose",
    milestone: MilestoneType.BIRTHDAY,
    deadline: '2024-12-20',
    organizerEmail: 'organizer@test.com',
    status: 'COLLECTING',
    isDraft: false,
    theme: 'cinematic',
    contributors: [
      { id: 'c1', name: 'James', relationship: 'Grandson', status: 'submitted', memories: [{ id: 'm1', contributorId: 'c1', contributorName: 'James', type: 'video', url: '/videos/nana_1.mp4', createdAt: new Date().toISOString() }] },
      { id: 'c2', name: 'Lily', relationship: 'Granddaughter', status: 'submitted', memories: [{ id: 'm2', contributorId: 'c2', contributorName: 'Lily', type: 'video', url: '/videos/nana_2.mp4', createdAt: new Date().toISOString() }] },
      { id: 'c3', name: 'Uncle Bob', relationship: 'Brother', status: 'submitted', memories: [{ id: 'm3', contributorId: 'c3', contributorName: 'Uncle Bob', type: 'video', url: '/videos/nana_3.mp4', createdAt: new Date().toISOString() }] },
      { id: 'c4', name: 'Sarah', relationship: 'Niece', status: 'submitted', memories: [{ id: 'm4', contributorId: 'c4', contributorName: 'Sarah', type: 'video', url: '/videos/nana_4.mp4', createdAt: new Date().toISOString() }] },
      { id: 'c5', name: 'Michael', relationship: 'Son', status: 'submitted', memories: [{ id: 'm5', contributorId: 'c5', contributorName: 'Michael', type: 'video', url: '/videos/nana_5.mp4', createdAt: new Date().toISOString() }] },
      { id: 'c6', name: 'Aunt May', relationship: 'Sister', status: 'submitted', memories: [{ id: 'm6', contributorId: 'c6', contributorName: 'Aunt May', type: 'video', url: '/videos/nana_6.mp4', createdAt: new Date().toISOString() }] },
      { id: 'c7', name: 'David', relationship: 'Old Friend', status: 'submitted', memories: [{ id: 'm7', contributorId: 'c7', contributorName: 'David', type: 'video', url: '/videos/nana_7.mp4', createdAt: new Date().toISOString() }] },
    ],
    communityAssets: [],
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const { projects, setProjects, createProject, nudgeContributor, addContributor } = useProject(INITIAL_PROJECTS);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const initAndHydrate = async () => {
      // 1. Seed dummy videos for testing if they aren't there
      await seedMockData();

      // 2. Hydrate URLs from IndexedDB
      const updatedProjects = await Promise.all(projects.map(async (project) => {
        const updatedContributors = await Promise.all(project.contributors.map(async (c) => {
          if (c.status === 'submitted') {
            const memory = c.memories.find(m => m.type === 'video');
            if (memory) {
              // Try to find in IndexedDB (including demo paths)
              const persistedUrl = await mediaStore.getVideoUrl(memory.url);
              if (persistedUrl) {
                return { ...c, memories: c.memories.map(m => m.id === memory.id ? { ...m, url: persistedUrl } : m) };
              }
            }
          }
          return c;
        }));

        const updatedAssets = await Promise.all(project.communityAssets.map(async (a) => {
           if (a.url.startsWith('blob:')) return a; 
           const persistedUrl = await mediaStore.getVideoUrl(a.id);
           return persistedUrl ? { ...a, url: persistedUrl } : a;
        }));

        return { ...project, contributors: updatedContributors, communityAssets: updatedAssets };
      }));
      setProjects(updatedProjects);
    };
    initAndHydrate();
  }, []);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        setHasApiKey(await window.aistudio.hasSelectedApiKey());
      } else {
        setHasApiKey(!!process.env.API_KEY && process.env.API_KEY !== 'undefined');
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

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <Layout onNavigate={(v) => { 
      if (v === 'landing' || v === 'organizer-dashboard') setActiveProjectId(null); 
      setView(v); 
    }}>
      {view === 'landing' && <LandingPage onStart={() => setView('create-project')} />}
      {view === 'organizer-dashboard' && (
        <OrganizerDashboard 
          projects={projects} 
          activeProjectId={activeProjectId}
          isAiEnabled={hasApiKey}
          onConnectAi={handleSelectKey}
          onCreateProject={() => setView('create-project')}
          onOpenProject={(id) => { setActiveProjectId(id); setView('organizer-dashboard'); }}
          onPreviewProject={(id) => { setActiveProjectId(id); setView('preview-video'); }}
          onNudgeContributor={nudgeContributor}
          onAddContributor={addContributor}
          addToast={addToast}
          onRefreshProjects={(newProjects) => setProjects(newProjects)}
        />
      )}
      {view === 'create-project' && <ProjectCreation onCancel={() => setView('landing')} onSubmit={handleLaunch} />}
      {view === 'contributor-portal' && activeProject && (
        <ContributorPortal 
          project={activeProject} 
          onFinish={() => { addToast("Memory successfully added!"); setView('landing'); }} 
          onAddAsset={(asset, blob) => {
            mediaStore.saveVideo(asset.id, blob); 
            setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, communityAssets: [...p.communityAssets, asset] } : p));
          }}
        />
      )}
      {view === 'preview-video' && activeProject && (
        <VideoPreview 
          project={activeProject} 
          isAiEnabled={hasApiKey}
          onConnectAi={handleSelectKey}
          onBack={() => setView('organizer-dashboard')} 
          onError={(e) => addToast(e.message, "error")} 
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
};

export default App;
