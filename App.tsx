
import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Settings, User, Layout, CheckSquare, Book, AlertTriangle } from 'lucide-react';
import { Tab, JournalEntry, DailyData, RecallItem, AppSettings, DeletedEntry, OverviewSectionConfig } from './types';
import LeftColumn from './components/LeftColumn';
import MiddleColumn from './components/MiddleColumn';
import RightColumn from './components/RightColumn';
import SettingsModal from './components/SettingsModal';
import TrashModal from './components/TrashModal';
import CustomizeOverviewModal from './components/CustomizeOverviewModal';
import { generateSearchKeywords, generateEntryReply } from './services/geminiService';
import { translations, Language } from './utils/translations';
import { getStoredDirectoryHandle, verifyPermission, readDailyJournal, appendToJournal, rewriteJournal, getJournalDates, searchJournalFiles } from './services/fileSystemService';

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
  
  // Data State
  const [dailyEntries, setDailyEntries] = useState<JournalEntry[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyData['summary'] | undefined>(undefined);
  const [existingDates, setExistingDates] = useState<Set<string>>(new Set());
  
  const [recallItems, setRecallItems] = useState<RecallItem[]>([]);
  const [isRecallLoading, setIsRecallLoading] = useState(false);
  
  // File System State
  const [fsHandle, setFsHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isFsConnected, setIsFsConnected] = useState(false);
  
  // Layout State
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  
  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const [deletedEntries, setDeletedEntries] = useState<DeletedEntry[]>([]);
  const [overviewConfig, setOverviewConfig] = useState<OverviewSectionConfig[]>(DEFAULT_OVERVIEW_CONFIG);
  
  const [settings, setSettings] = useState<AppSettings>({
    language: 'Chinese',
    theme: 'light',
    connections: {
        todo: [],
        journal: [{ id: '1', type: 'local', name: 'Local Journal', detail: 'Not connected', isConnected: false }],
        vault: []
    },
    responseStyles: []
  });

  const language = settings.language as Language;
  const t = translations[language];

  // --- 1. Init File System on Mount ---
  useEffect(() => {
    const initFS = async () => {
      const handle = await getStoredDirectoryHandle();
      if (handle) {
        setFsHandle(handle);
        // Sync settings UI
        setSettings(prev => ({
            ...prev,
            connections: {
                ...prev.connections,
                journal: prev.connections.journal.map(c => c.type === 'local' ? { ...c, isConnected: true, detail: handle.name, fileHandle: handle } : c)
            }
        }));
        
        // Check permission silently
        const hasPerm = await verifyPermission(handle, true);
        setIsFsConnected(hasPerm);

        if (hasPerm) {
            refreshCalendarIndicators(handle);
        }
      }
    };
    initFS();
  }, []);

  // --- 2. Load Data when Date or Handle changes ---
  useEffect(() => {
    const loadData = async () => {
      if (!fsHandle) {
        setDailyEntries([]); 
        return;
      }

      if (!isFsConnected) {
         // Try to verify one more time
         const hasPerm = await verifyPermission(fsHandle, true);
         if (!hasPerm) return; 
         setIsFsConnected(true);
         refreshCalendarIndicators(fsHandle);
      }

      const entries = await readDailyJournal(fsHandle, currentDate);
      setDailyEntries(entries);
    };
    loadData();
  }, [currentDate, fsHandle, isFsConnected]);

  const refreshCalendarIndicators = async (handle: FileSystemDirectoryHandle) => {
      try {
          const dates = await getJournalDates(handle);
          setExistingDates(dates);
      } catch (e) {
          console.error("Failed to refresh calendar dates", e);
      }
  };

  // --- CRUD Handlers ---

  const handleAddEntry = async (content: string, source: JournalEntry['source'] = 'web-input') => {
    const isChat = source === 'web-input'; 
    const timestamp = new Date();
    
    // 1. Create Entry Object (Initially Unsaved)
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      content,
      timestamp,
      source: isChat ? 'chat' : source,
      isImportant: false,
      isSaved: false 
    };

    // 2. Update UI Optimistically
    setDailyEntries(prev => [...prev, newEntry]);

    // 3. Attempt Write to Disk
    if (fsHandle && isFsConnected) {
        try {
            await appendToJournal(fsHandle, currentDate, newEntry);
            // 4. On Success, mark as saved & refresh calendar
            setDailyEntries(prev => prev.map(e => e.id === newEntry.id ? { ...e, isSaved: true } : e));
            setExistingDates(prev => new Set(prev).add(format(currentDate, 'yyyy-MM-dd')));
        } catch (err) {
            console.error("Failed to save entry to disk:", err);
        }
    }
  };

  const handleSaveEntry = async (id: string) => {
    const entryToSave = dailyEntries.find(e => e.id === id);
    if (!entryToSave) return;

    if (fsHandle && isFsConnected) {
        try {
            await appendToJournal(fsHandle, currentDate, entryToSave);
            setDailyEntries(prev => prev.map(e => e.id === id ? { ...e, isSaved: true } : e));
            setExistingDates(prev => new Set(prev).add(format(currentDate, 'yyyy-MM-dd')));
        } catch (err) {
            console.error("Failed to save manual entry:", err);
            alert("Failed to write to file. Please check folder permissions.");
        }
    } else {
        alert("Please connect a local folder in Settings to save entries.");
        setIsSettingsOpen(true);
    }
  };

  const handleUnsaveEntry = (id: string) => {
    setDailyEntries(prev => prev.map(e => e.id === id ? { ...e, isSaved: false } : e));
  };

  const handleDeleteEntry = async (id: string) => {
    const entryToDelete = dailyEntries.find(e => e.id === id);
    if (!entryToDelete) return;

    setDeletedEntries(prev => [...prev, { ...entryToDelete, deletedAt: new Date(), originalDateKey: format(currentDate, 'yyyy-MM-dd') }]);
    
    const newEntries = dailyEntries.filter(e => e.id !== id);
    setDailyEntries(newEntries);

    if (fsHandle && isFsConnected) {
        await rewriteJournal(fsHandle, currentDate, newEntries);
        // If empty, remove from existing dates? For now, we keep it simple.
    }
  };

  const handleEditEntry = async (id: string, newContent: string) => {
    const newEntries = dailyEntries.map(e => e.id === id ? { ...e, content: newContent } : e);
    setDailyEntries(newEntries);
    if (fsHandle && isFsConnected) {
        await rewriteJournal(fsHandle, currentDate, newEntries);
    }
  };

  const handleToggleImportant = async (id: string) => {
    const newEntries = dailyEntries.map(e => e.id === id ? { ...e, isImportant: !e.isImportant } : e);
    setDailyEntries(newEntries);
    if (fsHandle && isFsConnected) {
        await rewriteJournal(fsHandle, currentDate, newEntries);
    }
  };

  const handleRestoreEntry = async (entry: DeletedEntry) => {
     const { deletedAt, originalDateKey, ...rest } = entry;
     const restoredEntry = rest as JournalEntry;
     
     if (originalDateKey === format(currentDate, 'yyyy-MM-dd')) {
         setDailyEntries(prev => [...prev, restoredEntry].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()));
         if (fsHandle && isFsConnected) {
             await appendToJournal(fsHandle, currentDate, restoredEntry);
         }
     } else {
         alert("Please navigate to the original date to restore this entry.");
         return;
     }

     setDeletedEntries(prev => prev.filter(e => e.id !== entry.id));
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

    setDailyEntries(prev => [...prev, replyEntry]);
    
    if (fsHandle && isFsConnected) {
        try {
            await appendToJournal(fsHandle, currentDate, replyEntry);
            setDailyEntries(prev => prev.map(e => e.id === replyEntry.id ? { ...e, isSaved: true } : e));
        } catch (err) {
            console.error("Failed to save AI reply:", err);
        }
    }
  };

  const handleUpdateSummary = (summary: DailyData['summary']) => {
    setDailySummary(summary);
  };

  const handleSearchAssociation = async (content: string) => {
    if (!fsHandle || !isFsConnected) {
        alert("Please connect to a local folder to use Recall features.");
        return;
    }
    
    setIsRecallLoading(true);
    
    try {
        // 1. AI generates search terms
        const keywords = await generateSearchKeywords(content, settings.language);
        
        if (keywords.length === 0) {
            setRecallItems([]);
        } else {
             // 2. Real File System Search
             const results = await searchJournalFiles(fsHandle, keywords);
             setRecallItems(results);
        }
    } catch (e) {
        console.error("Recall failed", e);
    } finally {
        setIsRecallLoading(false);
    }
  };

  const handleRoam = () => {
    const daysAgo = Math.floor(Math.random() * 30);
    setCurrentDate(subDays(new Date(), daysAgo));
  };

  const currentDailyData: DailyData = {
      date: format(currentDate, 'yyyy-MM-dd'),
      entries: dailyEntries,
      summary: dailySummary
  };

  return (
    <div className={`h-screen w-screen flex flex-col ${settings.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} font-sans overflow-hidden transition-colors`}>
      <header className={`relative h-14 flex items-center justify-between px-4 z-10 flex-shrink-0 bg-transparent`}>
        <div className="flex items-center gap-2">
            <div className={`font-bold text-xl tracking-tight z-10 ${settings.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Echo
            </div>
            {fsHandle && !isFsConnected && (
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-xs flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full animate-pulse border border-amber-200"
                >
                    <AlertTriangle size={10} />
                    Reconnect Folder
                </button>
            )}
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

      <main className={`flex-1 flex overflow-hidden p-3 gap-3 ${settings.theme === 'dark' ? 'bg-gray-950' : ''}`}>
        {activeTab === Tab.JOURNAL ? (
          <>
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
                existingDates={existingDates}
                />
            </div>

            <div className="flex-1 min-w-0">
                <MiddleColumn 
                entries={dailyEntries}
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

            <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${rightCollapsed ? 'w-14' : 'w-80'}`}>
                <RightColumn 
                recallItems={recallItems}
                isLoading={isRecallLoading}
                language={language}
                onRefresh={() => {}}
                onAddEntry={handleAddEntry}
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
        onPermanentDelete={(id) => setDeletedEntries(p => p.filter(e => e.id !== id))}
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
