export const es = {
  appName: 'Epix',
  nav: {
    home: 'Inicio',
    search: 'Buscar',
    schedule: 'Agenda',
    favorites: 'Favoritos',
    history: 'Historial',
    profile: 'Perfil',
  },
  common: {
    retry: 'Reintentar',
    comingSoon: 'Próximamente',
    demo: 'Demo',
    goHome: 'Volver al inicio',
    clear: 'Limpiar búsqueda',
    profileAria: 'Abrir perfil',
    loading: 'Cargando…',
    errorTitle: 'Algo salió mal',
    mainNavigation: 'Navegación principal',
  },
  screens: {
    home: {
      title: 'Inicio',
      greeting: 'Bienvenido a Epix',
      subtitle: 'Series destacadas con datos demostrativos del incremento 1.',
      demoNotice: 'Datos demo: la conexión real con TVmaze llega en el incremento 2.',
    },
    search: {
      title: 'Buscar',
      inputLabel: 'Buscar series',
      placeholder: 'Buscar series…',
      emptyTitle: 'Encuentra tu próxima serie',
      emptyDescription:
        'Escribe al menos 3 letras para buscar series (conexión a TVmaze en el siguiente incremento).',
    },
    schedule: {
      title: 'Agenda',
      emptyTitle: 'Agenda en preparación',
      emptyDescription:
        'Aquí verás los episodios que se emiten hoy según tu país (GPS) en el siguiente incremento.',
    },
    favorites: {
      title: 'Favoritos',
      emptyTitle: 'Todavía no tienes favoritos',
      emptyDescription: 'Guarda series para encontrarlas rápido, incluso sin conexión.',
    },
    history: {
      title: 'Historial',
      emptyTitle: 'Todavía no hay historial',
      emptyDescription: 'Las series que abras aparecerán aquí ordenadas por fecha y hora.',
    },
    profile: {
      title: 'Perfil',
      appearance: 'Apariencia',
      theme: 'Tema',
      themeLight: 'Claro',
      themeDark: 'Oscuro',
      themeSystem: 'Sistema',
      language: 'Idioma',
      content: 'Contenido',
      favoriteGenres: 'Géneros favoritos',
      maxAge: 'Edad máxima',
      notifications: 'Notificaciones',
      notificationsHint: 'Recordatorios de nuevos episodios',
      telemetry: 'Telemetría',
      telemetryHint: 'Ayuda anónima para mejorar Epix',
    },
    detail: {
      title: 'Detalle de serie',
      emptyTitle: 'Detalle en construcción',
      emptyDescription:
        'La sinopsis, el elenco y los episodios llegarán con la conexión a TVmaze en el siguiente incremento.',
    },
    notFound: {
      title: 'Página no encontrada',
      emptyDescription: 'La ruta que buscas no existe o fue movida.',
    },
  },
};

export type Dictionary = typeof es;

export const en: Dictionary = {
  appName: 'Epix',
  nav: {
    home: 'Home',
    search: 'Search',
    schedule: 'Schedule',
    favorites: 'Favorites',
    history: 'History',
    profile: 'Profile',
  },
  common: {
    retry: 'Retry',
    comingSoon: 'Coming soon',
    demo: 'Demo',
    goHome: 'Back to home',
    clear: 'Clear search',
    profileAria: 'Open profile',
    loading: 'Loading…',
    errorTitle: 'Something went wrong',
    mainNavigation: 'Main navigation',
  },
  screens: {
    home: {
      title: 'Home',
      greeting: 'Welcome to Epix',
      subtitle: 'Featured shows with demo data from increment 1.',
      demoNotice: 'Demo data: the real TVmaze connection arrives in increment 2.',
    },
    search: {
      title: 'Search',
      inputLabel: 'Search shows',
      placeholder: 'Search shows…',
      emptyTitle: 'Find your next show',
      emptyDescription:
        'Type at least 3 letters to search shows (TVmaze connection in the next increment).',
    },
    schedule: {
      title: 'Schedule',
      emptyTitle: 'Schedule in progress',
      emptyDescription:
        "Here you'll see today's episodes for your country (GPS) in the next increment.",
    },
    favorites: {
      title: 'Favorites',
      emptyTitle: 'No favorites yet',
      emptyDescription: 'Save shows to find them fast, even offline.',
    },
    history: {
      title: 'History',
      emptyTitle: 'No history yet',
      emptyDescription: 'Shows you open will appear here, ordered by date and time.',
    },
    profile: {
      title: 'Profile',
      appearance: 'Appearance',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      language: 'Language',
      content: 'Content',
      favoriteGenres: 'Favorite genres',
      maxAge: 'Maximum age rating',
      notifications: 'Notifications',
      notificationsHint: 'New episode reminders',
      telemetry: 'Telemetry',
      telemetryHint: 'Anonymous help to improve Epix',
    },
    detail: {
      title: 'Show detail',
      emptyTitle: 'Detail under construction',
      emptyDescription:
        'Synopsis, cast and episodes will arrive with the TVmaze connection in the next increment.',
    },
    notFound: {
      title: 'Page not found',
      emptyDescription: 'The route you are looking for does not exist or was moved.',
    },
  },
};

export const dictionaries = { es, en } as const;

export type Language = keyof typeof dictionaries;
