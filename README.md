# Web Components Comparison

同じ見た目・同じ挙動のフィードカードを、7 つの実装で並べて比較します。

各カードは Shadow DOM でホストから隔離され、JSONPlaceholder から投稿を取得したあと、ユーザーのリアクションを受けて表示を更新します。各パッケージは `customElements.define` 済みの JS モジュールを公開し、shell はそれを import するだけです。

## 実装比較

バンドルサイズは minify 済みの `dist/index.js`（ランタイム + コンポーネント + スタイル込み）です。

| 実装 | ソース | サイズ | gzip | Custom Elements の作り方 | スタイル |
| --- | --- | ---: | ---: | --- | --- |
| [Vanilla](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) | [`vanilla-feed-card.ts`](packages/vanilla/src/vanilla-feed-card.ts) | 10.0 kB | 3.9 kB | `HTMLElement` を継承して `customElements.define`。ランタイムなし | `adoptedStyleSheets` |
| [Lit](https://lit.dev/docs/components/overview/) | [`lit-feed-card.ts`](packages/lit/src/lit-feed-card.ts) | 28.5 kB | 9.6 kB | `LitElement`。`post-id` は reactive property | `static styles` |
| [Stencil](https://stenciljs.com/docs/introduction) | [`stencil-feed-card.tsx`](packages/stencil/src/components/stencil-feed-card/stencil-feed-card.tsx) | 29.2 kB | 11.0 kB | 専用コンパイラが CE を生成。`@Prop` / `@Watch` | `styleUrl` + `shadow: true` |
| [Preact](https://github.com/preactjs/preact-custom-element) | [`feed-card.tsx`](packages/preact/src/feed-card.tsx) | 31.7 kB | 10.9 kB | `preact-custom-element` で登録。フックで状態管理 | `adoptedStyleSheets` |
| [Svelte](https://svelte.dev/docs/svelte/custom-elements) | [`FeedCard.svelte`](packages/svelte/src/FeedCard.svelte) | 68.9 kB | 21.2 kB | `<svelte:options customElement>`。`postId` は `attribute: "post-id"` で対応 | コンポーネントの `<style>` |
| [Vue Vapor](https://vuejs.org/api/custom-elements.html) | [`FeedCard.ce.vue`](packages/vue-vapor/src/FeedCard.ce.vue) | 130.6 kB | 40.2 kB | `defineVaporCustomElement`。VDOM なし | `.ce.vue` の `<style>` |
| [Vue](https://vuejs.org/guide/extras/web-components.html) | [`FeedCard.ce.vue`](packages/vue/src/FeedCard.ce.vue) | 153.5 kB | 47.9 kB | `defineCustomElement`。`Number` props と `emit` → `CustomEvent` | `.ce.vue` の `<style>` |

- Vanilla は依存がなく、DOM 更新は自前です。
- Lit / Stencil / Preact は小さなランタイム（またはコンパイラ出力）で、属性監視と再描画をライブラリが持ちます。
- Svelte はコンパイラが CE クラスを出します。kebab-case 属性はデフォルトでは `postid` になるため、`props.attribute` の指定が必要です。
- Vue は `.ce.vue` が公式の CE モードです。Vapor は同じ SFC を VDOM なしでコンパイルし、このカードでは VDOM 版より小さくなっています。

## 起動

```bash
pnpm install
pnpm dev
```

先に各要素パッケージをビルドしてから、`apps/shell` の Vite 開発サーバが立ち上がります。
