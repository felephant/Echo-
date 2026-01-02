
import React, { useState } from 'react';
import { X, Globe, Link as LinkIcon, Check, Plus, ChevronDown, ChevronUp, Edit2, Trash2, Calendar, BookOpen, Layers, Folder, Save, AlertTriangle } from 'lucide-react';
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
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(true);
  
  // Connection Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: '', detail: '' });
  
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);

  if (!isOpen) return null;
  const t = translations[settings.language as Language].settings;

  // --- Connection Handlers ---

  const handleConnectionClick = async (partition: 'todo' | 'journal' | 'vault', item: DataSource) => {
    if (item.isConnected) {
        // Disconnect logic
        toggleConnection(partition, item.id, false);
        return;
    }

    // Connect Logic
    if (item.type === 'local') {
        try {
            const handle = await selectDirectory();
            if (handle) {
                const newConnections = { ...settings.connections };
                newConnections[partition] = newConnections[partition].map(c => 
                    c.id === item.id ? { 
                        ...c, 
                        isConnected: true, 
                        detail: handle.name,
                        fileHandle: handle // Store handle in memory state (won't persist to JSON, but managed by DB)
                    } : c
                );
                onUpdateSettings({ ...settings, connections: newConnections });
            }
        } catch (err) {
            console.error('Directory selection failed', err);
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

  const addMockConnection = (partition: 'journal' | 'vault') => {
      const newConnections = { ...settings.connections };
      const newId = Date.now().toString();
      const newSource: DataSource = {
          id: newId,
          type: 'local', 
          name: partition === 'journal' ? 'Local Journal' : 'Local Vault',
          detail: 'Not connected',
          isConnected: false
      };
      newConnections[partition] = [...newConnections[partition], newSource];
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
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                                    item.isConnected 
                                    ? 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50' 
                                    : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'
                                }`}
                            >
                                {isAuthLoading ? '...' : (item.isConnected ? t.disconnect : (isLocal ? 'Select Folder' : t.connect))}
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
             {!item.isConnected && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                    <AlertTriangle size={10} />
                    Data is stored in memory only. Connect a folder to save files.
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* Connections Section */}
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
                <div className="space-y-6 border-l-2 border-gray-100 pl-4">
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
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors">
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
