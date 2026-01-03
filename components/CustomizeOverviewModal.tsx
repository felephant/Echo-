
import React, { useState } from 'react';
import { X, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { OverviewSectionConfig } from '../types';
import { translations, Language } from '../utils/translations';

interface CustomizeOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OverviewSectionConfig[];
  onUpdateConfig: (newConfig: OverviewSectionConfig[]) => void;
  language: Language;
}

const CustomizeOverviewModal: React.FC<CustomizeOverviewModalProps> = ({ 
  isOpen, onClose, config, onUpdateConfig, language
}) => {
  if (!isOpen) return null;
  const t = translations[language].customize;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleVisibility = (id: string) => {
    onUpdateConfig(config.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newConfig = [...config];
    [newConfig[index - 1], newConfig[index]] = [newConfig[index], newConfig[index - 1]];
    // Update order property
    newConfig.forEach((c, i) => c.order = i);
    onUpdateConfig(newConfig);
  };

  const moveDown = (index: number) => {
    if (index === config.length - 1) return;
    const newConfig = [...config];
    [newConfig[index + 1], newConfig[index]] = [newConfig[index], newConfig[index + 1]];
    newConfig.forEach((c, i) => c.order = i);
    onUpdateConfig(newConfig);
  };

  const updatePrompt = (id: string, prompt: string) => {
    onUpdateConfig(config.map(c => c.id === id ? { ...c, prompt } : c));
  };

  const handleReset = () => {
    onUpdateConfig(config.map((c, i) => ({ ...c, visible: true, order: i })));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 transition-colors">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t.title}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-900/50">
           <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.dragInfo}</p>
           
           <div className="space-y-3">
              {config.map((section, index) => (
                <div key={section.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                   {/* Header Row */}
                   <div className="flex items-center p-3 gap-3 bg-white dark:bg-gray-800">
                      <div className="flex flex-col gap-1">
                        <button 
                            disabled={index === 0} 
                            onClick={() => moveUp(index)}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30"
                        >
                            ▲
                        </button>
                        <button 
                            disabled={index === config.length - 1} 
                            onClick={() => moveDown(index)}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30"
                        >
                            ▼
                        </button>
                      </div>
                      
                      <div 
                        className="flex-1 font-medium text-gray-900 dark:text-gray-100 cursor-pointer select-none"
                        onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
                      >
                        {section.label}
                      </div>

                      <button 
                        onClick={() => toggleVisibility(section.id)}
                        className={`p-2 rounded-full transition-colors ${section.visible ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500 dark:text-gray-400 bg-gray-100/10 dark:bg-gray-700/50'}`}
                      >
                        {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                   </div>

                   {/* Expanded Logic Editor */}
                   {expandedId === section.id && (
                       <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-950/30">
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                               {t.logicLabel}
                           </label>
                           <textarea 
                                value={section.prompt || ''}
                                onChange={(e) => updatePrompt(section.id, e.target.value)}
                                className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
                                rows={4}
                           />
                       </div>
                   )}
                </div>
              ))}
           </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
            <button 
                onClick={handleReset}
                className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
                <RotateCcw size={14} />
                {t.reset}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-black dark:hover:bg-white text-white rounded-lg text-sm font-medium transition-colors">
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default CustomizeOverviewModal;
