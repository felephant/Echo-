
import React, { useState, useEffect } from 'react';
import { format, subDays, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, setMonth, setYear, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, RefreshCw, BarChart2, Smile, SlidersHorizontal, ChevronDown, ChevronUp, Heart, Sparkles, ChevronLeft, ChevronRight, Sidebar } from 'lucide-react';
import { DailyData, OverviewSectionConfig, AccentColor } from '../types';
import { generateDailySummary } from '../services/geminiService';
import { translations, Language } from '../utils/translations';

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
    slate: { bg: 'bg-slate-800', text: 'text-slate-800', ring: 'ring-slate-300', dot: 'bg-slate-500' },
    blue: { bg: 'bg-blue-600', text: 'text-blue-600', ring: 'ring-blue-300', dot: 'bg-blue-500' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', ring: 'ring-purple-300', dot: 'bg-purple-500' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', ring: 'ring-emerald-300', dot: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-600', text: 'text-amber-600', ring: 'ring-amber-300', dot: 'bg-amber-500' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-600', ring: 'ring-rose-300', dot: 'bg-rose-500' },
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
  const t = translations[language].left;
  const styles = ACCENT_STYLES[accentColor];

  useEffect(() => {
      setViewDate(currentDate);
  }, [currentDate]);

  const handleGenerateSummary = async () => {
    if (dailyData.entries.length === 0) return;
    setIsGenerating(true);
    const entryTexts = dailyData.entries.map(e => e.content);
    const summary = await generateDailySummary(entryTexts, overviewConfig, language);
    if (summary) {
      onUpdateSummary(summary);
    }
    setIsGenerating(false);
  };

  const handleRoamClick = () => {
    if (onRoam) {
      onRoam();
    } else {
      const daysAgo = Math.floor(Math.random() * 30);
      onDateChange(subDays(new Date(), daysAgo));
    }
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value; // YYYY-MM
      if(val) {
          const [year, month] = val.split('-').map(Number);
          const newDate = new Date(viewDate);
          newDate.setFullYear(year);
          newDate.setMonth(month - 1);
          newDate.setDate(1); // Default to 1st of month to avoid overflow issues
          setViewDate(newDate);
          // Optional: Auto-jump current selection to 1st of that month too? 
          // onDateChange(newDate); // Uncomment if you want clicking month to also select that month's date
      }
  };

  const toggleSection = (id: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSections(newSet);
  };

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(subMonths(viewDate, 1));

  const sortedSections = [...overviewConfig].sort((a, b) => a.order - b.order);

  const renderSection = (section: OverviewSectionConfig) => {
      if (!section.visible || !dailyData.summary) return null;
      const isExpanded = expandedSections.has(section.id);

      switch(section.id) {
          case 'mood':
              return (
                <div key={section.id} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleSection(section.id)}
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-yellow-50 rounded-full text-yellow-600">
                                <Smile size={16} />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400">{t.mood}</div>
                                <div className="text-sm font-medium text-gray-800">{dailyData.summary.mood.label}</div>
                            </div>
                        </div>
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                    {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-gray-50 bg-gray-50/50">
                            <div className="mt-2 space-y-2">
                                <div className="flex gap-2">
                                    <Sparkles size={12} className="text-purple-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{t.suggestion}</span>
                                        <p className="text-xs text-gray-700 leading-snug">{dailyData.summary.mood.suggestion}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <div className="text-[10px] uppercase font-bold text-gray-400 min-w-[50px]">{t.trend}</div>
                                     <p className="text-xs text-gray-600">{dailyData.summary.mood.trend}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              );
          case 'stats':
              return (
                <div key={section.id} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleSection(section.id)}
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-50 rounded-full text-green-600">
                                <BarChart2 size={16} />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400">{t.stats}</div>
                                <div className="text-sm font-medium text-gray-800">{dailyData.summary.stats.count} {t.itemsLogged}</div>
                            </div>
                        </div>
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                    {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-gray-50 bg-gray-50/50">
                             <div className="mt-2 text-xs text-gray-600 space-y-1">
                                <div className="flex justify-between">
                                    <span>{t.tasks}:</span>
                                    <span className="font-medium">{dailyData.summary.stats.tasksCompleted}</span>
                                </div>
                                <ul className="list-disc list-inside pl-1 text-gray-500 space-y-0.5">
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
                <div key={section.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.summary}</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {dailyData.summary.text}
                    </p>
                </div>
              );
          case 'happiness':
              return (
                 <div key={section.id} className="bg-gradient-to-br from-pink-50 to-orange-50 p-4 rounded-lg border border-pink-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 mb-2 text-pink-600">
                        <Heart size={14} className="fill-current" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">{t.happiness}</h4>
                    </div>
                    <ul className="space-y-2">
                        {dailyData.summary.happiness.map((item, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-700">
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
                        <span key={i} className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-md">
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
                    ${isSelected ? `${styles.bg} text-white font-bold shadow-sm` : 'hover:bg-gray-200'}
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-600'}
                    ${isToday && !isSelected ? `border border-gray-300 ${styles.text} font-bold` : ''}
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
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm overflow-hidden items-center py-4 gap-4">
             <button 
                onClick={onToggle}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Expand"
             >
                <Sidebar size={20} />
             </button>
             <div className="w-8 h-px bg-gray-100"></div>
             <div className="flex flex-col items-center gap-1">
                 <span className="text-2xl font-serif font-bold text-gray-900">{format(currentDate, 'dd')}</span>
                 <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider writing-vertical-lr">{format(currentDate, 'MMM')}</span>
             </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm overflow-y-auto w-full">
      {/* Date Header */}
      <div className="p-6 border-b border-gray-100 relative">
        <div className="absolute top-6 right-6 flex items-center gap-2">
           <button 
            onClick={() => onDateChange(new Date())}
            className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
          >
            {t.today}
          </button>
          <button 
            onClick={handleRoamClick}
            className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm flex items-center gap-1"
          >
            <RefreshCw size={10} />
            {t.roam}
          </button>
          <button 
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`p-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm flex items-center justify-center ${isCalendarOpen ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-200' : 'bg-white'}`}
            title="Toggle Calendar"
          >
            <CalendarIcon size={14} />
          </button>
        </div>

        <div className="flex flex-col pr-32">
          <button 
            onClick={onToggle}
            className="self-start mb-2 p-1 -ml-1 text-gray-300 hover:text-gray-600 transition-colors"
            title="Collapse"
          >
             <ChevronLeft size={16} />
          </button>
          <h1 className="text-xl font-serif text-gray-900 leading-tight flex items-baseline gap-2">
            {format(currentDate, 'dd')}
          </h1>
          <h2 className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">
            {format(currentDate, 'EEEE')}
          </h2>
          <div className="text-[10px] text-gray-400 mt-0.5">{format(currentDate, 'MMMM yyyy')}</div>
        </div>
      </div>

      {isCalendarOpen && (
         <div className="px-6 pb-6 pt-4 animate-in slide-in-from-top-2 fade-in border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between mb-4 relative">
                <button onClick={prevMonth} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 z-10">
                    <ChevronLeft size={16} />
                </button>
                
                {/* Interactive Month Label with Hidden Input */}
                <div className="relative group cursor-pointer">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide group-hover:text-blue-600 transition-colors flex items-center gap-1">
                        {format(viewDate, 'MMMM yyyy')}
                        <ChevronDown size={10} className="text-gray-400 group-hover:text-blue-600" />
                    </span>
                    <input 
                        type="month" 
                        value={format(viewDate, 'yyyy-MM')}
                        onChange={handleMonthSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                </div>

                <button onClick={nextMonth} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 z-10">
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wide">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            
            {renderCalendar()}
        </div>
      )}

      {/* Daily Overview */}
      <div className="px-6 flex-1 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.overview}</h3>
          <div className="flex items-center gap-2">
             <button 
                onClick={onOpenCustomize}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded" 
                title="Customize Layout"
             >
                <SlidersHorizontal size={14} />
             </button>
             {dailyData.entries.length > 0 && (
                <button 
                  onClick={handleGenerateSummary}
                  disabled={isGenerating}
                  className={`text-xs ${styles.text} hover:opacity-80 flex items-center gap-1`}
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                  {dailyData.summary ? t.refresh : t.generate}
                </button>
              )}
          </div>
        </div>

        {dailyData.summary ? (
          <div className="space-y-4">
            {sortedSections.map(renderSection)}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="text-gray-300 mb-2">
              <CalendarIcon className="mx-auto" size={32} />
            </div>
            <p className="text-sm text-gray-400">
              {dailyData.entries.length > 0 
                ? t.generating 
                : t.addEntries}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftColumn;
