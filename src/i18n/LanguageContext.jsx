import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { TRANSLATIONS } from './translations';
import { TOOLS as RAW_TOOLS, CATEGORIES as RAW_CATEGORIES } from '../data/tools';

const LanguageContext = createContext(null);

export const SUPPORTED_LANGS = [
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('pdflover_lang');
      if (saved && (saved === 'th' || saved === 'en' || saved === 'ja')) {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'th';
  });

  const changeLang = (newLang) => {
    if (newLang === 'th' || newLang === 'en' || newLang === 'ja') {
      setLangState(newLang);
      try {
        localStorage.setItem('pdflover_lang', newLang);
      } catch {
        // Ignore
      }
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const dict = TRANSLATIONS[lang] || TRANSLATIONS.th;

  // Translation helper: t('hero.titleLine1') or t('hero.emptySearch', { search: 'foo' })
  const t = (path, params = {}) => {
    const parts = path.split('.');
    let cur = dict;
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) {
        cur = cur[part];
      } else {
        cur = null;
        break;
      }
    }

    if (cur == null) {
      // Fallback to Thai or English
      let fallback = TRANSLATIONS.th;
      for (const part of parts) {
        if (fallback && typeof fallback === 'object' && part in fallback) {
          fallback = fallback[part];
        } else {
          fallback = path;
          break;
        }
      }
      cur = fallback;
    }

    if (typeof cur === 'string' && params) {
      return Object.entries(params).reduce((str, [k, v]) => {
        return str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }, cur);
    }

    return cur || path;
  };

  // Localized tools list
  const tools = useMemo(() => {
    return RAW_TOOLS.map((tool) => {
      const toolTrans = dict.tools?.[tool.id] || {};
      const catLabel = dict.categories?.[tool.category] || tool.categoryLabel;
      return {
        ...tool,
        name: toolTrans.name || tool.name,
        desc: toolTrans.desc || tool.desc,
        badge: toolTrans.badge !== undefined ? toolTrans.badge : tool.badge,
        categoryLabel: catLabel,
      };
    });
  }, [dict]);

  // Localized categories
  const categories = useMemo(() => {
    return RAW_CATEGORIES.map((cat) => {
      return {
        ...cat,
        label: dict.categories?.[cat.id] || cat.label,
      };
    });
  }, [dict]);

  // Localized tool map
  const toolMap = useMemo(() => {
    return Object.fromEntries(tools.map((t) => [t.id, t]));
  }, [tools]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        changeLang,
        t,
        tools,
        categories,
        toolMap,
        supportedLangs: SUPPORTED_LANGS,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}
