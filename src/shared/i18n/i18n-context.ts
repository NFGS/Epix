import { createContext, useContext } from 'react';

import type { Dictionary, Language } from './dictionaries';

export const LANGUAGE_STORAGE_KEY = 'epix:language';

export interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Dictionary;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);

  if (value === null) {
    throw new Error('useI18n debe usarse dentro de <I18nProvider>.');
  }

  return value;
}
