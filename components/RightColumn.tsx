import React, { useState, useMemo } from 'react';
import { RecallItem } from '../types';
import { BookOpen, Calendar, ChevronDown, ChevronRight, Layers, FileText, Pin, EyeOff, X, RefreshCw, Eye, List, Heart, MessageSquare, PanelRight, PanelRightClose, ChevronUp } from 'lucide-react';
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
  // Filters now act more like tabs
  const [activeTab, setActiveTab] = useState<'all' | 'journal' | 'vault'>('all');
  const [collapsedStates, setCollapsedStates] = useState<Set<string>>(new Set());
  
  // Local State
  const [localPinned, setLocalPinned] = useState<Set<string>>(new Set(['1'])); 
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [removedKeywords, setRemovedKeywords] = useState<Set<string>>(new Set());
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list'); // Default to list for cleaner look
  
  // Inline expansion state instead of modal
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Like and Comment State (Simulated)
  const [likes, setLikes] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<Record<string, {date: string, text: string}[]>>({});
  
  // Comment Input for expanded item
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

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

  const handleSubmitComment = (item: RecallItem) => {
      const text = commentInput[item.id];
      if (!text || !text.trim()) return;
      
      const todayStr = format(new Date(), 'yyyy-MM-dd HH:mm');
      
      // 1. Add to local comments state
      setComments(prev => ({
          ...prev,
          [item.id]: [...(prev[item.id] || []), { date: todayStr, text: text }]
      }));

      // 2. Backlink to daily journal
      const backlinkContent = `> 💬 **Comment on [${item.title}]:** ${text}`;
      onAddEntry(backlinkContent, 'user');

      setCommentInput(prev => ({ ...prev, [item.id]: '' }));
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
                            // List Container
                            <div className={`space-y-2 pl-2 ml-1.5 border-l-2 border-gray-100`}>
                                {displayItems.map(item => {
                                    const isPinned = localPinned.has(item.id);
                                    const isExpanded = expandedItems.has(item.id);
                                    const itemLikes = likes[item.id] || [];
                                    const itemComments = comments[item.id] || [];
                                    const isJournal = item.type === 'journal';
                                    
                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`
                                                relative bg-white border shadow-sm transition-all group/item
                                                ${isJournal ? 'hover:border-blue-300' : 'hover:border-emerald-300'}
                                                ${isExpanded ? 'border-gray-300 ring-1 ring-gray-100' : 'border-gray-200'}
                                                rounded-lg
                                            `}
                                        >
                                            {/* Header Row (Always Visible) */}
                                            <div 
                                                className="p-3 cursor-pointer flex items-start justify-between"
                                                onClick={() => toggleItemExpansion(item.id)}
                                            >
                                                <div className="flex gap-3 overflow-hidden">
                                                     <div className={`mt-0.5 flex-shrink-0 ${isJournal ? 'text-blue-500' : 'text-emerald-500'}`}>
                                                         {isJournal ? <FileText size={14} /> : <BookOpen size={14} />}
                                                     </div>
                                                     <div className="min-w-0">
                                                         <h4 className="text-xs font-bold text-gray-800 leading-tight mb-0.5 truncate">{item.title}</h4>
                                                         {!isExpanded && (
                                                             <p className="text-[10px] text-gray-400 truncate">{item.snippet}</p>
                                                         )}
                                                     </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                     {/* Pinned Icon */}
                                                     {isPinned && <Pin size={12} className="text-amber-500 fill-current" />}
                                                     
                                                     {/* Expand Arrow */}
                                                     {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-300" />}
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="px-3 pb-3 pt-0 animate-in fade-in slide-in-from-top-1">
                                                    <div className="h-px bg-gray-100 w-full mb-3"></div>
                                                    
                                                    {/* Full Snippet/Content */}
                                                    <div className="prose prose-sm prose-gray max-w-none mb-4">
                                                        <p className="text-xs text-gray-600 leading-relaxed">{item.fullContent || item.snippet}</p>
                                                        <p className="text-[10px] text-gray-400 italic mt-2 text-right">{item.date}</p>
                                                    </div>

                                                    {/* Actions Toolbar */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleLike(item.id); }}
                                                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${itemLikes.length > 0 ? 'bg-pink-50 text-pink-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                                            >
                                                                <Heart size={10} className={itemLikes.length > 0 ? "fill-current" : ""} />
                                                                {itemLikes.length || 'Like'}
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); togglePin(e, item.id); }}
                                                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${isPinned ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                                            >
                                                                <Pin size={10} className={isPinned ? "fill-current" : ""} />
                                                                {isPinned ? t.pin : t.pin}
                                                            </button>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); hideItem(e, item.id); }}
                                                            className="text-gray-300 hover:text-gray-500 p-1"
                                                            title={t.hide}
                                                        >
                                                            <EyeOff size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Comments Section */}
                                                    <div className="mt-3 bg-gray-50 rounded p-2">
                                                        {itemComments.length > 0 && (
                                                            <div className="space-y-1 mb-2">
                                                                {itemComments.map((c, i) => (
                                                                    <div key={i} className="text-[10px] text-gray-600 border-l-2 border-blue-200 pl-2">
                                                                        {c.text}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="flex gap-1">
                                                            <input 
                                                                type="text"
                                                                value={commentInput[item.id] || ''}
                                                                onChange={(e) => setCommentInput(p => ({ ...p, [item.id]: e.target.value }))}
                                                                onClick={(e) => e.stopPropagation()}
                                                                placeholder={t.addComment}
                                                                className="flex-1 text-[10px] bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                                                                onKeyDown={(e) => { if(e.key === 'Enter') { e.stopPropagation(); handleSubmitComment(item); }}}
                                                            />
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleSubmitComment(item); }}
                                                                disabled={!commentInput[item.id]?.trim()}
                                                                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                                            >
                                                                <MessageSquare size={10} />
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