import type { Show } from '@/domain/entities/show';

/**
 * Datos ficticios del incremento 1 (diseño base). No provienen de TVmaze:
 * se reemplazan por el repositorio real en el incremento 2.
 */
export const demoShows: Show[] = [
  {
    id: 9001,
    name: 'Luces de Neón',
    year: 2024,
    genres: ['Drama', 'Misterio'],
    rating: 8.1,
    summary: 'Una ciudad costera esconde secretos bajo sus letreros luminosos.',
  },
  {
    id: 9002,
    name: 'El Valle de los Ecos',
    year: 2023,
    genres: ['Ciencia ficción', 'Aventura'],
    rating: 7.6,
    summary: 'Una expedición descubre que el valle responde a sus preguntas.',
  },
  {
    id: 9003,
    name: 'Café Amargo',
    year: 2022,
    genres: ['Comedia', 'Romance'],
    rating: 7.2,
    summary: 'Baristas, rivalidades y una receta que nadie quiere compartir.',
  },
  {
    id: 9004,
    name: 'Órbita 7',
    year: 2025,
    genres: ['Ciencia ficción', 'Suspense'],
    rating: 8.4,
    summary: 'La tripulación de una estación orbital pierde contacto con la Tierra.',
  },
  {
    id: 9005,
    name: 'La Casa del Río',
    year: 2021,
    genres: ['Drama', 'Familiar'],
    rating: 7.9,
    summary: 'Tres generaciones regresan a la casa que creían haber vendido.',
  },
  {
    id: 9006,
    name: 'Sombras de Medianoche',
    year: 2024,
    genres: ['Terror', 'Misterio'],
    rating: 7.4,
    summary: 'Cada noche, un pueblo distinto aparece en el mismo mapa.',
  },
];
