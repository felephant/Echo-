
import React, { useState } from 'react';
import { X, Globe, Eye, Zap, Link as LinkIcon, Check, Plus, ChevronDown, ChevronUp, Edit2, Trash2, Calendar, BookOpen, Layers, Lock, ShieldCheck, Loader2, Folder, Save, Monitor, Moon, Sun, Smartphone, Brain } from 'lucide-react';
import { AppSettings, ResponseStyle, DataSource } from '../types';
import { translations, Language } from '../utils/translations';
import { selectDirectory } from '../services/fileSystemService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  // Section Visibility State
  const [expandedSection, setExpandedSection] = useState<string | null>('connections');
  
  // Connection Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: '', detail: '' });
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);

  // Style Edit State
  const [isAddingStyle, setIsAddingStyle] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');

  if (!isOpen) return null;
  const t = translations[settings.language as Language].settings;

  const toggleSection = (section: string) => {
      setExpandedSection(expandedSection === section ? null : section);
  };

  // --- Appearance Handlers ---
  const handleLanguageChange = (lang: 'English' | 'Chinese') => {
      onUpdateSettings({ ...settings, language: lang });
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
      onUpdateSettings({ ...settings, theme });
  };

  // --- Connection Handlers ---

  const handleConnectionClick = async (partition: 'todo' | 'journal' | 'vault', item: DataSource) => {
    if (item.isConnected) {
        // Disconnect
        toggleConnection(partition, item.id, false);
        return;
    }

    // Connect Logic
    if (item.type === 'local') {
        // PRE-CHECK: Prevent SecurityError in iframes (StackBlitz/Bolt previews)
        if (window.self !== window.top) {
            alert("Browser Security Restriction:\n\nFile System Access is blocked in this embedded preview mode.\n\nPlease open the application in a new tab/window (full screen) to use local file features.");
            return;
        }

        try {
            // Use real file system service
            const handle = await selectDirectory();
            if (handle) {
                const newConnections = { ...settings.connections };
                newConnections[partition] = newConnections[partition].map(c => 
                    c.id === item.id ? { 
                        ...c, 
                        isConnected: true, 
                        detail: handle.name,
                        fileHandle: handle 
                    } : c
                );
                onUpdateSettings({ ...settings, connections: newConnections });
            }
        } catch (err) {
            console.error('Folder selection failed', err);
            const msg = (err as Error).message;
            if (msg.includes('Cross origin sub frames') || msg.includes('SecurityError')) {
                 alert("Browser Security Restriction:\n\nFile System Access is blocked in this embedded preview mode. Please open the application in a new tab/window (full screen) to use local file features.");
            } else {
                alert(`Could not access local folder: ${msg}`);
            }
        }
    } else {
        // Mock other types
        setIsAuthenticating(item.id);
        setTimeout(() => {
            toggleConnection(partition, item.id, true);
            setIsAuthenticating(null);
        }, 1000);
    }
  };

  const toggleConnection = (partition: 'todo' | 'journal' | 'vault', id: string, status: boolean) => {
      const newConnections = { ...settings.connections };
      newConnections[partition] = newConnections[partition].map(c => 
          c.id === id ? { ...c, isConnected: status } : c
      );
      onUpdateSettings({ ...settings, connections: newConnections });
  };

  const deleteConnection = (partition: 'todo' | 'journal' | 'vault', id: string) => {
      const newConnections = { ...settings.connections };
      newConnections[partition] = newConnections[partition].filter(c => c.id !== id);
      onUpdateSettings({ ...settings, connections: newConnections });
  };

  const startEditing = (item: DataSource) => {
      setEditingId(item.id);
      setEditValues({ name: item.name, detail: item.detail });
  };

  const saveEditing = (partition: 'todo' | 'journal' | 'vault') => {
      const newConnections = { ...settings.connections };
      newConnections[partition] = newConnections[partition].map(c => 
          c.id === editingId ? { ...c, name: editValues.name } : c
      );
      onUpdateSettings({ ...settings, connections: newConnections });
      setEditingId(null);
  };

  // --- Memory / Style Handlers ---
  const handleAddStyle = () => {
    if (!newStyleName || !newStylePrompt) return;
    const newStyle: ResponseStyle = {
      id: Date.now().toString(),
      name: newStyleName,
      prompt: newStylePrompt,
      isActive: false
    };
    onUpdateSettings({ ...settings, responseStyles: [...settings.responseStyles, newStyle] });
    setNewStyleName('');
    setNewStylePrompt('');
    setIsAddingStyle(false);
  };

  const toggleStyleActive = (id: string) => {
    onUpdateSettings({
      ...settings,
      responseStyles: settings.responseStyles.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s)
    });
  };

  const deleteStyle = (id: string) => {
    onUpdateSettings({ ...settings, responseStyles: settings.responseStyles.filter(s => s.id !== id) });
  };

  const renderConnectionItem = (item: DataSource, partition: 'todo' | 'journal' | 'vault') => {
      const isEditing = editingId === item.id;
      const isLocal = item.type === 'local';
      const isAuthLoading = isAuthenticating === item.id;

      return (
        <div key={item.id} className={`flex flex-col gap-2 p-3 border rounded-lg transition-colors ${item.isConnected ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all ${item.isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {isEditing ? <Edit2 size={12}/> : (
                            item.isConnected ? <Check size={14} /> : <Folder size={14} />
                        )}
                    </div>
                    
                    {isEditing ? (
                        <div className="flex-1 space-y-3 mr-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name</label>
                                <input 
                                    className="w-full text-sm font-medium border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent px-1 py-0.5"
                                    value={editValues.name}
                                    onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                                    autoFocus
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm overflow-hidden min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 truncate">{item.name}</span>
                                {item.isConnected && (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full font-medium whitespace-nowrap">
                                        Live
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate font-mono mt-0.5">
                                <Folder size={12} className="text-gray-400 flex-shrink-0" />
                                {item.isConnected ? (
                                    <span className="text-gray-700 font-medium">{item.detail}</span>
                                ) : (
                                    <span className="italic text-gray-400">No folder selected</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {isEditing ? (
                        <>
                            <button onClick={() => saveEditing(partition)} className="p-1.5 text-green-600 hover:bg-green-100 rounded">
                                <Check size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                                <X size={14} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => handleConnectionClick(partition, item)}
                                disabled={isAuthLoading}
                                className={`cursor-pointer px-3 py-1.5 rounded text-xs font-medium transition-colors border shadow-sm ${
                                    item.isConnected 
                                    ? 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50' 
                                    : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 active:scale-95'
                                }`}
                            >
                                {isAuthLoading ? <Loader2 size={12} className="animate-spin"/> : (item.isConnected ? t.disconnect : (isLocal ? 'Browse' : t.connect))}
                            </button>
                            
                            {!item.isConnected && (
                                <button 
                                    onClick={() => startEditing(item)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    <Edit2 size={12} />
                                </button>
                            )}
                            {(partition === 'journal' || partition === 'vault') && (
                                <button 
                                    onClick={() => deleteConnection(partition, item.id)}
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* 1. Appearance Section (Restored) */}
          <div className="space-y-3">
             <div 
                className="flex items-center justify-between text-gray-900 font-medium cursor-pointer select-none"
                onClick={() => toggleSection('appearance')}
             >
                <div className="flex items-center gap-2">
                    <Monitor size={18} className="text-gray-500" />
                    {t.appearance} & {t.language}
                </div>
                {expandedSection === 'appearance' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            
            {expandedSection === 'appearance' && (
                <div className="space-y-4 border-l-2 border-gray-100 pl-4 animate-in slide-in-from-top-2 fade-in duration-200">
                     <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.language}</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {['English', 'Chinese'].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => handleLanguageChange(lang as any)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                                        settings.language === lang 
                                        ? 'bg-white text-gray-900 shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {lang === 'English' ? 'English' : '中文'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Theme</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => handleThemeChange('light')}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                                    settings.theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Sun size={14} /> Light
                            </button>
                            <button 
                                onClick={() => handleThemeChange('dark')}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                                    settings.theme === 'dark' ? 'border-blue-500 bg-gray-800 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Moon size={14} /> Dark
                            </button>
                            <button 
                                onClick={() => handleThemeChange('system')}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                                    settings.theme === 'system' ? 'border-blue-500 bg-gray-100 text-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Smartphone size={14} /> System
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>

          <div className="w-full h-px bg-gray-100"></div>

          {/* 2. Connections Section */}
          <div className="space-y-3">
             <div 
                className="flex items-center justify-between text-gray-900 font-medium cursor-pointer select-none"
                onClick={() => toggleSection('connections')}
             >
                <div className="flex items-center gap-2">
                    <LinkIcon size={18} className="text-gray-500" />
                    {t.connections}
                </div>
                {expandedSection === 'connections' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {expandedSection === 'connections' && (
                <div className="space-y-6 border-l-2 border-gray-100 pl-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="space-y-2">
                         <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                             <div className="flex items-center gap-2">
                                <BookOpen size={12} />
                                {t.sectionJournal}
                             </div>
                        </div>
                        <div className="space-y-2">
                            {settings.connections.journal.map(item => renderConnectionItem(item, 'journal'))}
                        </div>
                    </div>
                    {/* Simplified for demo: Vault/Todo sections omitted or can be added similarly */}
                </div>
            )}
          </div>
          
          <div className="w-full h-px bg-gray-100"></div>

          {/* 3. Memory & Behavior Section (Restored) */}
          <div className="space-y-3">
             <div 
                className="flex items-center justify-between text-gray-900 font-medium cursor-pointer select-none"
                onClick={() => toggleSection('memory')}
             >
                <div className="flex items-center gap-2">
                    <Brain size={18} className="text-gray-500" />
                    {t.memory}
                </div>
                {expandedSection === 'memory' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {expandedSection === 'memory' && (
                <div className="space-y-4 border-l-2 border-gray-100 pl-4 animate-in slide-in-from-top-2 fade-in duration-200">
                     <div className="flex items-center justify-between">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.responseStyle}</label>
                         <button 
                            onClick={() => setIsAddingStyle(true)}
                            className="text-[10px] text-blue-600 font-medium hover:underline flex items-center gap-1"
                         >
                             <Plus size={10} /> {t.addStyle}
                         </button>
                     </div>
                     
                     {isAddingStyle && (
                         <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                             <input 
                                className="w-full text-xs p-2 border border-gray-300 rounded" 
                                placeholder={t.styleName}
                                value={newStyleName}
                                onChange={e => setNewStyleName(e.target.value)}
                             />
                             <textarea 
                                className="w-full text-xs p-2 border border-gray-300 rounded" 
                                placeholder={t.stylePrompt}
                                value={newStylePrompt}
                                onChange={e => setNewStylePrompt(e.target.value)}
                             />
                             <div className="flex justify-end gap-2">
                                 <button onClick={() => setIsAddingStyle(false)} className="text-xs text-gray-500">Cancel</button>
                                 <button onClick={handleAddStyle} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Add</button>
                             </div>
                         </div>
                     )}

                     <div className="space-y-2">
                         {settings.responseStyles.length === 0 ? (
                             <div className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-lg text-center">
                                 Default AI persona is active.
                             </div>
                         ) : (
                             settings.responseStyles.map(style => (
                                 <div key={style.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                                     <div className="flex items-center gap-3">
                                         <div className={`w-2 h-2 rounded-full ${style.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                         <span className="text-sm font-medium text-gray-700">{style.name}</span>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <button 
                                            onClick={() => toggleStyleActive(style.id)}
                                            className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                                                style.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                         >
                                             {style.isActive ? 'Active' : 'Enable'}
                                         </button>
                                         <button onClick={() => deleteStyle(style.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                                     </div>
                                 </div>
                             ))
                         )}
                     </div>
                </div>
            )}
          </div>

        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors shadow-sm">
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
