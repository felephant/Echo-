import React, { useState, useMemo, useEffect } from 'react';
import { RecallItem, RecallItemComment } from '../types';
import { BookOpen, Calendar, ChevronDown, ChevronRight, Layers, FileText, Pin, X, RefreshCw, Eye, List, Heart, MessageSquare, Sidebar, Trash2 } from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { format } from 'date-fns';

interface RightColumnProps {
  recallItems: RecallItem[];
  isLoading: boolean;
  language: Language;
  onRefresh: () => void;
  onAddEntry: (content: string, source?: any) => void;
  onEntryUpdate?: (date: string, id: string, updates: any) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const RightColumn: React.FC<RightColumnProps> = ({ 
    recallItems, isLoading, language, onRefresh, onAddEntry, onEntryUpdate, isCollapsed, onToggle
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'journal' | 'vault'>('all');
  const [collapsedStates, setCollapsedStates] = useState<Set<string>>(new Set());
  
  // Local State
  const [localPinned, setLocalPinned] = useState<Set<string>>(new Set(['1'])); 
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [removedKeywords, setRemovedKeywords] = useState<Set<string>>(new Set());
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<Record<string, RecallItemComment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  const t = translations[language].right;

  // Sync local state with props if provided
  useEffect(() => {
    const newLikes: Record<string, string[]> = {};
    const newComments: Record<string, RecallItemComment[]> = {};
    recallItems.forEach(item => {
        if (item.likes) newLikes[item.id] = item.likes;
        if (item.comments) newComments[item.id] = item.comments;
    });
    setLikes(prev => ({ ...prev, ...newLikes }));
    setComments(prev => ({ ...prev, ...newComments }));
  }, [recallItems]);

  const groupedItems = useMemo(() => {
    const hierarchy: Record<string, { journal: RecallItem[], vault: RecallItem[] }> = {};

    recallItems.forEach(item => {
      if (activeTab === 'journal' && item.type !== 'journal') return;
      if (activeTab === 'vault' && (item.type !== 'vault' && item.type !== 'knowledge-base' as any)) return;
      if (hiddenItems.has(item.id)) return;
      
      const keyword = item.keyword || 'General';
      if (removedKeywords.has(keyword)) return;
      if (showPinnedOnly && !localPinned.has(item.id)) return;

      if (!hierarchy[keyword]) hierarchy[keyword] = { journal: [], vault: [] };

      if (item.type === 'journal') hierarchy[keyword].journal.push(item);
      else hierarchy[keyword].vault.push(item);
    });

    return hierarchy;
  }, [recallItems, activeTab, hiddenItems, removedKeywords, showPinnedOnly, localPinned]);

  const toggleCollapse = (id: string) => {
    const newSet = new Set(collapsedStates);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCollapsedStates(newSet);
  };

  const toggleItemExpansion = (id: string) => {
      const newSet = new Set(expandedItems);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedItems(newSet);
  };

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(localPinned);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setLocalPinned(newSet);
  };

  const hideItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHiddenItems(prev => new Set(prev).add(id));
  };

  const removeKeyword = (e: React.MouseEvent, keyword: string) => {
      e.stopPropagation();
      setRemovedKeywords(prev => new Set(prev).add(keyword));
  };

  const handleLike = (item: RecallItem) => {
      const todayStr = format(new Date(), 'yyyy-MM-dd HH:mm');
      const newLikes = [...(likes[item.id] || []), todayStr];
      setLikes(prev => ({ ...prev, [item.id]: newLikes }));
      
      if (onEntryUpdate) {
        onEntryUpdate(item.date, item.id, { likes: newLikes });
      }
  };

  const removeLike = (item: RecallItem, index: number) => {
      const newLikes = (likes[item.id] || []).filter((_, i) => i !== index);
      setLikes(prev => ({
          ...prev,
          [item.id]: newLikes
      }));
      if (onEntryUpdate) {
        onEntryUpdate(item.date, item.id, { likes: newLikes });
      }
  };

  const handleSubmitComment = (item: RecallItem) => {
      const text = commentInput[item.id];
      if (!text || !text.trim()) return;
      const todayStr = format(new Date(), 'yyyy-MM-dd HH:mm');
      const newComment = { id: Date.now().toString(), date: todayStr, text: text };
      const newCommentsList = [...(comments[item.id] || []), newComment];
      
      setComments(prev => ({ ...prev, [item.id]: newCommentsList }));
      setCommentInput(prev => ({ ...prev, [item.id]: '' }));

      if (onEntryUpdate) {
        onEntryUpdate(item.date, item.id, { comments: newCommentsList });
      }
  };

  const keywords = Object.keys(groupedItems);

  // --- Collapsed View ---
  if (isCollapsed) {
    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm overflow-hidden items-center py-4 gap-4">
             <button 
                onClick={onToggle}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Expand"
             >
                <Sidebar size={20} />
             </button>
             <div className="w-8 h-px bg-gray-100"></div>
        </div>
    );
  }

  // --- Expanded View ---
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm overflow-y-auto w-full relative">
      <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t.retro}</h2>
                <button onClick={onRefresh} disabled={isLoading} className={`p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-all ${isLoading ? 'animate-spin' : ''}`}>
                    <RefreshCw size={12} />
                </button>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                    {viewMode === 'card' ? <List size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => setShowPinnedOnly(!showPinnedOnly)} className={`p-1.5 rounded transition-colors ${showPinnedOnly ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                    <Pin size={16} className={showPinnedOnly ? "fill-current" : ""} />
                </button>
                <button onClick={onToggle} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
        
        <div className="flex p-1 bg-gray-100 rounded-lg">
            <button onClick={() => setActiveTab(activeTab === 'journal' ? 'all' : 'journal')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'journal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <Calendar size={12} /> {t.journal}
            </button>
            <button onClick={() => setActiveTab(activeTab === 'vault' ? 'all' : 'vault')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'vault' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <BookOpen size={12} /> {t.vault}
            </button>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (<div key={i} className="h-24 bg-gray-200 rounded-lg"></div>))}
          </div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-10 px-4">
             <div className="text-gray-300 mb-2"><Layers className="mx-auto" size={32} /></div>
            <p className="text-sm text-gray-400">{t.suggestions}</p>
          </div>
        ) : (
            keywords.map(keyword => {
                const group = groupedItems[keyword];
                const isKeywordCollapsed = collapsedStates.has(keyword);
                const displayItems = [];
                if (activeTab !== 'vault') displayItems.push(...group.journal);
                if (activeTab !== 'journal') displayItems.push(...group.vault);
                if (displayItems.length === 0) return null;

                return (
                    <div key={keyword} className="space-y-2">
                        <div className="flex items-center justify-between group cursor-pointer hover:bg-gray-100 p-1.5 -ml-1.5 rounded transition-colors" onClick={() => toggleCollapse(keyword)}>
                            <div className="flex items-center gap-2">
                                <div className="text-gray-400">{isKeywordCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</div>
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{keyword}</span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded-full">{displayItems.length}</span>
                            </div>
                            <button onClick={(e) => removeKeyword(e, keyword)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-opacity"><X size={12} /></button>
                        </div>

                        {!isKeywordCollapsed && (
                            // Removed border-l-2 and pl-2 ml-1.5 for a cleaner look
                            <div className="space-y-3 mt-1">
                                {displayItems.map(item => {
                                    const isPinned = localPinned.has(item.id);
                                    const isExpanded = expandedItems.has(item.id);
                                    const itemLikes = likes[item.id] || [];
                                    const itemComments = comments[item.id] || [];
                                    const isJournal = item.type === 'journal';
                                    
                                    return (
                                        <div key={item.id} className={`relative bg-white border shadow-sm transition-all group/item ${isExpanded ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200 hover:border-blue-300'} rounded-lg`}>
                                            <div className="p-3 cursor-pointer flex items-start justify-between" onClick={() => toggleItemExpansion(item.id)}>
                                                <div className="flex gap-3 overflow-hidden items-start">
                                                     <div className={`mt-0.5 flex-shrink-0 ${isJournal ? 'text-blue-500' : 'text-emerald-500'}`}>
                                                         {isJournal ? <FileText size={16} /> : <BookOpen size={16} />}
                                                     </div>
                                                     <div className="min-w-0">
                                                         <h4 className="text-sm font-bold text-gray-800 leading-tight mb-1 truncate">{item.title}</h4>
                                                         {!isExpanded && <p className="text-xs text-gray-400 truncate">{item.snippet}</p>}
                                                     </div>
                                                </div>
                                                {/* Header Actions: Pin & Expand */}
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                     <button 
                                                        onClick={(e) => togglePin(e, item.id)}
                                                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                                     >
                                                        <Pin size={14} className={isPinned ? "fill-current text-amber-500" : "text-gray-300"} />
                                                     </button>
                                                     {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-300" />}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-1">
                                                    
                                                    {/* Full Content */}
                                                    <div className="prose prose-sm prose-gray max-w-none mb-3">
                                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.fullContent || item.snippet}</p>
                                                        <p className="text-xs text-gray-400 italic mt-3 text-right">{item.date}</p>
                                                    </div>

                                                    {/* Actions Toolbar */}
                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleLike(item); }} 
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${itemLikes.length > 0 ? 'bg-pink-50 text-pink-600 border-pink-100' : 'text-gray-500 border-transparent hover:bg-gray-100'}`}
                                                        >
                                                            <Heart size={14} className={itemLikes.length > 0 ? "fill-current" : ""} /> 
                                                            Like
                                                        </button>
                                                        
                                                        {/* Delete Button */}
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); hideItem(e, item.id); }} 
                                                            className="flex items-center justify-center p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                                                            title={t.hide}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    {/* Like History List */}
                                                    {itemLikes.length > 0 && (
                                                        <div className="mt-3 space-y-1">
                                                            {itemLikes.map((date, idx) => (
                                                                <div key={idx} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded border border-gray-100/50 group/like">
                                                                    <div className="flex items-center gap-2">
                                                                        <Heart size={10} className="text-pink-400 fill-current" />
                                                                        <span className="text-xs text-gray-500">{t.likedIn} {date}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); removeLike(item, idx); }}
                                                                        className="text-gray-300 hover:text-red-500 transition-colors p-0.5 opacity-0 group-hover/like:opacity-100"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Comments Section */}
                                                    <div className="mt-4">
                                                        {itemComments.length > 0 && (
                                                            <div className="space-y-2 mb-3">
                                                                {itemComments.map((c, i) => (
                                                                    <div key={i} className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                                                                        <div className="flex justify-between text-gray-400 text-[10px] mb-1">
                                                                            <span>{c.date}</span>
                                                                        </div>
                                                                        {c.text}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text" 
                                                                value={commentInput[item.id] || ''} 
                                                                onChange={(e) => setCommentInput(p => ({ ...p, [item.id]: e.target.value }))} 
                                                                onClick={(e) => e.stopPropagation()} 
                                                                placeholder={t.addComment} 
                                                                className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 transition-colors" 
                                                                onKeyDown={(e) => { if(e.key === 'Enter') { e.stopPropagation(); handleSubmitComment(item); }}} 
                                                            />
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleSubmitComment(item); }} 
                                                                disabled={!commentInput[item.id]?.trim()} 
                                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                                                            >
                                                                <MessageSquare size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default RightColumn;