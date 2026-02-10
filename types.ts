
export enum MilestoneType {
  BIRTHDAY = 'Birthday',
  RETIREMENT = 'Retirement',
  ANNIVERSARY = 'Anniversary',
  MEMORIAL = 'Memorial',
  WEDDING = 'Wedding',
  GRADUATION = 'Graduation',
  TEAM_SENDOFF = 'Team Sendoff'
}

export type ProjectStatus = 'COLLECTING' | 'PROCESSING' | 'REVIEWING' | 'READY';

export interface StoryboardTheme {
  id: string;
  themeName: string;
  contributors: string[];
  suggestedTransition: string;
  isPinned: boolean;
  order: number;
  emotionalBeat: string;
  isClimax?: boolean;
  videoUrl?: string;
  assetId?: string;
  assetType?: 'video' | 'photo' | 'audio';
  contributorName?: string;
}

export interface SavedSequence {
  id: string;
  timestamp: string;
  storyboard: StoryboardTheme[];
  snapshotName: string;
}

export interface Memory {
  id: string;
  contributorId: string;
  contributorName: string;
  type: 'video' | 'photo' | 'audio';
  url: string;
  thumbnailUrl?: string;
  transcript?: string;
  emotionalBeat?: 'The Punchline' | 'The Tearjerker' | 'The Legacy Lesson' | 'The Inside Joke' | 'The Final Wish';
  duration?: number;
  createdAt: string;
}

export interface AssetComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface CommunityAsset {
  id: string;
  contributorName: string;
  type: 'video' | 'photo' | 'audio';
  url: string;
  title: string;
  description: string;
  editorNotes?: string;
  createdAt: string;
  comments?: AssetComment[];
}

export interface Contributor {
  id: string;
  name: string;
  relationship?: string;
  email?: string;
  status: 'invited' | 'submitted';
  memories: Memory[];
  lastRemindedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  recipientName: string;
  milestone: MilestoneType;
  deadline: string;
  organizerEmail: string;
  status: ProjectStatus;
  contributors: Contributor[];
  communityAssets: CommunityAsset[];
  isDraft: boolean;
  theme: 'cinematic' | 'playful' | 'minimal' | 'documentary';
  musicId?: string;
  musicUrl?: string;
  storyboard?: StoryboardTheme[];
  storyboardHistory?: SavedSequence[];
  aiTone?: string;
}

export type AppView = 'landing' | 'organizer-dashboard' | 'create-project' | 'contributor-portal' | 'preview-video';
