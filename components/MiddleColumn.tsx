import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Mic, MessageSquare, Search, Star, Save, Trash2, Edit2, X, Check, RotateCcw } from 'lucide-react';
import { JournalEntry } from '../types';
import { format } from 'date-fns';
import { translations, Language } from '../utils/translations';

interface MiddleColumnProps {
  entries: JournalEntry[];
  onAddEntry: (content: string, source?: JournalEntry['source']) => void;
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
}

const MiddleColumn: React.FC<MiddleColumnProps> = ({ 
    entries, onAddEntry, onSaveEntry, onUnsaveEntry, onDeleteEntry, onEditEntry, 
    onSearchAssociation, onToggleImportant, onAiReply, language,
    onOpenTrash, trashCount
}) => {
  const [inputText, setInputText] = useState('');
  const [loadingReplyId, setLoadingReplyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = translations[language].middle;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]); 

  const handleSend = () => {
    if (!inputText.trim()) return;
    onAddEntry(inputText, 'web-input');
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    <div className="flex flex-col h-full bg-white flex-1 min-w-0 relative rounded-2xl shadow-sm overflow-hidden">
      {/* Timeline Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <MessageSquare size={24} />
            </div>
            <p>{t.emptyTitle}</p>
            <p className="text-sm mt-2">{t.emptySub}</p>
          </div>
        ) : (
          entries.map((entry) => {
            const isUnsavedVisual = entry.source === 'chat' || entry.source === 'ai-reply';
            const isEditing = editingId === entry.id;

            return (
              <div 
                  key={entry.id} 
                  className={`group relative transition-colors ${isUnsavedVisual && !entry.isSaved ? 'pl-4' : 'pl-4 border-l-2 border-gray-100 hover:border-blue-500'}`}
              >
                {/* Timestamp & Source */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">
                      {format(entry.timestamp, 'HH:mm')}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
                      entry.source === 'ai-reply' ? 'bg-purple-100 text-purple-600' : 
                      entry.source === 'chat' ? 'bg-blue-50 text-blue-500' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {entry.source === 'chat' ? t.me : entry.source === 'ai-reply' ? t.ai : entry.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.isImportant && <Star size={14} className="text-amber-400 fill-amber-400" />}
                  </div>
                </div>

                {/* Content */}
                {isEditing ? (
                    <div className="mt-2">
                        <textarea 
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-3 border border-blue-200 rounded-lg bg-blue-50/50 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex items-center justify-end gap-2 mt-2">
                            <button onClick={cancelEditing} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                                <X size={14} />
                            </button>
                            <button onClick={() => saveEdit(entry.id)} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                                <Check size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-slate max-w-none text-gray-800 text-base leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </div>
                )}

                {/* Action Bar */}
                {!isEditing && (
                    <div className="flex items-center gap-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      
                      {/* Common Actions */}
                      {!isUnsavedVisual || entry.isSaved ? (
                          <>
                             <button 
                                onClick={() => handleRequestAiReply(entry.id, entry.content)}
                                disabled={loadingReplyId === entry.id}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
                              >
                                {loadingReplyId === entry.id ? (
                                  <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                  <MessageSquare size={14} />
                                )}
                                {t.aiReply}
                              </button>
                              <button 
                                onClick={() => onSearchAssociation(entry.content)}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
                              >
                                <Search size={14} />
                                {t.recall}
                              </button>
                              <button 
                                onClick={() => onToggleImportant(entry.id)}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${entry.isImportant ? 'text-amber-600' : 'text-gray-500 hover:text-amber-600'}`}
                              >
                                <Star size={14} className={entry.isImportant ? "fill-current" : ""} />
                                {t.mark}
                              </button>
                              <div className="w-px h-3 bg-gray-300 mx-1"></div>
                              <button 
                                onClick={() => startEditing(entry)}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
                              >
                                <Edit2 size={14} />
                                {t.edit}
                              </button>
                              {entry.source === 'web-input' && (
                                <button 
                                  onClick={() => onUnsaveEntry(entry.id)}
                                  className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                  <RotateCcw size={14} />
                                  {t.unsave}
                                </button>
                              )}
                              <button 
                                onClick={() => onDeleteEntry(entry.id)}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={14} />
                                {t.delete}
                              </button>
                          </>
                      ) : (
                        // Unsaved Actions
                         <>
                            <button 
                                onClick={() => onSaveEntry(entry.id)}
                                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                <Save size={14} />
                                {t.save}
                            </button>
                            <button 
                                onClick={() => onDeleteEntry(entry.id)}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 size={14} />
                                {t.delete}
                            </button>
                         </>
                      )}
                    </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-6">
        <div className="w-full relative shadow-sm rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            className="w-full max-h-60 p-4 pb-12 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent resize-none"
            rows={2}
          />
          
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <ImageIcon size={18} />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <Mic size={18} />
            </button>
          </div>

          <div className="absolute bottom-2 right-2">
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={16} />
              {t.send}
            </button>
          </div>
        </div>

        {/* Footer Area with Path and Trash */}
        <div className="w-full mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-400">
                {t.savedTo} Daily/{format(new Date(), 'yyMMdd')}.md
            </div>
            
             <button 
                onClick={onOpenTrash}
                className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors relative flex items-center gap-1"
                title={t.trashTooltip}
            >
                <Trash2 size={14} />
                {trashCount > 0 && <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
            </button>
        </div>
      </div>
    </div>
  );
};

export default MiddleColumn;