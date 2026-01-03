
import React, { useState } from 'react';
import { X, Link as LinkIcon, Check, Plus, ChevronDown, ChevronUp, Edit2, Trash2, BookOpen, Layers, Loader2, Folder, Brain, Globe, Database } from 'lucide-react';
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
  const [editValues, setEditValues] = useState<{ name: string; detail: string; config: Record<string, string> }>({ name: '', detail: '', config: {} });
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);
  const [showAddSourceMenu, setShowAddSourceMenu] = useState(false);

  // Style Edit State
  const [isAddingStyle, setIsAddingStyle] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');

  if (!isOpen) return null;
  const t = translations[settings.language as Language].settings;

  const toggleSection = (section: string) => {
      setExpandedSection(expandedSection === section ? null : section);
  };

  // --- Connection Handlers ---

  const handleAddSource = (type: DataSource['type']) => {
      const newSource: DataSource = {
          id: Date.now().toString(),
          type: type,
          name: type === 'local' ? 'New Local Folder' : type === 'url' ? 'New Web Link' : 'New Notion Page',
          detail: 'Not connected',
          config: {},
          isConnected: false
      };
      
      const newConnections = { ...settings.connections };
      newConnections.journal = [...newConnections.journal, newSource];
      onUpdateSettings({ ...settings, connections: newConnections });
      setShowAddSourceMenu(false);
      
      // Auto-start editing the new source
      setEditingId(newSource.id);
      setEditValues({ name: newSource.name, detail: newSource.detail, config: {} });
  };

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
      setEditValues({ name: item.name, detail: item.detail, config: item.config || {} });
  };

  const saveEditing = (partition: 'todo' | 'journal' | 'vault') => {
      const newConnections = { ...settings.connections };
      newConnections[partition] = newConnections[partition].map(c => 
          c.id === editingId ? { 
              ...c, 
              name: editValues.name,
              detail: c.type === 'url' ? (editValues.config['url'] || c.detail) : c.detail,
              config: editValues.config 
          } : c
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

      // Helper to choose icon based on type
      const getTypeIcon = () => {
          if (item.type === 'url') return <Globe size={14} />;
          if (item.type === 'notion') return <Database size={14} />;
          return <Folder size={14} />;
      };

      return (
        <div key={item.id} className={`flex flex-col gap-2 p-3 border rounded-lg transition-colors ${item.isConnected ? 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all ${item.isConnected ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
                        {isEditing ? <Edit2 size={12}/> : (
                            item.isConnected ? <Check size={14} /> : getTypeIcon()
                        )}
                    </div>
                    
                    {isEditing ? (
                        <div className="flex-1 space-y-3 mr-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Name</label>
                                <input 
                                    className="w-full text-sm font-medium border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none bg-transparent px-1 py-0.5 text-gray-900 dark:text-gray-100"
                                    value={editValues.name}
                                    onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                                    autoFocus
                                />
                            </div>
                            
                            {item.type === 'notion' && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Database ID / Page ID</label>
                                        <input 
                                            className="w-full text-xs font-mono border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none bg-transparent px-1 py-0.5 text-gray-700 dark:text-gray-300"
                                            value={editValues.config['pageId'] || ''}
                                            onChange={(e) => setEditValues({...editValues, config: { ...editValues.config, pageId: e.target.value }})}
                                            placeholder="e.g. 1a2b3c..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Integration Token</label>
                                        <input 
                                            type="password"
                                            className="w-full text-xs font-mono border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none bg-transparent px-1 py-0.5 text-gray-700 dark:text-gray-300"
                                            value={editValues.config['apiKey'] || ''}
                                            onChange={(e) => setEditValues({...editValues, config: { ...editValues.config, apiKey: e.target.value }})}
                                            placeholder="secret_..."
                                        />
                                    </div>
                                </>
                            )}

                            {item.type === 'url' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">URL</label>
                                    <input 
                                        className="w-full text-xs font-mono border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none bg-transparent px-1 py-0.5 text-gray-700 dark:text-gray-300"
                                        value={editValues.config['url'] || ''}
                                        onChange={(e) => setEditValues({...editValues, config: { ...editValues.config, url: e.target.value }})}
                                        placeholder="https://..."
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm overflow-hidden min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</span>
                                {item.isConnected && (
                                    <span className="text-[10px] bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-1.5 rounded-full font-medium whitespace-nowrap">
                                        Live
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 truncate font-mono mt-0.5">
                                {getTypeIcon()}
                                {item.isConnected ? (
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{item.detail}</span>
                                ) : (
                                    <span className="italic text-gray-400 dark:text-gray-600">Not connected</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {isEditing ? (
                        <>
                            <button onClick={() => saveEditing(partition)} className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded">
                                <Check size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
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
                                    ? 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                    : 'border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 active:scale-95'
                                }`}
                            >
                                {isAuthLoading ? <Loader2 size={12} className="animate-spin"/> : (item.isConnected ? t.disconnect : (isLocal ? 'Browse' : t.connect))}
                            </button>
                            
                            {!item.isConnected && (
                                <button 
                                    onClick={() => startEditing(item)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                >
                                    <Edit2 size={12} />
                                </button>
                            )}
                            {(partition === 'journal' || partition === 'vault') && (
                                <button 
                                    onClick={() => deleteConnection(partition, item.id)}
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 transition-colors">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t.title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* 1. Connections Section */}
          <div className="space-y-3">
             <div 
                className="flex items-center justify-between text-gray-900 dark:text-gray-100 font-medium cursor-pointer select-none"
                onClick={() => toggleSection('connections')}
             >
                <div className="flex items-center gap-2">
                    <LinkIcon size={18} className="text-gray-500 dark:text-gray-400" />
                    {t.connections}
                </div>
                {expandedSection === 'connections' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>

            {expandedSection === 'connections' && (
                <div className="space-y-6 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="space-y-2">
                         <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                             <div className="flex items-center gap-2">
                                <BookOpen size={12} />
                                {t.sectionJournal}
                             </div>
                             
                             <div className="relative">
                                 <button 
                                    onClick={() => setShowAddSourceMenu(!showAddSourceMenu)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-blue-600 dark:text-blue-400 transition-colors"
                                    title={t.addSource}
                                 >
                                    <Plus size={14} />
                                 </button>
                                 
                                 {/* Add Source Dropdown */}
                                 {showAddSourceMenu && (
                                     <>
                                        <div className="fixed inset-0 z-30" onClick={() => setShowAddSourceMenu(false)}></div>
                                        <div className="absolute right-0 top-6 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-40 overflow-hidden py-1">
                                            <button 
                                                onClick={() => handleAddSource('local')}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                                            >
                                                <Folder size={12} /> Local Folder
                                            </button>
                                            <button 
                                                onClick={() => handleAddSource('url')}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                                            >
                                                <Globe size={12} /> Web Link
                                            </button>
                                            <button 
                                                onClick={() => handleAddSource('notion')}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                                            >
                                                <Database size={12} /> Notion Page
                                            </button>
                                        </div>
                                     </>
                                 )}
                             </div>
                        </div>
                        <div className="space-y-2">
                            {settings.connections.journal.map(item => renderConnectionItem(item, 'journal'))}
                        </div>
                    </div>

                    <div className="space-y-2">
                         <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                             <div className="flex items-center gap-2">
                                <Layers size={12} />
                                {t.sectionVault}
                             </div>
                        </div>
                        <div className="space-y-2">
                            {settings.connections.vault.map(item => renderConnectionItem(item, 'vault'))}
                        </div>
                    </div>
                </div>
            )}
          </div>
          
          <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>

          {/* 2. Memory & Behavior Section */}
          <div className="space-y-3">
             <div 
                className="flex items-center justify-between text-gray-900 dark:text-gray-100 font-medium cursor-pointer select-none"
                onClick={() => toggleSection('memory')}
             >
                <div className="flex items-center gap-2">
                    <Brain size={18} className="text-gray-500 dark:text-gray-400" />
                    {t.memory}
                </div>
                {expandedSection === 'memory' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>

            {expandedSection === 'memory' && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                     <div className="flex items-center justify-between">
                         <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t.responseStyle}</label>
                         <button 
                            onClick={() => setIsAddingStyle(true)}
                            className="text-[10px] text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                         >
                             <Plus size={10} /> {t.addStyle}
                         </button>
                     </div>
                     
                     {isAddingStyle && (
                         <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                             <input 
                                className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none" 
                                placeholder={t.styleName}
                                value={newStyleName}
                                onChange={e => setNewStyleName(e.target.value)}
                             />
                             <textarea 
                                className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none" 
                                placeholder={t.stylePrompt}
                                value={newStylePrompt}
                                onChange={e => setNewStylePrompt(e.target.value)}
                             />
                             <div className="flex justify-end gap-2">
                                 <button onClick={() => setIsAddingStyle(false)} className="text-xs text-gray-500 dark:text-gray-400">Cancel</button>
                                 <button onClick={handleAddStyle} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Add</button>
                             </div>
                         </div>
                     )}

                     <div className="space-y-2">
                         {settings.responseStyles.length === 0 ? (
                             <div className="text-sm text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg text-center">
                                 Default AI persona is active.
                             </div>
                         ) : (
                             settings.responseStyles.map(style => (
                                 <div key={style.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors bg-white dark:bg-gray-800">
                                     <div className="flex items-center gap-3">
                                         <div className={`w-2 h-2 rounded-full ${style.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                         <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{style.name}</span>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <button 
                                            onClick={() => toggleStyleActive(style.id)}
                                            className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                                                style.isActive 
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
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
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end flex-shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-black dark:hover:bg-white transition-colors shadow-sm">
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
