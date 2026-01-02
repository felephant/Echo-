import React, { useState, useMemo } from 'react';
import { RecallItem } from '../types';
import { BookOpen, Calendar, ChevronDown, ChevronRight, Layers, FileText, Pin, EyeOff, X, RefreshCw, Eye, List, Heart, MessageSquare, PanelRight, PanelRightClose } from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { format } from 'date-fns';

interface RightColumnProps {
  recallItems: RecallItem[];
  isLoading: boolean;
  language: Language;
  onRefresh: () => void;
  onAddEntry: (content: string, source?: any) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const RightColumn: React.FC<RightColumnProps> = ({ 
    recallItems, isLoading, language, onRefresh, onAddEntry, isCollapsed, onToggle
}) => {
  // Filters now act more like tabs, but we support "both" conceptually if needed. 
  // For the UI requested, we will treat them as toggles that can be active.
  const [activeTab, setActiveTab] = useState<'all' | 'journal' | 'vault'>('all');
  const [collapsedStates, setCollapsedStates] = useState<Set<string>>(new Set());
  
  // Local State
  const [localPinned, setLocalPinned] = useState<Set<string>>(new Set(['1'])); 
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [removedKeywords, setRemovedKeywords] = useState<Set<string>>(new Set());
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  // Like and Comment State (Simulated Local Storage for Demo)
  const [likes, setLikes] = useState<Record<string, string[]>>({}); // itemId -> ['260101']
  const [comments, setComments] = useState<Record<string, {date: string, text: string}[]>>({});
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<RecallItem | null>(null);
  const [commentInput, setCommentInput] = useState('');

  const t = translations[language].right;

  const groupedItems = useMemo(() => {
    const hierarchy: Record<string, { journal: RecallItem[], vault: RecallItem[] }> = {};

    recallItems.forEach(item => {
      // Tab Filtering
      if (activeTab === 'journal' && item.type !== 'journal') return;
      if (activeTab === 'vault' && (item.type !== 'vault' && item.type !== 'knowledge-base' as any)) return;

      if (hiddenItems.has(item.id)) return;
      
      const keyword = item.keyword || 'General';
      if (removedKeywords.has(keyword)) return;
      
      if (showPinnedOnly && !localPinned.has(item.id)) return;

      if (!hierarchy[keyword]) {
        hierarchy[keyword] = { journal: [], vault: [] };
      }

      if (item.type === 'journal') {
        hierarchy[keyword].journal.push(item);
      } else {
        hierarchy[keyword].vault.push(item);
      }
    });

    return hierarchy;
  }, [recallItems, activeTab, hiddenItems, removedKeywords, showPinnedOnly, localPinned]);

  const toggleCollapse = (id: string) => {
    const newSet = new Set(collapsedStates);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCollapsedStates(newSet);
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

  const handleLike = (id: string) => {
      const todayStr = format(new Date(), 'yyMMdd');
      setLikes(prev => ({
          ...prev,
          [id]: [...(prev[id] || []), todayStr]
      }));
  };

  const handleRemoveLike = (id: string, index: number) => {
      setLikes(prev => {
          const newLikes = [...(prev[id] || [])];
          newLikes.splice(index, 1);
          return { ...prev, [id]: newLikes };
      });
  };

  const handleSubmitComment = () => {
      if (!selectedItem || !commentInput.trim()) return;
      
      const todayStr = format(new Date(), 'yyyy-MM-dd HH:mm');
      
      // 1. Add to local comments state
      setComments(prev => ({
          ...prev,
          [selectedItem.id]: [...(prev[selectedItem.id] || []), { date: todayStr, text: commentInput }]
      }));

      // 2. Backlink to daily journal
      const backlinkContent = `> 💬 **Comment on [${selectedItem.title}]:** ${commentInput}`;
      onAddEntry(backlinkContent, 'user');

      setCommentInput('');
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
                <PanelRight size={20} />
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
            {/* Left: Title & Refresh */}
            <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    {t.retro}
                </h2>
                <button 
                    onClick={onRefresh}
                    disabled={isLoading}
                    className={`p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-all ${isLoading ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={12} />
                </button>
            </div>

            {/* Right: View, Pin, Collapse */}
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Toggle View"
                >
                    {viewMode === 'card' ? <List size={16} /> : <Eye size={16} />}
                </button>
                <button 
                    onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                    className={`p-1.5 rounded transition-colors ${showPinnedOnly ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    title="Filter Pinned"
                >
                    <Pin size={16} className={showPinnedOnly ? "fill-current" : ""} />
                </button>
                <button 
                    onClick={onToggle}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Collapse"
                >
                    <PanelRightClose size={16} />
                </button>
            </div>
        </div>
        
        {/* Segmented Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-lg">
            <button 
                onClick={() => setActiveTab(activeTab === 'journal' ? 'all' : 'journal')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'journal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Calendar size={12} />
                {t.journal}
            </button>
            <button 
                onClick={() => setActiveTab(activeTab === 'vault' ? 'all' : 'vault')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'vault' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <BookOpen size={12} />
                {t.vault}
            </button>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-10 px-4">
             <div className="text-gray-300 mb-2">
              <Layers className="mx-auto" size={32} />
            </div>
            <p className="text-sm text-gray-400">
              {t.suggestions}
            </p>
          </div>
        ) : (
            keywords.map(keyword => {
                const group = groupedItems[keyword];
                const isKeywordCollapsed = collapsedStates.has(keyword);
                
                // Combine items for display in this keyword group
                const displayItems = [];
                if (activeTab !== 'vault') displayItems.push(...group.journal);
                if (activeTab !== 'journal') displayItems.push(...group.vault);
                
                if (displayItems.length === 0) return null;

                return (
                    <div key={keyword} className="space-y-2">
                        {/* Keyword Header */}
                        <div 
                            className="flex items-center justify-between group cursor-pointer hover:bg-gray-100 p-1.5 -ml-1.5 rounded transition-colors"
                            onClick={() => toggleCollapse(keyword)}
                        >
                            <div className="flex items-center gap-2">
                                <div className="text-gray-400">
                                    {isKeywordCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                </div>
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                    {keyword}
                                </span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded-full">{displayItems.length}</span>
                            </div>
                            <button 
                                onClick={(e) => removeKeyword(e, keyword)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-opacity"
                                title="Dismiss Topic"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        {!isKeywordCollapsed && (
                            // Grid or List Container
                            <div className={`${viewMode === 'card' ? 'grid grid-cols-2 gap-2' : 'space-y-2'} pl-2 ml-1.5 border-l-2 border-gray-100`}>
                                {displayItems.map(item => {
                                    const isPinned = localPinned.has(item.id);
                                    const itemLikes = likes[item.id] || [];
                                    const isJournal = item.type === 'journal';
                                    
                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`
                                                relative bg-white border border-gray-200 shadow-sm cursor-pointer transition-all group/item
                                                ${isJournal ? 'hover:border-blue-300' : 'hover:border-emerald-300'}
                                                ${viewMode === 'list' ? 'p-2 rounded flex items-center justify-between' : 'p-3 rounded-lg flex flex-col justify-between h-full'}
                                            `}
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            {viewMode === 'list' ? (
                                                // --- List Item ---
                                                <>
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {isJournal ? <FileText size={12} className="text-blue-500 flex-shrink-0" /> : <BookOpen size={12} className="text-emerald-500 flex-shrink-0" />}
                                                        <span className="text-xs text-gray-700 truncate">{item.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                            {isPinned && <Pin size={10} className="text-amber-500 fill-current" />}
                                                            {itemLikes.length > 0 && (
                                                                <div className="flex items-center gap-0.5 text-[9px] text-pink-500">
                                                                    <Heart size={8} className="fill-current" />
                                                                    {itemLikes.length}
                                                                </div>
                                                            )}
                                                    </div>
                                                </>
                                            ) : (
                                                // --- Square Card Item ---
                                                <>
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            {isJournal ? <FileText size={12} className="text-blue-500" /> : <BookOpen size={12} className="text-emerald-500" />}
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={(e) => togglePin(e, item.id)}
                                                                    className={`hover:bg-gray-100 rounded-full transition-colors ${isPinned ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}
                                                                >
                                                                    <Pin size={12} className={isPinned ? "fill-current" : ""} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <h4 className="text-xs font-bold text-gray-800 leading-tight mb-2 line-clamp-2">
                                                            {item.title}
                                                        </h4>
                                                    </div>
                                                    <div className="mt-2">
                                                        <div className="h-px bg-gray-100 mb-2"></div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] text-gray-400 font-mono">{item.date}</span>
                                                            {itemLikes.length > 0 && (
                                                                <div className="flex items-center gap-0.5 text-[9px] text-pink-500">
                                                                    <Heart size={8} className="fill-current" />
                                                                    {itemLikes.length}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
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

      {/* Item Content Modal */}
      {selectedItem && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col p-6 animate-in fade-in slide-in-from-right-4 rounded-2xl">
            <div className="flex justify-between items-start mb-4">
                <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${selectedItem.type === 'journal' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {selectedItem.type === 'journal' ? t.journal : t.vault}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{selectedItem.date}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedItem.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => togglePin({ stopPropagation: () => {} } as any, selectedItem.id)}
                        className={`p-2 rounded-full transition-colors ${localPinned.has(selectedItem.id) ? 'bg-amber-50 text-amber-500' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={t.pin}
                    >
                         <Pin size={18} className={localPinned.has(selectedItem.id) ? "fill-current" : ""} />
                    </button>
                    <button 
                        onClick={() => setSelectedItem(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
                <div className="prose prose-sm prose-gray max-w-none mb-8">
                    <p>{selectedItem.fullContent || selectedItem.snippet}</p>
                    <p className="text-gray-400 italic mt-4">[Full content simulated for this demo]</p>
                </div>

                {/* Interaction Area */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                    {/* Likes */}
                    <div>
                        <button 
                            onClick={() => handleLike(selectedItem.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors mb-2"
                        >
                            <Heart size={14} className={(likes[selectedItem.id] || []).length > 0 ? "fill-current" : ""} />
                            Like
                            {(likes[selectedItem.id] || []).length > 0 && (
                                <span className="opacity-80">({(likes[selectedItem.id] || []).length})</span>
                            )}
                        </button>
                        
                        {/* Vertical Like History */}
                        {(likes[selectedItem.id] || []).length > 0 && (
                            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                                {(likes[selectedItem.id] || []).map((date, i) => (
                                    <div key={i} className="text-[10px] text-gray-500 flex items-center gap-2 px-1 group/like-item">
                                         <Heart size={8} className="text-pink-400 fill-current" />
                                         <span>{t.likedIn} {date}</span>
                                         <button 
                                            onClick={() => handleRemoveLike(selectedItem.id, i)}
                                            className="ml-auto opacity-0 group-hover/like-item:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
                                            title="Remove"
                                         >
                                             <X size={10} />
                                         </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t.comments}</h4>
                        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                            {(comments[selectedItem.id] || []).map((c, i) => (
                                <div key={i} className="bg-gray-50 p-2 rounded text-xs text-gray-700">
                                    <span className="text-gray-400 text-[10px] block mb-0.5">{c.date}</span>
                                    {c.text}
                                </div>
                            ))}
                            {(!comments[selectedItem.id] || comments[selectedItem.id].length === 0) && (
                                <p className="text-xs text-gray-300 italic">No comments yet.</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                placeholder={t.addComment}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                            />
                            <button 
                                onClick={handleSubmitComment}
                                disabled={!commentInput.trim()}
                                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                <MessageSquare size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default RightColumn;