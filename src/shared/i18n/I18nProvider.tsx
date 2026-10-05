import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { dictionaries, type Language } from './dictionaries';
import { I18nContext, LANGUAGE_STORAGE_KEY, type I18nContextValue } from './i18n-context';

function isLanguage(value: string | null): value is Language {
  return value === 'es' || value === 'en';
}

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) {
      return stored;
    }
  } catch {
    // Almacenamiento no disponible (modo privado): se usa el idioma por defecto.
  }

  return 'es';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Sin persistencia disponible: el cambio sigue activo en memoria.
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t: dictionaries[language] }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
