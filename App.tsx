import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { Settings, User, Layout, CheckSquare, Book, AlertTriangle, Palette } from 'lucide-react';
import { Tab, JournalEntry, DailyData, RecallItem, AppSettings, DeletedEntry, OverviewSectionConfig } from './types';
import LeftColumn from './components/LeftColumn';
import MiddleColumn from './components/MiddleColumn';
import RightColumn from './components/RightColumn';
import SettingsModal from './components/SettingsModal';
import TrashModal from './components/TrashModal';
import CustomizeOverviewModal from './components/CustomizeOverviewModal';
import AppearanceMenu from './components/AppearanceMenu';
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

const MIN_COL_WIDTH = 250;
const MAX_COL_WIDTH = 600;
const COLLAPSED_WIDTH = 56; // w-14
const LAYOUT_GAP = 4; // px (gap-1)
const LAYOUT_PADDING = 4; // px (p-1)
const TOTAL_SPACING = (LAYOUT_GAP * 2) + (LAYOUT_PADDING * 2); // Left-Mid gap, Mid-Right gap, Left pad, Right pad

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
  
  // Initialize Left Width to Minimum
  const [leftWidth, setLeftWidth] = useState(MIN_COL_WIDTH);
  
  // Calculate initial right width to match middle width
  const calculateEqualRightWidth = () => {
      if (typeof window === 'undefined') return 400;
      // Available width for Mid + Right = Window - Left - Spacing
      const available = window.innerWidth - MIN_COL_WIDTH - TOTAL_SPACING;
      // Split equally
      const target = Math.floor(available / 2);
      return Math.min(Math.max(target, MIN_COL_WIDTH), MAX_COL_WIDTH);
  };

  const [rightWidth, setRightWidth] = useState(calculateEqualRightWidth);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  
  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const [deletedEntries, setDeletedEntries] = useState<DeletedEntry[]>([]);
  const [overviewConfig, setOverviewConfig] = useState<OverviewSectionConfig[]>(DEFAULT_OVERVIEW_CONFIG);
  
  const [settings, setSettings] = useState<AppSettings>({
    language: 'Chinese',
    theme: 'light',
    accentColor: 'slate', // Default to Slate/Black style
    connections: {
        todo: [],
        journal: [{ id: '1', type: 'local', name: 'Local Journal', detail: 'Not connected', isConnected: false }],
        vault: [{ id: '2', type: 'local', name: 'Local Knowledge Base', detail: 'Not connected', isConnected: false }]
    },
    responseStyles: []
  });

  // --- Theme Logic ---
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const effectiveTheme = settings.theme === 'system' ? systemTheme : settings.theme;

  const language = settings.language as Language;
  const t = translations[language];

  // --- Resizing Logic ---
  const handleMouseDown = (direction: 'left' | 'right') => (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(direction);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!isResizing) return;

      if (isResizing === 'left') {
          const newWidth = Math.min(Math.max(e.clientX - LAYOUT_PADDING, MIN_COL_WIDTH), MAX_COL_WIDTH);
          setLeftWidth(newWidth);
      } else if (isResizing === 'right') {
          const newWidth = Math.min(Math.max(window.innerWidth - e.clientX - LAYOUT_PADDING, MIN_COL_WIDTH), MAX_COL_WIDTH);
          setRightWidth(newWidth);
      }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
      setIsResizing(null);
  }, []);

  useEffect(() => {
      if (isResizing) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none'; 
      } else {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleResetLayout = () => {
      setLeftWidth(MIN_COL_WIDTH);
      setRightWidth(calculateEqualRightWidth());
      setLeftCollapsed(false);
      setRightCollapsed(false);
  };


  // --- 1. Init File System on Mount ---
  useEffect(() => {
    const initFS = async () => {
      const handle = await getStoredDirectoryHandle();
      if (handle) {
        setFsHandle(handle);
        setSettings(prev => ({
            ...prev,
            connections: {
                ...prev.connections,
                journal: prev.connections.journal.map(c => c.type === 'local' ? { ...c, isConnected: true, detail: handle.name, fileHandle: handle } : c)
            }
        }));
        
        const hasPerm = await verifyPermission(handle, true);
        setIsFsConnected(hasPerm);

        if (hasPerm) {
            refreshCalendarIndicators(handle);
        }
      }
    };
    initFS();
  }, []);

  // --- 2. Load Data ---
  useEffect(() => {
    const loadData = async () => {
      if (!fsHandle) {
        setDailyEntries([]); 
        return;
      }

      if (!isFsConnected) {
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
    
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      content,
      timestamp,
      hasTime: true, // Entries created by the app always have a time
      source: isChat ? 'chat' : source,
      isImportant: false,
      isSaved: false 
    };

    setDailyEntries(prev => [...prev, newEntry]);

    if (fsHandle && isFsConnected) {
        try {
            await appendToJournal(fsHandle, currentDate, newEntry);
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
        hasTime: true,
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
        const keywords = await generateSearchKeywords(content, settings.language);
        if (keywords.length === 0) {
            setRecallItems([]);
        } else {
             const results = await searchJournalFiles(fsHandle, keywords, currentDate);
             setRecallItems(results);
        }
    } catch (e) {
        console.error("Recall failed", e);
    } finally {
        setIsRecallLoading(false);
    }
  };

  const handleRefreshRecall = async () => {
    if (!fsHandle || !isFsConnected) return;
    if (dailyEntries.length === 0) return;
    setIsRecallLoading(true);
    try {
        const fullContent = dailyEntries.map(e => e.content).join('\n');
        const keywords = await generateSearchKeywords(fullContent, settings.language);
        if (keywords.length === 0) {
            setRecallItems([]);
        } else {
             const results = await searchJournalFiles(fsHandle, keywords, currentDate);
             setRecallItems(results);
        }
    } catch (e) {
        console.error("Recall refresh failed", e);
    } finally {
        setIsRecallLoading(false);
    }
  };

  const handleRoam = () => {
    const datesArray = Array.from(existingDates);
    if (datesArray.length > 0) {
        const randomDateStr = datesArray[Math.floor(Math.random() * datesArray.length)] as string;
        const [year, month, day] = randomDateStr.split('-').map(Number);
        setCurrentDate(new Date(year, month - 1, day));
    } else {
        const daysAgo = Math.floor(Math.random() * 30);
        setCurrentDate(addDays(new Date(), -daysAgo));
    }
  };

  const currentDailyData: DailyData = {
      date: format(currentDate, 'yyyy-MM-dd'),
      entries: dailyEntries,
      summary: dailySummary
  };

  const transitionClass = isResizing ? '' : 'transition-all duration-300 ease-in-out';

  return (
    <div className={`${effectiveTheme} h-screen w-screen overflow-hidden font-sans`}>
        <div className="h-full w-full flex flex-col bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
            <header className={`relative h-14 flex items-center justify-between px-4 z-30 flex-shrink-0 bg-transparent`}>
                <div className="flex items-center gap-2">
                    <div className="font-bold text-xl tracking-tight z-10">Echo</div>
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
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                    }`}
                    >
                    <tab.icon size={16} />
                    {tab.label}
                    </button>
                ))}
                </nav>

                <div className="flex items-center gap-2 z-10 relative">
                <div className="relative">
                    <button 
                        onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
                        className={`p-2 rounded-full transition-colors ${
                            isAppearanceOpen 
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800'
                        }`}
                        title="Appearance & Layout"
                    >
                        <Palette size={20} />
                    </button>
                    <AppearanceMenu 
                        isOpen={isAppearanceOpen}
                        onClose={() => setIsAppearanceOpen(false)}
                        settings={settings}
                        onUpdateSettings={setSettings}
                        onResetLayout={handleResetLayout}
                    />
                </div>

                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors"
                >
                    <Settings size={20} />
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs cursor-pointer">
                    <User size={14} />
                </div>
                </div>
            </header>

            {/* Main Content Area - Reduced Padding and Gap */}
            <main className="flex-1 flex overflow-hidden p-1 gap-1">
                {activeTab === Tab.JOURNAL ? (
                <>
                    <div 
                        className={`flex-shrink-0 ${transitionClass}`}
                        style={{ width: leftCollapsed ? COLLAPSED_WIDTH : leftWidth }}
                    >
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
                        accentColor={settings.accentColor}
                        />
                    </div>
                    
                    {/* Left Resizer */}
                    {!leftCollapsed && (
                        <div 
                            className="w-1 cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500 transition-colors rounded-full flex-shrink-0 z-20"
                            onMouseDown={handleMouseDown('left')}
                        />
                    )}

                    <div className="flex-1 min-w-0">
                        <MiddleColumn 
                        currentDate={currentDate}
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
                        accentColor={settings.accentColor}
                        />
                    </div>

                    {/* Right Resizer */}
                    {!rightCollapsed && (
                        <div 
                            className="w-1 cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500 transition-colors rounded-full flex-shrink-0 z-20"
                            onMouseDown={handleMouseDown('right')}
                        />
                    )}

                    <div 
                        className={`flex-shrink-0 ${transitionClass}`}
                        style={{ width: rightCollapsed ? COLLAPSED_WIDTH : rightWidth }}
                    >
                        <RightColumn 
                        recallItems={recallItems}
                        isLoading={isRecallLoading}
                        language={language}
                        onRefresh={handleRefreshRecall}
                        onAddEntry={handleAddEntry}
                        isCollapsed={rightCollapsed}
                        onToggle={() => setRightCollapsed(!rightCollapsed)}
                        />
                    </div>
                </>
                ) : (
                <div className="flex-1 flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500">
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
            />
        </div>
    </div>
  );
};

export default App;