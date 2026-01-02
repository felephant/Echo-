import React, { useState } from 'react';
import { X, Globe, Eye, Zap, Link as LinkIcon, Check, Plus, ChevronDown, ChevronUp, Edit2, Trash2, Calendar, BookOpen, Layers, Lock, ShieldCheck, Loader2, FolderOpen } from 'lucide-react';
import { AppSettings, ResponseStyle, DataSource } from '../types';
import { translations, Language } from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(true);
  
  // Connection Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: '', detail: '' });
  
  // Auth Simulation State
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);

  // Response Style State
  const [isAddingStyle, setIsAddingStyle] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');

  if (!isOpen) return null;
  const t = translations[settings.language as Language].settings;

  // --- Connection Handlers ---

  const handleConnectionClick = (partition: 'todo' | 'journal' | 'vault', item: DataSource) => {
    if (item.isConnected) {
        // Disconnect immediately
        toggleConnection(partition, item.id);
    } else {
        // Connect logic
        if (item.type === 'google-drive' || item.type === 'google-calendar') {
            // Simulate OAuth Flow
            setIsAuthenticating(item.id);
            setTimeout(() => {
                toggleConnection(partition, item.id);
                setIsAuthenticating(null);
            }, 1500);
        } else {
            // Simple toggle for others
            toggleConnection(partition, item.id);
        }
    }
  };

  const toggleConnection = (partition: 'todo' | 'journal' | 'vault', id: string) => {
      const newConnections = { ...settings.connections };
      newConnections[partition] = newConnections[partition].map(c => 
          c.id === id ? { ...c, isConnected: !c.isConnected } : c
      );
      onUpdateSettings({ ...settings, connections: newConnections });
  };

  const deleteConnection = (partition: 'todo' | 'journal' | 'vault', id: string) => {
      const newConnections = { ...settings.connections };
      newConnections[partition] = newConnections[partition].filter(c => c.id !== id);
      onUpdateSettings({ ...settings, connections: newConnections });
  };

  const addMockConnection = (partition: 'journal' | 'vault') => {
      const newConnections = { ...settings.connections };
      const newId = Date.now().toString();
      const newSource: DataSource = {
          id: newId,
          type: 'google-drive', // Default to Drive for this demo as user asked about it
          name: partition === 'journal' ? 'New Drive Journal' : 'New Drive Vault',
          detail: '/MyFolder',
          isConnected: false
      };
      newConnections[partition] = [...newConnections[partition], newSource];
      onUpdateSettings({ ...settings, connections: newConnections });
      
      // Auto enter edit mode
      setEditingId(newId);
      setEditValues({ name: newSource.name, detail: newSource.detail });
  };

  const startEditing = (item: DataSource) => {
      setEditingId(item.id);
      setEditValues({ name: item.name, detail: item.detail });
  };

  const saveEditing = (partition: 'todo' | 'journal' | 'vault') => {
      const newConnections = { ...settings.connections };
      newConnections[partition] = newConnections[partition].map(c => 
          c.id === editingId ? { ...c, name: editValues.name, detail: editValues.detail } : c
      );
      onUpdateSettings({ ...settings, connections: newConnections });
      setEditingId(null);
  };

  // --- Style Handlers ---

  const handleAddStyle = () => {
    if (!newStyleName || !newStylePrompt) return;
    const newStyle: ResponseStyle = {
      id: Date.now().toString(),
      name: newStyleName,
      prompt: newStylePrompt,
      isActive: false
    };
    onUpdateSettings({ 
      ...settings, 
      responseStyles: [...settings.responseStyles, newStyle] 
    });
    setNewStyleName('');
    setNewStylePrompt('');
    setIsAddingStyle(false);
  };

  const toggleStyleActive = (id: string) => {
    onUpdateSettings({
      ...settings,
      responseStyles: settings.responseStyles.map(s => ({
        ...s,
        isActive: s.id === id 
      }))
    });
  };

  const deleteStyle = (id: string) => {
    onUpdateSettings({
      ...settings,
      responseStyles: settings.responseStyles.filter(s => s.id !== id)
    });
  };

  const renderConnectionItem = (item: DataSource, partition: 'todo' | 'journal' | 'vault') => {
      const isEditing = editingId === item.id;
      const isDrive = item.type === 'google-drive';
      const isAuthLoading = isAuthenticating === item.id;

      return (
        <div key={item.id} className={`flex flex-col gap-2 p-3 border rounded-lg transition-colors ${item.isConnected ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all ${item.isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {isEditing ? <Edit2 size={12}/> : (item.isConnected ? <ShieldCheck size={14} /> : (isDrive ? <Lock size={14} /> : item.name[0]))}
                    </div>
                    
                    {isEditing ? (
                        <div className="flex-1 space-y-3 mr-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Source Name</label>
                                <input 
                                    className="w-full text-sm font-medium border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent px-1 py-0.5 placeholder-gray-300"
                                    value={editValues.name}
                                    onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                                    placeholder="e.g. My Journal"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {isDrive ? 'Root Directory' : 'URL / Path'}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        className="flex-1 text-xs text-gray-700 font-mono border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent px-1 py-0.5 placeholder-gray-300"
                                        value={editValues.detail}
                                        onChange={(e) => setEditValues({...editValues, detail: e.target.value})}
                                        placeholder={isDrive ? "/Echo/Journal" : "https://..."}
                                    />
                                    {isDrive && (
                                        <button className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-medium text-gray-600 transition-colors whitespace-nowrap">
                                            <FolderOpen size={10} />
                                            Browse
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm overflow-hidden min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 truncate">{item.name}</span>
                                {item.isConnected && isDrive && (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full font-medium whitespace-nowrap">
                                        Read/Write
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate font-mono mt-0.5">
                                {isDrive ? <FolderOpen size={12} className="text-gray-400 flex-shrink-0" /> : <LinkIcon size={12} className="text-gray-400 flex-shrink-0" />}
                                {item.detail ? (
                                    <span className="text-gray-600">{item.detail}</span>
                                ) : (
                                    <span className="italic text-gray-400">No path selected</span>
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
                                className={`text-xs font-medium hover:underline flex items-center gap-1 ${item.isConnected ? 'text-gray-400 hover:text-red-600' : 'text-blue-600'}`}
                            >
                                {isAuthLoading && <Loader2 size={10} className="animate-spin" />}
                                {item.isConnected 
                                    ? t.disconnect 
                                    : (isDrive ? 'Authorize' : t.connect)
                                }
                            </button>
                            <button 
                                onClick={() => startEditing(item)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            >
                                <Edit2 size={12} />
                            </button>
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
            {/* Info footer for Drive */}
            {isDrive && !item.isConnected && !isEditing && (
                <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                    Requires Google Drive authorization (scope: drive.file)
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto">
          
          {/* 1. Connections (Priority) */}
          <div className="space-y-3">
             <div 
                className="flex items-center justify-between text-gray-900 font-medium cursor-pointer"
                onClick={() => setIsConnectionsOpen(!isConnectionsOpen)}
             >
                <div className="flex items-center gap-2">
                    <LinkIcon size={18} className="text-gray-500" />
                    {t.connections}
                </div>
                {isConnectionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {isConnectionsOpen && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200 border-l-2 border-gray-100 pl-4">
                    
                    {/* Partition: To-Do */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <Calendar size={12} />
                            {t.sectionTodo}
                        </div>
                        <div className="space-y-2">
                            {settings.connections.todo.map(item => renderConnectionItem(item, 'todo'))}
                        </div>
                    </div>

                    {/* Partition: Journal */}
                    <div className="space-y-2">
                         <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                             <div className="flex items-center gap-2">
                                <BookOpen size={12} />
                                {t.sectionJournal}
                             </div>
                        </div>
                        <div className="space-y-2">
                            {settings.connections.journal.map(item => renderConnectionItem(item, 'journal'))}
                            <button 
                                onClick={() => addMockConnection('journal')}
                                className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus size={12} />
                                {t.addSource}
                            </button>
                        </div>
                    </div>

                    {/* Partition: Vault */}
                    <div className="space-y-2">
                         <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                             <div className="flex items-center gap-2">
                                <Layers size={12} />
                                {t.sectionVault}
                             </div>
                        </div>
                        <div className="space-y-2">
                            {settings.connections.vault.map(item => renderConnectionItem(item, 'vault'))}
                             <button 
                                onClick={() => addMockConnection('vault')}
                                className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus size={12} />
                                {t.addSource}
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>

          {/* 2. Memory & Behavior (Response Styles) */}
           <div className="space-y-3">
             <div className="flex items-center justify-between text-gray-900 font-medium">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-gray-500" />
                  {t.memory}
                </div>
                <button 
                  onClick={() => setIsAddingStyle(!isAddingStyle)}
                  className="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-black transition-colors"
                >
                  {isAddingStyle ? 'Cancel' : t.addStyle}
                </button>
            </div>
            
            {isAddingStyle && (
              <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-lg space-y-3 animate-in fade-in">
                <input 
                  type="text" 
                  placeholder={t.styleName}
                  value={newStyleName}
                  onChange={(e) => setNewStyleName(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                />
                <textarea 
                  placeholder={t.stylePrompt}
                  value={newStylePrompt}
                  onChange={(e) => setNewStylePrompt(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none h-20"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{t.upload}</span>
                  <button 
                    onClick={handleAddStyle}
                    disabled={!newStyleName || !newStylePrompt}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save Style
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {settings.responseStyles.map(style => (
                <div key={style.id} className={`group p-3 rounded-lg border flex items-center justify-between transition-all ${style.isActive ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <span className="font-medium text-sm text-gray-900 truncate">{style.name}</span>
                       {style.isActive && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">{t.active}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{style.prompt}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button 
                      onClick={() => toggleStyleActive(style.id)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${style.isActive ? 'bg-white border-gray-200 text-gray-600' : 'bg-gray-900 text-white border-gray-900'}`}
                    >
                      {style.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => deleteStyle(style.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {settings.responseStyles.length === 0 && !isAddingStyle && (
                <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  No custom styles yet.
                </div>
              )}
            </div>
          </div>

          {/* 3. Language */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <Globe size={18} className="text-gray-500" />
              {t.language}
            </div>
            <select 
                value={settings.language}
                onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-blue-500 transition-colors"
            >
              <option value="English">English</option>
              <option value="Chinese">Chinese (中文)</option>
            </select>
          </div>

          {/* 4. Appearance */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-gray-900 font-medium">
              <Eye size={18} className="text-gray-500" />
              {t.appearance}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                className={`flex items-center justify-center gap-2 p-3 border rounded-lg font-medium text-sm transition-all ${settings.theme === 'light' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Light
                {settings.theme === 'light' && <Check size={14} />}
              </button>
              <button 
                onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                className={`flex items-center justify-center gap-2 p-3 border rounded-lg font-medium text-sm transition-all ${settings.theme === 'dark' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Dark
                {settings.theme === 'dark' && <Check size={14} />}
              </button>
               <button 
                onClick={() => onUpdateSettings({ ...settings, theme: 'system' })}
                className={`flex items-center justify-center gap-2 p-3 border rounded-lg font-medium text-sm transition-all ${settings.theme === 'system' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                System
                {settings.theme === 'system' && <Check size={14} />}
              </button>
            </div>
          </div>

        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors">
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;