
import React from 'react';
import { X, RefreshCw, Trash2, AlertCircle, Clock } from 'lucide-react';
import { DeletedEntry } from '../types';
import { translations, Language } from '../utils/translations';
import { format } from 'date-fns';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedEntries: DeletedEntry[];
  onRestore: (entry: DeletedEntry) => void;
  onPermanentDelete: (id: string) => void;
  onClearAll: () => void;
  language: Language;
}

const TrashModal: React.FC<TrashModalProps> = ({ 
  isOpen, onClose, deletedEntries, onRestore, onPermanentDelete, onClearAll, language 
}) => {
  if (!isOpen) return null;
  const t = translations[language].trash;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 transition-colors">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Trash2 className="text-red-500" size={20} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Retention Notice */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock size={14} />
            {t.retentionNotice}
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-950/50">
          {deletedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-600">
              <Trash2 size={48} className="mb-4 opacity-20" />
              <p>{t.empty}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletedEntries.map(entry => (
                <div key={entry.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-3">
                   <div className="flex justify-between items-start">
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {format(new Date(entry.originalDateKey), 'yyyy-MM-dd')} • {format(entry.timestamp, 'HH:mm')}
                      </div>
                      <div className="flex gap-2">
                        <button 
                            onClick={() => onRestore(entry)}
                            className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors"
                        >
                            <RefreshCw size={12} />
                            {t.restore}
                        </button>
                        <button 
                            onClick={() => onPermanentDelete(entry.id)}
                            className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded transition-colors"
                        >
                            <X size={12} />
                            {t.deleteForever}
                        </button>
                      </div>
                   </div>
                   <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-3">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {deletedEntries.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
                <button 
                    onClick={onClearAll}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
                >
                    <AlertCircle size={16} />
                    {t.clearAll}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default TrashModal;
