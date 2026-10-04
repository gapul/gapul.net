import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
    lang: z.enum(['ja', 'en']).default('ja'),
    source: z.enum(['obsidian']).optional(),
  }),
});

const works = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/works' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    descriptionEn: z.string().optional(),
    tags: z.array(z.string()).default([]),
    repo: z.string().url().optional(),
    url: z.string().url().optional(),
    // Path relative to the yaml file, e.g. ../../assets/works/foo.webp.
    // Served as-is (no sharp), so pre-resize to ~1200px wide.
    image: image().optional(),
    imageAlt: z.string().optional(),
    order: z.number().default(99),
  }),
});

export const collections = { blog, works };
