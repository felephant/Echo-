
import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Mic, MessageSquare, Search, Star, Trash2, Edit2, Sparkles, BookDown, ArrowUp, RefreshCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { JournalEntry, AccentColor } from '../types';
import { format } from 'date-fns';
import { translations, Language } from '../utils/translations';

interface MiddleColumnProps {
  entries: JournalEntry[];
  currentDate?: Date;
  onAddEntry: (content: string) => void;
  onAskAI: (content: string) => void;
  onSaveEntry: (id: string) => void;
  onUnsaveEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onEditEntry: (id: string, content: string) => void;
  onSearchAssociation: (content: string) => void;
  onToggleImportant: (id: string) => void;
  onAiReply: (entryId: string, content: string) => void;
  language: Language;
  onOpenTrash: () => void;
  trashCount: number;
  accentColor?: AccentColor;
  isSaving?: boolean;
  isConnected?: boolean;
}

const ACCENT_STYLES: Record<AccentColor, { bg: string, text: string, border: string, btnHover: string }> = {
    slate: { bg: 'bg-slate-800 dark:bg-slate-600', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-500', btnHover: 'hover:bg-black dark:hover:bg-slate-800' },
    blue: { bg: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500', btnHover: 'hover:bg-blue-700' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500', btnHover: 'hover:bg-purple-700' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500', btnHover: 'hover:bg-emerald-700' },
    amber: { bg: 'bg-amber-600', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500', btnHover: 'hover:bg-amber-700' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500', btnHover: 'hover:bg-rose-700' },
};

const MiddleColumn: React.FC<MiddleColumnProps> = ({ 
    entries, currentDate = new Date(), onAddEntry, onAskAI, onSaveEntry, onUnsaveEntry, onDeleteEntry, onEditEntry, 
    onSearchAssociation, onToggleImportant, onAiReply, language,
    onOpenTrash, trashCount, accentColor = 'slate', isSaving = false, isConnected = false
}) => {
  const [inputText, setInputText] = useState('');
  const [loadingReplyId, setLoadingReplyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = translations[language].middle;
  const styles = ACCENT_STYLES[accentColor];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]); 

  const handleSave = () => {
    if (!inputText.trim()) return;
    onAddEntry(inputText);
    setInputText('');
  };

  const handleAsk = () => {
    if (!inputText.trim()) return;
    onAskAI(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Default behavior on Enter: Save (Log it)
      handleSave();
    }
  };

  const handleRequestAiReply = (entryId: string, content: string) => {
    setLoadingReplyId(entryId);
    onAiReply(entryId, content);
    setTimeout(() => setLoadingReplyId(null), 1000); 
  };

  const startEditing = (entry: JournalEntry) => {
      setEditingId(entry.id);
      setEditContent(entry.content);
  };

  const cancelEditing = () => {
      setEditingId(null);
      setEditContent('');
  };

  const saveEdit = (id: string) => {
      onEditEntry(id, editContent);
      setEditingId(null);
      setEditContent('');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 flex-1 min-w-0 relative rounded-xl shadow-sm overflow-hidden transition-colors">
      {/* Timeline Scroll Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-600 opacity-60">
            <MessageSquare size={48} className="mb-4" />
            <h3 className="text-lg font-bold">{t.emptyTitle}</h3>
            <p className="text-sm">{t.emptySub}</p>
          </div>
        ) : (
          entries.map(entry => {
            const isAi = entry.source === 'ai-reply';
            const isEditing = editingId === entry.id;
            const isChat = entry.source === 'chat' || entry.source === 'web-input';
            const isUnsaved = !entry.isSaved;

            return (
              <div key={entry.id} className="group animate-in slide-in-from-bottom-2 duration-300 relative flex flex-col items-start gap-1">
                {/* Content */}
                <div className={`relative text-sm leading-relaxed text-gray-800 dark:text-gray-200 ${isAi ? 'italic' : ''} w-full`}>
                    {isEditing ? (
                        <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <textarea 
                                className="w-full text-sm bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={3}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={cancelEditing} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">Cancel</button>
                                <button onClick={() => saveEdit(entry.id)} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50">Save</button>
                            </div>
                        </div>
                    ) : (
                        <div className="whitespace-pre-line break-words">
                            {entry.content}
                        </div>
                    )}
                </div>

                {/* Metadata Row (Timestamp, Source, Actions) */}
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 h-5">
                    {entry.hasTime && (
                         <span className="font-mono">{format(entry.timestamp, 'HH:mm')}</span>
                    )}
                    
                    {/* Source Tag for App entries */}
                    {isChat && (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1 rounded">Echo</span>
                    )}

                    {isAi && <span className="text-xs font-bold text-gray-500">AI</span>}
                    
                    {entry.isImportant && <Star size={10} className="fill-current text-amber-400" />}
                    
                    {/* Actions only visible on hover */}
                    {!isEditing && (
                        <div className="hidden group-hover:flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                                {/* Save/Unsave Action - Explicit Colors as Requested */}
                                {isChat && (
                                    <>
                                        {isUnsaved ? (
                                            <button 
                                                onClick={() => onSaveEntry(entry.id)}
                                                className="text-gray-400 hover:text-green-500 transition-colors"
                                                title={t.save}
                                            >
                                                <BookDown size={12} />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => onUnsaveEntry(entry.id)}
                                                className="text-green-500 hover:text-gray-400 transition-colors"
                                                title={t.unsave}
                                            >
                                                <BookDown size={12} />
                                            </button>
                                        )}
                                    </>
                                )}

                                {!isAi && (
                                    <>
                                        <button 
                                            onClick={() => onSearchAssociation(entry.content)}
                                            className="hover:text-blue-500 transition-colors"
                                            title={t.recall}
                                        >
                                            <Search size={12} />
                                        </button>
                                        <button 
                                            onClick={() => handleRequestAiReply(entry.id, entry.content)}
                                            className="hover:text-purple-500 transition-colors"
                                            title={t.aiReply}
                                            disabled={!!loadingReplyId}
                                        >
                                            {loadingReplyId === entry.id ? <div className="animate-spin w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full" /> : <Sparkles size={12} />}
                                        </button>
                                        <button 
                                            onClick={() => onToggleImportant(entry.id)}
                                            className={`transition-colors ${entry.isImportant ? 'text-amber-400' : 'hover:text-amber-400'}`}
                                            title={t.mark}
                                        >
                                            <Star size={12} className={entry.isImportant ? "fill-current" : ""} />
                                        </button>
                                        <button 
                                            onClick={() => startEditing(entry)}
                                            className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            title={t.edit}
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                    </>
                                )}
                                <button 
                                    onClick={() => onDeleteEntry(entry.id)}
                                    className="hover:text-red-500 transition-colors"
                                    title={t.delete}
                                >
                                    <Trash2 size={12} />
                                </button>
                        </div>
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 relative">
        <div className={`relative rounded-2xl border transition-colors bg-gray-50 dark:bg-gray-800 focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:ring-2 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-900 ${styles.border} focus-within:ring-blue-100 dark:focus-within:ring-blue-900/50`}>
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholder}
                className="w-full bg-transparent p-4 pr-12 pb-12 rounded-2xl focus:outline-none resize-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 min-h-[100px]"
                rows={3}
            />
            
            <div className="absolute bottom-2 left-3 flex gap-2">
                 <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" title="Upload Image (Demo)">
                    <ImageIcon size={18} />
                 </button>
                 <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" title="Voice Input (Demo)">
                    <Mic size={18} />
                 </button>
            </div>

            <div className="absolute bottom-3 right-3 flex gap-2">
                <button 
                    onClick={handleAsk}
                    disabled={!inputText.trim()}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:text-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                    title="Ask AI (Not saved by default)"
                >
                    <Sparkles size={14} />
                    {language === 'Chinese' ? '问' : 'Ask'}
                </button>
                <button 
                    onClick={handleSave}
                    disabled={!inputText.trim()}
                    className={`px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${styles.bg} ${styles.btnHover}`}
                    title="Save to Journal"
                >
                    <ArrowUp size={16} />
                    {language === 'Chinese' ? '存' : 'Save'}
                </button>
            </div>
        </div>
        
        {/* Footer Area with Status and Trash */}
        <div className="flex items-center justify-between mt-2 px-2">
             <div className="flex items-center gap-1.5">
                 {!isConnected ? (
                     <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                         <AlertCircle size={10} /> {t.statusNotConnected}
                     </span>
                 ) : isSaving ? (
                     <span className="flex items-center gap-1 text-[10px] text-blue-500 font-medium animate-pulse">
                         <RefreshCcw size={10} className="animate-spin" /> {t.statusSyncing}
                     </span>
                 ) : (
                     <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-500 font-medium transition-colors duration-500">
                         <CheckCircle size={10} /> {t.statusSaved}
                     </span>
                 )}
             </div>

             <button 
                onClick={onOpenTrash}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative flex items-center gap-1" 
                title={t.trashTooltip}
             >
                <Trash2 size={14} />
                {trashCount > 0 && (
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                )}
             </button>
        </div>
      </div>
    </div>
  );
};

export default MiddleColumn;
