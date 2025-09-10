import { useCallback } from 'react';

export function useI18n() {
  const t = useCallback((key: string, substitutions?: string | string[]) => {
    try {
      return chrome.i18n.getMessage(key, substitutions);
    } catch (error) {
      console.warn(`i18n key not found: ${key}`, error);
      return key;
    }
  }, []);

  const currentLocale = useCallback(() => {
    return chrome.i18n.getUILanguage();
  }, []);

  return {
    t,
    locale: currentLocale(),
  };
}
