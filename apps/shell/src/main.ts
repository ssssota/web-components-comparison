import "@wcc/vanilla";
import "@wcc/lit";
import "@wcc/preact";
import "@wcc/svelte";
import "@wcc/vue";
import "@wcc/vue-vapor";
import "@wcc/stencil";
import { REACTION_CHANGE_EVENT, type ReactionChangeDetail } from "@wcc/shared";
import "./styles.css";

const implementations = [
  { tag: "vanilla-feed-card", name: "Vanilla", note: "フレームワークなし" },
  { tag: "lit-feed-card", name: "Lit", note: "LitElement" },
  { tag: "stencil-feed-card", name: "Stencil", note: "Compiler" },
  { tag: "svelte-feed-card", name: "Svelte", note: "Custom Element" },
  { tag: "vue-feed-card", name: "Vue", note: "defineCustomElement" },
  { tag: "vue-vapor-feed-card", name: "Vapor", note: "defineVaporCustomElement" },
  { tag: "preact-feed-card", name: "Preact", note: "preact-custom-element" },
] as const;

const app = document.querySelector("#app");
if (!app) {
  throw new Error("#app が見つかりません");
}

app.innerHTML = `
  <main class="app">
    <header class="hero">
      <p class="eyebrow">WEB COMPONENTS COMPARISON</p>
      <h1>同じカードを、7つの実装で並べる</h1>
      <p class="lede">
        各ライブラリは JSONPlaceholder から投稿を取得し、リアクションを受け付けて表示を更新します。
        Shadow DOM でホストのスタイルから隔離しているため、下の破壊的スタイルを当ててもカードは変わりません。
      </p>
    </header>

    <section class="controls">
      <div class="field">
        <label for="post-id">post-id</label>
        <input id="post-id" type="number" min="1" max="100" value="1" />
      </div>
      <div class="actions">
        <button class="btn primary" type="button" id="load">一括読み込み</button>
        <button class="btn" type="button" id="invalid">存在しない ID</button>
      </div>
      <label class="toggle">
        <input id="hostile" type="checkbox" />
        ホストに破壊的スタイルを適用
      </label>
    </section>

    <section class="grid" id="grid">
      ${implementations
        .map(
          (item) => `
            <article class="bay">
              <div class="bay-head">
                <h2>${item.name}</h2>
                <span class="tag">&lt;${item.tag}&gt; · ${item.note}</span>
              </div>
              <${item.tag} post-id="1"></${item.tag}>
            </article>
          `,
        )
        .join("")}
    </section>

    <aside class="log">
      <h2>reaction-change イベント</h2>
      <ol id="events"><li data-placeholder>リアクションすると、ここに各実装からのイベントが流れます。</li></ol>
    </aside>
  </main>
`;

const input = document.querySelector<HTMLInputElement>("#post-id");
const grid = document.querySelector("#grid");
const events = document.querySelector("#events");
const hostile = document.querySelector<HTMLInputElement>("#hostile");

function cards() {
  return [...document.querySelectorAll(implementations.map((item) => item.tag).join(","))];
}

function applyPostId(id: string) {
  for (const card of cards()) {
    card.setAttribute("post-id", id);
  }
}

document.querySelector("#load")?.addEventListener("click", () => {
  applyPostId(input?.value || "1");
});

document.querySelector("#invalid")?.addEventListener("click", () => {
  if (input) input.value = "999";
  applyPostId("999");
});

hostile?.addEventListener("change", () => {
  document.body.classList.toggle("hostile", Boolean(hostile.checked));
});

grid?.addEventListener(REACTION_CHANGE_EVENT, (event) => {
  if (!events) return;
  const custom = event as CustomEvent<ReactionChangeDetail>;
  const tag = (event.target as Element).tagName.toLowerCase();
  events.querySelector("[data-placeholder]")?.remove();
  const item = document.createElement("li");
  item.textContent = `${tag}: ${custom.detail.emoji} ${custom.detail.count} (${custom.detail.active ? "on" : "off"})`;
  events.prepend(item);
  while (events.children.length > 8) {
    events.lastElementChild?.remove();
  }
});
