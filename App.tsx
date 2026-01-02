import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Settings, User, Layout, CheckSquare, Book } from 'lucide-react';
import { Tab, JournalEntry, DailyData, RecallItem, AppSettings, DeletedEntry, OverviewSectionConfig } from './types';
import LeftColumn from './components/LeftColumn';
import MiddleColumn from './components/MiddleColumn';
import RightColumn from './components/RightColumn';
import SettingsModal from './components/SettingsModal';
import TrashModal from './components/TrashModal';
import CustomizeOverviewModal from './components/CustomizeOverviewModal';
import { findAssociations, generateEntryReply } from './services/geminiService';
import { translations, Language } from './utils/translations';

// --- Mock Initial Data ---
const TODAY_KEY = format(new Date(), 'yyyy-MM-dd');
const YESTERDAY_KEY = format(subDays(new Date(), 1), 'yyyy-MM-dd');

const MOCK_ENTRIES: Record<string, JournalEntry[]> = {
  [TODAY_KEY]: [
    { id: '1', content: 'Started the morning with a strong coffee and a 15-minute meditation. Felt surprisingly focused.', timestamp: new Date(new Date().setHours(8, 30)), source: 'obsidian', isImportant: false, isSaved: true },
    { id: '2', content: 'Meeting with the design team went well. We decided to simplify the navigation structure.', timestamp: new Date(new Date().setHours(11, 15)), source: 'web-input', isImportant: true, isSaved: true },
  ],
  [YESTERDAY_KEY]: [
     { id: '3', content: 'Reviewing the quarterly goals. Need to align with the marketing team.', timestamp: new Date(new Date(Date.now() - 86400000).setHours(14, 0)), source: 'web-input', isImportant: false, isSaved: true }
  ]
};

const DEFAULT_OVERVIEW_CONFIG: OverviewSectionConfig[] = [
    { id: 'mood', label: 'Mood', visible: true, order: 0, prompt: "The overall mood of the day." },
    { id: 'stats', label: 'Statistics', visible: true, order: 1, prompt: "Calculate basic stats (count of entries, tasks completed if any)." },
    { id: 'happiness', label: 'Happiness', visible: true, order: 2, prompt: "List 1-3 things that felt happy or positive based on the input." },
    { id: 'keywords', label: 'Keywords', visible: true, order: 3, prompt: "3-5 key themes or topics from the day." },
    { id: 'summary', label: 'Summary', visible: true, order: 4, prompt: "Provide a concise summary of the day's events and thoughts, ending with an encouraging sentence." }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.JOURNAL);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [dataStore, setDataStore] = useState<Record<string, DailyData>>({});
  const [recallItems, setRecallItems] = useState<RecallItem[]>([]);
  const [isRecallLoading, setIsRecallLoading] = useState(false);
  
  // Layout State
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  
  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // Advanced State
  const [deletedEntries, setDeletedEntries] = useState<DeletedEntry[]>([]);
  const [overviewConfig, setOverviewConfig] = useState<OverviewSectionConfig[]>(DEFAULT_OVERVIEW_CONFIG);
  
  const [settings, setSettings] = useState<AppSettings>({
    language: 'Chinese',
    theme: 'light',
    connections: {
        todo: [
            { id: '1', type: 'google-calendar', name: 'Google Calendar', detail: 'Primary', isConnected: false }
        ],
        journal: [
             { id: '1', type: 'local', name: 'My Journal Folder', detail: 'Click to select...', isConnected: false }
        ],
        vault: [
             { id: '1', type: 'local', name: 'My Knowledge Base', detail: 'Click to select...', isConnected: false }
        ]
    },
    responseStyles: []
  });

  const language = settings.language as Language;
  const t = translations[language];

  // Initialize store with mock data
  useEffect(() => {
    setDataStore(prev => {
      const newData = { ...prev };
      Object.keys(MOCK_ENTRIES).forEach(key => {
        if (!newData[key]) {
          newData[key] = {
            date: key,
            entries: MOCK_ENTRIES[key] || [],
          };
        }
      });
      return newData;
    });
  }, []);

  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const currentDailyData = dataStore[dateKey] || { date: dateKey, entries: [] };

  // Global Retro Logic
  const loadGlobalRecall = async () => {
    if (currentDailyData.entries.length > 0) {
      const allContent = currentDailyData.entries.map(e => e.content).join(' ');
      setIsRecallLoading(true);
      const associations = await findAssociations(allContent, settings.language);
      setRecallItems(associations);
      setIsRecallLoading(false);
    } else {
      setRecallItems([]);
    }
  };

  useEffect(() => {
    if (recallItems.length === 0 && currentDailyData.entries.length > 0) {
        // Only load initially if empty, do not react to entries changing for auto-refresh
        const timer = setTimeout(loadGlobalRecall, 1000);
        return () => clearTimeout(timer);
    }
  }, [dateKey]); // Changed dependency to just dateKey

  // --- Handlers ---

  const handleAddEntry = async (content: string, source: JournalEntry['source'] = 'web-input') => {
    const isChat = source === 'web-input'; 
    
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      source: isChat ? 'chat' : source,
      isImportant: false,
      isSaved: !isChat 
    };

    setDataStore(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        entries: [...(prev[dateKey]?.entries || []), newEntry]
      }
    }));

    if (isChat) {
        // handleSearchAssociation(content); // Manual refresh preferred now
        const replyText = await generateEntryReply(content, settings.language);
        const replyEntry: JournalEntry = {
            id: (Date.now() + 1).toString(),
            content: replyText,
            timestamp: new Date(),
            source: 'ai-reply',
            isImportant: false,
            isSaved: false
        };

        setDataStore(prev => ({
            ...prev,
            [dateKey]: {
                ...prev[dateKey],
                entries: [...(prev[dateKey]?.entries || []), replyEntry]
            }
        }));
    }
  };

  const handleSaveEntry = (id: string) => {
    setDataStore(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        entries: prev[dateKey].entries.map(e => 
          e.id === id ? { ...e, isSaved: true, source: e.source === 'chat' ? 'web-input' : e.source } : e
        )
      }
    }));
  };

  const handleUnsaveEntry = (id: string) => {
    setDataStore(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        entries: prev[dateKey].entries.map(e => 
          e.id === id ? { ...e, isSaved: false, source: e.source === 'web-input' ? 'chat' : e.source } : e
        )
      }
    }));
  };

  const handleDeleteEntry = (id: string) => {
    const entryToDelete = currentDailyData.entries.find(e => e.id === id);
    if (entryToDelete) {
        setDeletedEntries(prev => [...prev, { ...entryToDelete, deletedAt: new Date(), originalDateKey: dateKey }]);
        
        setDataStore(prev => ({
          ...prev,
          [dateKey]: {
            ...prev[dateKey],
            entries: prev[dateKey].entries.filter(e => e.id !== id)
          }
        }));
    }
  };

  const handleRestoreEntry = (entry: DeletedEntry) => {
     setDataStore(prev => {
         const targetDateKey = entry.originalDateKey;
         const existingData = prev[targetDateKey] || { date: targetDateKey, entries: [] };
         // Remove deleted meta props
         const { deletedAt, originalDateKey, ...rest } = entry;
         const restoredEntry = rest as JournalEntry;
         
         return {
             ...prev,
             [targetDateKey]: {
                 ...existingData,
                 entries: [...existingData.entries, restoredEntry].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime())
             }
         };
     });
     setDeletedEntries(prev => prev.filter(e => e.id !== entry.id));
  };

  const handlePermanentDelete = (id: string) => {
      setDeletedEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleEditEntry = (id: string, newContent: string) => {
    setDataStore(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        entries: prev[dateKey].entries.map(e => 
            e.id === id ? { ...e, content: newContent } : e
        )
      }
    }));
  };

  const handleAiReply = async (entryId: string, content: string) => {
    const replyText = await generateEntryReply(content, settings.language);
    const replyEntry: JournalEntry = {
        id: Date.now().toString(),
        content: replyText,
        timestamp: new Date(),
        source: 'ai-reply',
        isImportant: false,
        isSaved: false
    };

    setDataStore(prev => ({
        ...prev,
        [dateKey]: {
            ...prev[dateKey],
            entries: [...(prev[dateKey]?.entries || []), replyEntry]
        }
    }));
  };

  const handleUpdateSummary = (summary: DailyData['summary']) => {
    setDataStore(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        summary
      }
    }));
  };

  const handleToggleImportant = (id: string) => {
    setDataStore(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        entries: prev[dateKey].entries.map(e => 
          e.id === id ? { ...e, isImportant: !e.isImportant } : e
        )
      }
    }));
  };

  const handleSearchAssociation = async (content: string) => {
    setIsRecallLoading(true);
    const associations = await findAssociations(content, settings.language);
    setRecallItems(associations);
    setIsRecallLoading(false);
  };

  const handleEntryUpdateFromRecall = (date: string, id: string, updates: Partial<JournalEntry>) => {
    setDataStore(prev => {
        const dayData = prev[date];
        if (!dayData) return prev;
        
        // Find if entry exists
        const entryIndex = dayData.entries.findIndex(e => e.id === id);
        if (entryIndex === -1) return prev; 
        
        const updatedEntries = [...dayData.entries];
        updatedEntries[entryIndex] = { ...updatedEntries[entryIndex], ...updates };
        
        return {
            ...prev,
            [date]: { ...dayData, entries: updatedEntries }
        };
    });
  };

  const handleRoam = () => {
    const validKeys = Object.keys(dataStore).filter(key => 
      dataStore[key].entries && dataStore[key].entries.length > 0
    );

    if (validKeys.length > 0) {
      let randomKey = validKeys[Math.floor(Math.random() * validKeys.length)];
      if (validKeys.length > 1 && randomKey === dateKey) {
         const otherKeys = validKeys.filter(k => k !== dateKey);
         randomKey = otherKeys[Math.floor(Math.random() * otherKeys.length)];
      }
      setCurrentDate(new Date(randomKey));
    } else {
        const randomDays = Math.floor(Math.random() * 30);
        setCurrentDate(subDays(new Date(), randomDays));
    }
  };

  return (
    <div className={`h-screen w-screen flex flex-col ${settings.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} font-sans overflow-hidden transition-colors`}>
      {/* 1. Global Navigation */}
      <header className={`relative h-14 flex items-center justify-between px-4 z-10 flex-shrink-0 bg-transparent`}>
        <div className={`flex items-center gap-2 font-bold text-xl tracking-tight z-10 ${settings.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Echo
        </div>
        
        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
          {[
            { id: Tab.TODO, label: t.nav.todo, icon: CheckSquare },
            { id: Tab.JOURNAL, label: t.nav.journal, icon: Book },
            { id: Tab.VAULT, label: t.nav.vault, icon: Layout },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? (settings.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900') 
                  : (settings.theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50')
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 z-10">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-full transition-colors ${settings.theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
          >
            <Settings size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs cursor-pointer">
            <User size={14} />
          </div>
        </div>
      </header>

      {/* 2. Main Page Layout */}
      <main className={`flex-1 flex overflow-hidden p-3 gap-3 ${settings.theme === 'dark' ? 'bg-gray-950' : ''}`}>
        {activeTab === Tab.JOURNAL ? (
          <>
            {/* Left Column (Floating Panel) */}
            <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${leftCollapsed ? 'w-14' : 'w-80'}`}>
                <LeftColumn 
                currentDate={currentDate} 
                onDateChange={setCurrentDate}
                dailyData={currentDailyData}
                onUpdateSummary={handleUpdateSummary}
                onRoam={handleRoam}
                onOpenCustomize={() => setIsCustomizeOpen(true)}
                overviewConfig={overviewConfig}
                language={language}
                isCollapsed={leftCollapsed}
                onToggle={() => setLeftCollapsed(!leftCollapsed)}
                />
            </div>

            {/* Middle Column (Floating Panel) */}
            <div className="flex-1 min-w-0">
                <MiddleColumn 
                entries={currentDailyData.entries}
                onAddEntry={handleAddEntry}
                onSaveEntry={handleSaveEntry}
                onUnsaveEntry={handleUnsaveEntry}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
                onSearchAssociation={handleSearchAssociation}
                onToggleImportant={handleToggleImportant}
                onAiReply={handleAiReply}
                language={language}
                onOpenTrash={() => setIsTrashOpen(true)}
                trashCount={deletedEntries.length}
                />
            </div>

            {/* Right Column (Floating Panel) */}
            <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${rightCollapsed ? 'w-14' : 'w-80'}`}>
                <RightColumn 
                recallItems={recallItems}
                isLoading={isRecallLoading}
                language={language}
                onRefresh={loadGlobalRecall}
                onAddEntry={handleAddEntry}
                onEntryUpdate={handleEntryUpdateFromRecall}
                isCollapsed={rightCollapsed}
                onToggle={() => setRightCollapsed(!rightCollapsed)}
                />
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center rounded-2xl ${settings.theme === 'dark' ? 'bg-gray-900 text-gray-500' : 'bg-white text-gray-400'}`}>
            <div className="text-center">
              <p className="text-lg font-medium">Work in Progress</p>
              <p className="text-sm">Only the Journal module is active in this demo.</p>
            </div>
          </div>
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onUpdateSettings={setSettings}
      />
      
      <TrashModal 
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        deletedEntries={deletedEntries}
        onRestore={handleRestoreEntry}
        onPermanentDelete={handlePermanentDelete}
        onClearAll={() => setDeletedEntries([])}
        language={language}
      />

      <CustomizeOverviewModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        config={overviewConfig}
        onUpdateConfig={setOverviewConfig}
        language={language}
        theme={settings.theme}
      />
    </div>
  );
};

export default App;