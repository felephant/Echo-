
import React from 'react';
import { Sun, Moon, Smartphone, Check, RotateCcw, Monitor, Type, LayoutTemplate } from 'lucide-react';
import { AppSettings, AccentColor } from '../types';
import { translations, Language } from '../utils/translations';

interface AppearanceMenuProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetLayout: () => void;
}

const AppearanceMenu: React.FC<AppearanceMenuProps> = ({ 
    isOpen, onClose, settings, onUpdateSettings, onResetLayout 
}) => {
  if (!isOpen) return null;

  const language = settings.language as Language;
  const t = translations[language].settings;

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
      onUpdateSettings({ ...settings, theme });
  };

  const handleLanguageChange = (lang: 'English' | 'Chinese') => {
      onUpdateSettings({ ...settings, language: lang });
  };

  const handleAccentChange = (color: AccentColor) => {
      onUpdateSettings({ ...settings, accentColor: color });
  };

  const accentColors: { value: AccentColor; label: string; class: string }[] = [
      { value: 'slate', label: 'Slate', class: 'bg-slate-800 dark:bg-slate-400' },
      { value: 'blue', label: 'Blue', class: 'bg-blue-600' },
      { value: 'purple', label: 'Purple', class: 'bg-purple-600' },
      { value: 'emerald', label: 'Emerald', class: 'bg-emerald-600' },
      { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
      { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div className="absolute top-14 right-16 z-50 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-top-2">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Monitor size={16} />
                {t.appearance}
            </h3>
        </div>
        
        <div className="p-4 space-y-5">
            {/* Language */}
            <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Type size={10} /> {t.language}
                </label>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {['English', 'Chinese'].map((lang) => (
                        <button
                            key={lang}
                            onClick={() => handleLanguageChange(lang as any)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                                settings.language === lang 
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            {lang === 'English' ? 'English' : '中文'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Theme */}
            <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                    <button 
                        onClick={() => handleThemeChange('light')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                            settings.theme === 'light' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' 
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Sun size={14} />
                    </button>
                    <button 
                        onClick={() => handleThemeChange('dark')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                            settings.theme === 'dark' 
                            ? 'border-blue-500 bg-gray-800 text-white dark:border-blue-500' 
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Moon size={14} />
                    </button>
                    <button 
                        onClick={() => handleThemeChange('system')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                            settings.theme === 'system' 
                            ? 'border-blue-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white dark:border-blue-500' 
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Smartphone size={14} />
                    </button>
                </div>
            </div>
            
            {/* Accent Color */}
            <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                    {accentColors.map(color => (
                        <button
                            key={color.value}
                            onClick={() => handleAccentChange(color.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${color.class} ${settings.accentColor === color.value ? 'border-gray-900 dark:border-white scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'}`}
                            title={color.label}
                        >
                            {settings.accentColor === color.value && <Check size={12} className="text-white dark:text-gray-900" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Layout Reset */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
            <button 
                onClick={() => { onResetLayout(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-lg transition-all"
            >
                <LayoutTemplate size={14} />
                Reset Layout Defaults
            </button>
        </div>
      </div>
    </>
  );
};

export default AppearanceMenu;
