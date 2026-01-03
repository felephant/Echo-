
import React, { useState, useMemo, useEffect } from 'react';
import { RecallItem, RecallItemComment } from '../types';
import { BookOpen, Calendar, ChevronDown, ChevronRight, Layers, FileText, Pin, X, RefreshCw, Heart, MessageSquare, Sidebar, Trash2, LayoutGrid, List } from 'lucide-react';
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

const RELEVANCE_LEVELS: Record<number, string> = {
    1: '小想', // Small Thought (Strict)
    2: '中想', // Medium Thought
    3: '漫想', // Roaming Thought
    4: '乱想'  // Wild Thought (Loose)
};

const RightColumn: React.FC<RightColumnProps> = ({ 
    recallItems, isLoading, language, onRefresh, onAddEntry, onEntryUpdate, isCollapsed, onToggle
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'journal' | 'vault'>('all');
  const [collapsedStates, setCollapsedStates] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Local State
  const [localPinned, setLocalPinned] = useState<Set<string>>(new Set(['1'])); 
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [removedKeywords, setRemovedKeywords] = useState<Set<string>>(new Set());
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  
  // Relevance State - Default to 3 (Roam) to ensure content is visible by default
  const [relevanceThreshold, setRelevanceThreshold] = useState<number>(3);
  const [showRelevanceSlider, setShowRelevanceSlider] = useState(false);
  
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
    let minScore = 1;
    switch (relevanceThreshold) {
        case 1: minScore = 3; break;
        case 2: minScore = 2; break;
        case 3: minScore = 1; break;
        case 4: minScore = 1; break; 
        default: minScore = 1;
    }

    recallItems.forEach(item => {
      if (activeTab === 'journal' && item.type !== 'journal') return;
      if (activeTab === 'vault' && (item.type !== 'vault' && item.type !== 'knowledge-base' as any)) return;
      if (hiddenItems.has(item.id)) return;
      
      // Relevance Filtering
      if (item.relevanceScore < minScore) return;

      const keyword = item.keyword || 'General';
      if (removedKeywords.has(keyword)) return;
      if (showPinnedOnly && !localPinned.has(item.id)) return;

      if (!hierarchy[keyword]) hierarchy[keyword] = { journal: [], vault: [] };

      if (item.type === 'journal') hierarchy[keyword].journal.push(item);
      else hierarchy[keyword].vault.push(item);
    });

    return hierarchy;
  }, [recallItems, activeTab, hiddenItems, removedKeywords, showPinnedOnly, localPinned, relevanceThreshold]);

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
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden items-center py-4 gap-4">
             <button 
                onClick={onToggle}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Expand"
             >
                <Sidebar size={20} />
             </button>
             <div className="w-8 h-px bg-gray-100 dark:bg-gray-800"></div>
        </div>
    );
  }

  // --- Expanded View ---
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-y-auto w-full relative transition-colors">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-20">
        <div className="p-6 pb-2">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        {language === 'Chinese' ? '有端联想' : 'RETRO'}
                    </h2>
                    <button onClick={onRefresh} disabled={isLoading} className={`p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${isLoading ? 'animate-spin' : ''}`}>
                        <RefreshCw size={12} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
                         <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                            <List size={14} />
                         </button>
                         <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                            <LayoutGrid size={14} />
                         </button>
                    </div>

                    <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    {/* Relevance Controller */}
                    <button 
                        onClick={() => setShowRelevanceSlider(!showRelevanceSlider)} 
                        className={`flex items-center justify-center px-2.5 py-1.5 rounded-md transition-all text-xs font-bold border ${
                            showRelevanceSlider || relevanceThreshold !== 3
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900' 
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        title="Adjust Relevance"
                    >
                        {RELEVANCE_LEVELS[relevanceThreshold]}
                    </button>
                    
                    <button onClick={() => setShowPinnedOnly(!showPinnedOnly)} className={`p-1.5 rounded transition-colors ${showPinnedOnly ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        <Pin size={16} className={showPinnedOnly ? "fill-current" : ""} />
                    </button>
                    <button onClick={onToggle} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Inline Slider */}
            {showRelevanceSlider && (
                <div className="mb-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2 fade-in">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Association Depth</span>
                        <div className="flex gap-1">
                             {[1, 2, 3, 4].map(level => (
                                 <button
                                    key={level}
                                    onClick={() => setRelevanceThreshold(level)}
                                    className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold transition-all ${
                                        relevanceThreshold === level 
                                        ? 'bg-blue-500 text-white shadow-sm' 
                                        : 'bg-white dark:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                    }`}
                                 >
                                     {level}
                                 </button>
                             ))}
                        </div>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="4" 
                        step="1"
                        value={relevanceThreshold} 
                        onChange={(e) => setRelevanceThreshold(Number(e.target.value))} 
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1.5 font-medium">
                        <span>{RELEVANCE_LEVELS[1]} (Strict)</span>
                        <span>{RELEVANCE_LEVELS[4]} (Loose)</span>
                    </div>
                </div>
            )}
            
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button onClick={() => setActiveTab(activeTab === 'journal' ? 'all' : 'journal')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'journal' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                    <Calendar size={12} /> {t.journal}
                </button>
                <button onClick={() => setActiveTab(activeTab === 'vault' ? 'all' : 'vault')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'vault' ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                    <BookOpen size={12} /> {t.vault}
                </button>
            </div>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (<div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>))}
          </div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-10 px-4">
             <div className="text-gray-300 dark:text-gray-600 mb-2"><Layers className="mx-auto" size={32} /></div>
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
                        {/* Keyword Header */}
                        <div className="flex items-center justify-between group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 -ml-1.5 rounded transition-colors" onClick={() => toggleCollapse(keyword)}>
                            <div className="flex items-center gap-2">
                                <div className="text-gray-400">{isKeywordCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{keyword}</span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 rounded-full">{displayItems.length}</span>
                            </div>
                            <button onClick={(e) => removeKeyword(e, keyword)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-opacity"><X size={12} /></button>
                        </div>

                        {!isKeywordCollapsed && (
                            <div className={`mt-1 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>
                                {displayItems.map(item => {
                                    const isPinned = localPinned.has(item.id);
                                    const isExpanded = expandedItems.has(item.id);
                                    const itemLikes = likes[item.id] || [];
                                    const itemComments = comments[item.id] || [];
                                    const isJournal = item.type === 'journal';
                                    const isHighRelevance = item.relevanceScore >= 2;

                                    // --- Grid View Card ---
                                    if (viewMode === 'grid') {
                                        return (
                                            <div 
                                                key={item.id} 
                                                onClick={() => toggleItemExpansion(item.id)}
                                                className={`relative bg-white dark:bg-gray-800 border p-3 rounded-xl transition-all hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[140px] ${isExpanded ? 'ring-2 ring-blue-500 border-transparent z-10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isJournal ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                                            {isJournal ? 'Journal' : 'Vault'}
                                                        </span>
                                                        {isPinned && <Pin size={12} className="fill-current text-amber-500" />}
                                                    </div>
                                                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-2 mb-1 leading-snug">
                                                        {item.title}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-4 leading-relaxed">
                                                        {item.snippet}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                                    <span className="text-[9px] text-gray-400 font-mono">{item.date}</span>
                                                    {isHighRelevance && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                                                </div>
                                                
                                                {/* Expanded Overlay for Grid */}
                                                {isExpanded && (
                                                    <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl p-3 z-20 flex flex-col overflow-y-auto animate-in fade-in duration-200">
                                                        <button 
                                                            onClick={(e) => {e.stopPropagation(); toggleItemExpansion(item.id);}} 
                                                            className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                        <div className="mt-4 text-xs text-gray-700 dark:text-gray-300 space-y-2 flex-1">
                                                            <p>{item.fullContent || item.snippet}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleLike(item); }} 
                                                                className={`p-1.5 rounded-md transition-colors ${itemLikes.length > 0 ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                            >
                                                                <Heart size={14} className={itemLikes.length > 0 ? "fill-current" : ""} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); togglePin(e, item.id); }}
                                                                className={`p-1.5 rounded-md transition-colors ${isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                            >
                                                                <Pin size={14} className={isPinned ? "fill-current" : ""} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // --- List View Item ---
                                    return (
                                        <div key={item.id} className={`relative bg-white dark:bg-gray-800 border shadow-sm transition-all group/item ${isExpanded ? 'border-blue-400 ring-1 ring-blue-100 dark:ring-blue-900' : isHighRelevance ? 'border-blue-200 dark:border-blue-900' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'} rounded-lg`}>
                                            <div className="p-3 cursor-pointer flex items-start justify-between" onClick={() => toggleItemExpansion(item.id)}>
                                                <div className="flex gap-3 overflow-hidden items-start">
                                                     <div className={`mt-0.5 flex-shrink-0 ${isJournal ? 'text-blue-500 dark:text-blue-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                                                         {isJournal ? <FileText size={16} /> : <BookOpen size={16} />}
                                                     </div>
                                                     <div className="min-w-0">
                                                         <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight mb-1 truncate">{item.title}</h4>
                                                            {isHighRelevance && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mb-1" title="Strong Match"></span>}
                                                         </div>
                                                         {!isExpanded && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.snippet}</p>}
                                                     </div>
                                                </div>
                                                {/* Header Actions: Pin & Expand */}
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                     <button 
                                                        onClick={(e) => togglePin(e, item.id)}
                                                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                     >
                                                        <Pin size={14} className={isPinned ? "fill-current text-amber-500" : "text-gray-300 dark:text-gray-600"} />
                                                     </button>
                                                     {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-1">
                                                    
                                                    {/* Full Content */}
                                                    <div className="prose prose-sm prose-gray dark:prose-invert max-w-none mb-3">
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{item.fullContent || item.snippet}</p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-3 text-right">{item.date}</p>
                                                    </div>

                                                    {/* Actions Toolbar */}
                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleLike(item); }} 
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${itemLikes.length > 0 ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-900' : 'text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                        >
                                                            <Heart size={14} className={itemLikes.length > 0 ? "fill-current" : ""} /> 
                                                            Like
                                                        </button>
                                                        
                                                        {/* Delete Button */}
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); hideItem(e, item.id); }} 
                                                            className="flex items-center justify-center p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                            title={t.hide}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    {/* Like History List */}
                                                    {itemLikes.length > 0 && (
                                                        <div className="mt-3 space-y-1">
                                                            {itemLikes.map((date, idx) => (
                                                                <div key={idx} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-100/50 dark:border-gray-700 group/like">
                                                                    <div className="flex items-center gap-2">
                                                                        <Heart size={10} className="text-pink-400 fill-current" />
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t.likedIn} {date}</span>
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
                                                                    <div key={i} className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
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
                                                                className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-colors text-gray-800 dark:text-gray-200" 
                                                                onKeyDown={(e) => { if(e.key === 'Enter') { e.stopPropagation(); handleSubmitComment(item); }}} 
                                                            />
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleSubmitComment(item); }} 
                                                                disabled={!commentInput[item.id]?.trim()} 
                                                                className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
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
