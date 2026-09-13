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
    // 事実確認のチェックリスト。
    // 記事中の検証が必要な主張を、確認する側の手順として書き出す。
    // 事業主が文章を読み返すのではなく、この一覧を潰すだけで済むようにするための枠。
    // ボトルネックは執筆ではなく確認であり、そこを短縮しないと本数は増えない。
    claims: z
      .array(
        z.object({
          text: z.string(), // 記事が主張していること
          source: z.string().url().optional(), // 確認先
          check: z.string(), // その画面で何を見れば確認できるか
        })
      )
      .default([]),
  }),
});

export const collections = { articles };
