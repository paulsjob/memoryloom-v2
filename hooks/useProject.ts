
import { useState, useCallback } from 'react';
import { Project, MilestoneType, ProjectStatus, Contributor } from '../types';
import { generateId } from '../lib/utils';

export function useProject(initialProjects: Project[]) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const createProject = useCallback((projectData: Partial<Project>) => {
    const newProject: Project = {
      id: generateId(),
      title: projectData.title || `Celebration for ${projectData.recipientName}`,
      recipientName: projectData.recipientName || '',
      milestone: projectData.milestone || MilestoneType.BIRTHDAY,
      deadline: projectData.deadline || '',
      organizerEmail: 'user@example.com',
      status: 'COLLECTING',
      contributors: projectData.contributors || [],
      isDraft: true,
      theme: projectData.theme || 'cinematic',
    };
    setProjects(prev => [newProject, ...prev]);
    return newProject;
  }, []);

  const updateProjectStatus = useCallback((id: string, status: ProjectStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  }, []);

  const nudgeContributor = useCallback((projectId: string, contributorId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        contributors: p.contributors.map(c => 
          c.id === contributorId ? { ...c, lastRemindedAt: new Date().toISOString() } : c
        )
      };
    }));
  }, []);

  const addContributor = useCallback((projectId: string, name: string, relationship?: string, email?: string) => {
    const newContributor: Contributor = {
      id: generateId(),
      name,
      relationship,
      email,
      status: 'invited',
      memories: []
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        contributors: [...p.contributors, newContributor]
      };
    }));

    return newContributor;
  }, []);

  return { projects, setProjects, createProject, updateProjectStatus, nudgeContributor, addContributor };
}
