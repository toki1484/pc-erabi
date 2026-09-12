// 記事の取得を一箇所にまとめる。
// 本番ビルドでは factChecked が true の記事だけを公開する。
// 開発サーバーでは未確認の記事も見えるようにして、確認作業をしやすくする。
import { getCollection } from 'astro:content';

export async function getPublishedArticles() {
  const all = await getCollection('articles');
  const visible = import.meta.env.PROD
    ? all.filter((a) => a.data.factChecked === true)
    : all;
  return visible.sort((a, b) => b.data.publishDate - a.data.publishDate);
}
