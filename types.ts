
export interface JournalEntry {
  id: string;
  content: string;
  timestamp: Date;
  hasTime?: boolean; // New field to track if time was explicit
  source: 'user' | 'web-input' | 'obsidian' | 'ai-reply' | 'chat';
  isImportant: boolean;
  isSaved?: boolean;
  likes?: string[]; // Timestamp strings of when it was liked
  comments?: RecallItemComment[];
}

export interface DeletedEntry extends JournalEntry {
  deletedAt: Date;
  originalDateKey: string;
}

export interface ResponseStyle {
  id: string;
  name: string;
  prompt: string;
  isActive: boolean;
}

export interface DailyData {
  date: string; // ISO date string YYYY-MM-DD
  entries: JournalEntry[];
  summary?: {
    text: string;
    mood: {
      label: string;
      suggestion: string;
      trend: string;
    };
    stats: {
      count: number;
      tasksCompleted: number;
      details: string[];
    };
    keywords: string[];
    happiness: string[]; // Things that felt happy
    [key: string]: any; 
  };
}

export interface RecallItemComment {
  id: string;
  date: string;
  text: string;
}

export interface RecallItem {
  id: string;
  title: string;
  snippet: string;
  fullContent?: string; // For the modal view
  date: string;
  relevanceScore: number;
  type: 'journal' | 'vault';
  keyword?: string;
  isPinned?: boolean; // Changed from isStarred to match "Pin" requirement
  isHidden?: boolean;
  likes?: string[]; // Array of timestamps like "260101"
  comments?: RecallItemComment[];
}

export enum Tab {
  TODO = 'TODO',
  JOURNAL = 'JOURNAL',
  VAULT = 'VAULT'
}

export interface DataSource {
  id: string;
  type: 'google-calendar' | 'google-drive' | 'obsidian' | 'local' | 'url' | 'notion';
  name: string;
  detail: string; // e.g. path or url
  config?: Record<string, string>; // Store API keys, IDs, etc.
  isConnected: boolean;
  fileHandle?: any; // FileSystemDirectoryHandle
}

export type AccentColor = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'slate';

export interface AppSettings {
  language: 'English' | 'Chinese';
  theme: 'light' | 'dark' | 'system';
  accentColor: AccentColor;
  connections: {
    todo: DataSource[];
    journal: DataSource[];
    vault: DataSource[];
  };
  responseStyles: ResponseStyle[];
}

export interface OverviewSectionConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  prompt?: string;
}
