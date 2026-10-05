import { z } from 'zod';

export const tvmazeImageSchema = z.object({
  medium: z.string().nullable(),
  original: z.string().nullable(),
});

export const tvmazeChannelSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const tvmazeShowSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  genres: z.array(z.string()),
  premiered: z.string().nullable().optional(),
  rating: z
    .object({
      average: z.number().nullable(),
    })
    .nullable()
    .optional(),
  image: tvmazeImageSchema.nullable().optional(),
  summary: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  network: tvmazeChannelSchema.nullable().optional(),
  webChannel: tvmazeChannelSchema.nullable().optional(),
});

export const tvmazeSearchResultSchema = z.object({
  score: z.number(),
  show: tvmazeShowSchema,
});

export const tvmazeEpisodeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  season: z.number().int().nullable().optional(),
  number: z.number().int().nullable().optional(),
  airdate: z.string().nullable().optional(),
});

export const tvmazeScheduleItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  season: z.number().int().nullable().optional(),
  number: z.number().int().nullable().optional(),
  airdate: z.string(),
  airtime: z.string().nullable().optional(),
  show: tvmazeShowSchema,
});

export const tvmazeSearchResponseSchema = z.array(tvmazeSearchResultSchema);
export const tvmazeEpisodeListSchema = z.array(tvmazeEpisodeSchema);
export const tvmazeScheduleResponseSchema = z.array(tvmazeScheduleItemSchema);

export type TvmazeShowDto = z.infer<typeof tvmazeShowSchema>;
export type TvmazeSearchResultDto = z.infer<typeof tvmazeSearchResultSchema>;
export type TvmazeEpisodeDto = z.infer<typeof tvmazeEpisodeSchema>;
export type TvmazeScheduleItemDto = z.infer<typeof tvmazeScheduleItemSchema>;
