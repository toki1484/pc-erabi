import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 記事のスキーマ。
// factChecked は運営者が内容を自分で読んで事実確認したことを示すフラグで、
// これが true でない記事は本番ビルドに含まれない（ゲームデータの verified と同じ思想）。
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    factChecked: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    // 出典。一次情報へのリンクを持たない主張を書かないための枠。
    sources: z
      .array(z.object({ label: z.string(), url: z.string().url() }))
      .default([]),
  }),
});

export const collections = { articles };
