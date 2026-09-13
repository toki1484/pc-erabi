// サイト全体の設定。運営者名は景品表示法・特定商取引法の観点でも
// 明示が必要になるため、ここで一元管理する。
export const SITE = {
  name: 'pc-erabi',
  // 記事の署名として表示される。
  author: 'みっつ',
  description:
    'ゲーミングPC・BTOの購入検討を、手作業では維持できないデータとツールで助けるサイト。',
};

// Cloudflare Web Analytics のトークン。
// Cloudflare ダッシュボード → Analytics & Logs → Web Analytics で
// サイトを追加すると発行される。
//
// 空のままなら計測タグは出力されない（壊れたページにならない）。
//
// Cookie を使わず、個人を追跡しない方式を選んでいる。
// 「誰が来たか」ではなく「何人来たか」だけが分かればよく、
// 読者に同意バナーを見せる負担も作りたくないため。
export const ANALYTICS_TOKEN = '';
