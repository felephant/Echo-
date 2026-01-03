
import React, { useState, useEffect } from 'react';
import { format, isSameDay, endOfMonth, endOfWeek, addDays, addMonths, isSameMonth } from 'date-fns';
import { Calendar as CalendarIcon, RefreshCw, BarChart2, Smile, SlidersHorizontal, ChevronDown, ChevronUp, Heart, Sparkles, ChevronLeft, ChevronRight, Sidebar } from 'lucide-react';
import { DailyData, OverviewSectionConfig, AccentColor } from '../types';
import { generateDailySummary } from '../services/geminiService';
import { translations, Language } from '../utils/translations';

// Helpers for missing date-fns exports
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    return d;
};

interface LeftColumnProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  dailyData: DailyData;
  onUpdateSummary: (summary: DailyData['summary']) => void;
  onRoam?: () => void;
  onOpenCustomize: () => void;
  overviewConfig: OverviewSectionConfig[];
  language: Language;
  isCollapsed?: boolean;
  onToggle?: () => void;
  existingDates?: Set<string>;
  accentColor?: AccentColor;
}

const ACCENT_STYLES: Record<AccentColor, { bg: string, text: string, ring: string, dot: string }> = {
    slate: { bg: 'bg-slate-800 dark:bg-slate-600', text: 'text-slate-800 dark:text-slate-200', ring: 'ring-slate-300 dark:ring-slate-600', dot: 'bg-slate-500' },
    blue: { bg: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-300 dark:ring-blue-800', dot: 'bg-blue-500' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-300 dark:ring-purple-800', dot: 'bg-purple-500' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-300 dark:ring-emerald-800', dot: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-600', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-300 dark:ring-amber-800', dot: 'bg-amber-500' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-300 dark:ring-rose-800', dot: 'bg-rose-500' },
};

const LeftColumn: React.FC<LeftColumnProps> = ({ 
  currentDate, onDateChange, dailyData, onUpdateSummary, onRoam, 
  onOpenCustomize, overviewConfig, language, isCollapsed, onToggle, existingDates,
  accentColor = 'slate'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [viewDate, setViewDate] = useState(currentDate); 
  
  // Custom Picker State
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(viewDate.getFullYear());

  const t = translations[language].left;
  const styles = ACCENT_STYLES[accentColor];

  useEffect(() => {
      setViewDate(currentDate);
  }, [currentDate]);

  // Sync picker year when opening
  useEffect(() => {
      if (isMonthPickerOpen) {
          setPickerYear(viewDate.getFullYear());
          setIsYearPickerOpen(false);
      }
  }, [isMonthPickerOpen, viewDate]);

  const handleGenerateSummary = async () => {
    if (dailyData.entries.length === 0) return;
    setIsGenerating(true);
    try {
        const entryTexts = dailyData.entries.map(e => e.content);
        const summary = await generateDailySummary(entryTexts, overviewConfig, language);
        if (summary) {
            onUpdateSummary(summary);
        }
    } catch (e) {
        console.error("Summary generation error", e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleRoamClick = () => {
    if (onRoam) {
      onRoam();
    } else {
      const daysAgo = Math.floor(Math.random() * 30);
      onDateChange(addDays(new Date(), -daysAgo));
    }
  };

  // Month/Year Picker Logic
  const changePickerYear = (delta: number) => {
      if (isYearPickerOpen) {
          // Jump by 12 years if in year selection mode
          setPickerYear(prev => prev + (delta * 12));
      } else {
          setPickerYear(prev => prev + delta);
      }
  };

  const selectPickerMonth = (monthIndex: number) => {
      const newDate = new Date(viewDate);
      newDate.setFullYear(pickerYear);
      newDate.setMonth(monthIndex);
      newDate.setDate(1); // Reset to 1st to avoid overflow issues
      setViewDate(newDate);
      setIsMonthPickerOpen(false);
  };

  const selectPickerYear = (year: number) => {
      setPickerYear(year);
      setIsYearPickerOpen(false);
  };

  const monthNames = language === 'Chinese' 
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const yearGridStart = Math.floor(pickerYear / 12) * 12;
  const yearGrid = Array.from({ length: 12 }, (_, i) => yearGridStart + i);

  const toggleSection = (id: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSections(newSet);
  };

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(addMonths(viewDate, -1));

  const sortedSections = [...overviewConfig].sort((a, b) => a.order - b.order);

  const renderSection = (section: OverviewSectionConfig) => {
      if (!section.visible || !dailyData.summary) return null;
      const isExpanded = expandedSections.has(section.id);

      switch(section.id) {
          case 'mood':
              return (
                <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        onClick={() => toggleSection(section.id)}
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-yellow-50 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                                <Smile size={16} />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">{t.mood}</div>
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{dailyData.summary.mood.label}</div>
                            </div>
                        </div>
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                    {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="mt-2 space-y-2">
                                <div className="flex gap-2">
                                    <Sparkles size={12} className="text-purple-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{t.suggestion}</span>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">{dailyData.summary.mood.suggestion}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <div className="text-[10px] uppercase font-bold text-gray-400 min-w-[50px]">{t.trend}</div>
                                     <p className="text-xs text-gray-600 dark:text-gray-400">{dailyData.summary.mood.trend}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              );
          case 'stats':
              return (
                <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        onClick={() => toggleSection(section.id)}
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                <BarChart2 size={16} />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">{t.stats}</div>
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{dailyData.summary.stats.count} {t.itemsLogged}</div>
                            </div>
                        </div>
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                    {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                             <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                <div className="flex justify-between">
                                    <span>{t.tasks}:</span>
                                    <span className="font-medium">{dailyData.summary.stats.tasksCompleted}</span>
                                </div>
                                <ul className="list-disc list-inside pl-1 text-gray-500 dark:text-gray-500 space-y-0.5">
                                    {dailyData.summary.stats.details.map((detail, idx) => (
                                        <li key={idx}>{detail}</li>
                                    ))}
                                </ul>
                             </div>
                        </div>
                    )}
                </div>
              );
          case 'summary':
              return (
                <div key={section.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t.summary}</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {dailyData.summary.text}
                    </p>
                </div>
              );
          case 'happiness':
              return (
                 <div key={section.id} className="bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-900/10 dark:to-orange-900/10 p-4 rounded-lg border border-pink-100 dark:border-pink-900/30 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 mb-2 text-pink-600 dark:text-pink-400">
                        <Heart size={14} className="fill-current" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">{t.happiness}</h4>
                    </div>
                    <ul className="space-y-2">
                        {dailyData.summary.happiness.map((item, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="text-pink-400">•</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                 </div>
              );
           case 'keywords':
              return (
                <div key={section.id} className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
                    {dailyData.summary.keywords.map((k, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-md">
                        #{k}
                        </span>
                    ))}
                </div>
              );
          default:
              return null;
      }
  };

  // --- Calendar Grid Logic ---
  const renderCalendar = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            formattedDate = format(day, 'd');
            const isoDate = format(day, 'yyyy-MM-dd');
            const cloneDay = day;
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, currentDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const hasData = existingDates?.has(isoDate);

            days.push(
                <button
                    key={day.toString()}
                    onClick={() => onDateChange(cloneDay)}
                    className={`
                    relative aspect-square rounded-full flex items-center justify-center text-xs transition-all
                    ${isSelected ? `${styles.bg} text-white font-bold shadow-sm` : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
                    ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'}
                    ${isToday && !isSelected ? `border border-gray-300 dark:border-gray-500 ${styles.text} font-bold` : ''}
                    `}
                >
                    {formattedDate}
                    {hasData && !isSelected && (
                        <div className={`absolute bottom-1 w-1 h-1 ${styles.dot} rounded-full`}></div>
                    )}
                </button>
            );
            day = addDays(day, 1);
        }
        rows.push(<div className="grid grid-cols-7 gap-1" key={day.toString()}>{days}</div>);
        days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

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
             <div className="flex flex-col items-center gap-1">
                 <span className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">{format(currentDate, 'dd')}</span>
                 <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider writing-vertical-lr">{format(currentDate, 'MMM')}</span>
             </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden w-full transition-colors relative">
      {/* Date Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 relative bg-white dark:bg-gray-900 z-20 flex-shrink-0">
        <div className="absolute top-6 right-6 flex items-center gap-2">
           <button 
            onClick={() => onDateChange(new Date())}
            className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors shadow-sm"
          >
            {t.today}
          </button>
          <button 
            onClick={handleRoamClick}
            className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors shadow-sm flex items-center gap-1"
          >
            <RefreshCw size={10} />
            {t.roam}
          </button>
          <button 
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`p-1.5 border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors shadow-sm flex items-center justify-center ${isCalendarOpen ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ring-1 ring-gray-200 dark:ring-gray-700' : 'bg-white dark:bg-gray-900'}`}
            title="Toggle Calendar"
          >
            <CalendarIcon size={14} />
          </button>
        </div>

        <div className="flex flex-col pr-32">
          <button 
            onClick={onToggle}
            className="self-start mb-2 p-1 -ml-1 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            title="Collapse"
          >
             <ChevronLeft size={16} />
          </button>
          <h1 className="text-xl font-serif text-gray-900 dark:text-gray-100 leading-tight flex items-baseline gap-2">
            {format(currentDate, 'dd')}
          </h1>
          <h2 className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mt-1">
            {format(currentDate, 'EEEE')}
          </h2>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{format(currentDate, 'MMMM yyyy')}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {isCalendarOpen && (
            <div className="px-6 pb-6 pt-4 animate-in slide-in-from-top-2 fade-in border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 z-10 relative">
                <div className="flex items-center justify-between mb-4 relative z-20">
                    <button onClick={prevMonth} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <ChevronLeft size={16} />
                    </button>
                    
                    {/* Custom Month/Year Picker */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                            className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 focus:outline-none"
                        >
                            {format(viewDate, 'MMMM yyyy')}
                            <ChevronDown size={10} className={`text-gray-400 transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isMonthPickerOpen && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setIsMonthPickerOpen(false)} />
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 z-30 w-64 animate-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <button 
                                            onClick={() => changePickerYear(-1)}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        
                                        <button 
                                            onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                                            className="font-bold text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                        >
                                            {isYearPickerOpen ? `${yearGridStart} - ${yearGridStart + 11}` : pickerYear}
                                        </button>
                                        
                                        <button 
                                            onClick={() => changePickerYear(1)}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                    
                                    {isYearPickerOpen ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {yearGrid.map(year => (
                                                <button
                                                    key={year}
                                                    onClick={() => selectPickerYear(year)}
                                                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                                                        year === pickerYear 
                                                        ? `${styles.bg} text-white shadow-sm` 
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                                                    }`}
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2">
                                            {monthNames.map((m, i) => {
                                                const isSelected = viewDate.getMonth() === i && viewDate.getFullYear() === pickerYear;
                                                return (
                                                    <button
                                                        key={m}
                                                        onClick={() => selectPickerMonth(i)}
                                                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                                                            isSelected 
                                                            ? `${styles.bg} text-white shadow-sm` 
                                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                                                        }`}
                                                    >
                                                        {m}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <button onClick={nextMonth} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                
                {renderCalendar()}
            </div>
        )}

        {/* Sticky Overview Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t.overview}</h3>
            <div className="flex items-center gap-2">
                <button 
                    onClick={onOpenCustomize}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded" 
                    title="Customize Layout"
                >
                    <SlidersHorizontal size={14} />
                </button>
                <button 
                    onClick={handleGenerateSummary}
                    disabled={isGenerating || dailyData.entries.length === 0}
                    title={dailyData.entries.length === 0 ? t.addEntries : ''}
                    className={`px-2 py-1 rounded text-[10px] font-medium border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isGenerating ? <RefreshCw className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                    {dailyData.summary ? t.refresh : t.generate}
                </button>
            </div>
        </div>

        {/* Daily Overview Content */}
        <div className="px-6 py-4">
            {dailyData.summary ? (
            <div className="space-y-4">
                {sortedSections.map(renderSection)}
            </div>
            ) : (
            <div className="text-center py-10">
                <div className="text-gray-300 dark:text-gray-600 mb-2">
                <CalendarIcon className="mx-auto" size={32} />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                {dailyData.entries.length > 0 
                    ? (isGenerating ? t.generating : "Ready to generate summary.") 
                    : t.addEntries}
                </p>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LeftColumn;
