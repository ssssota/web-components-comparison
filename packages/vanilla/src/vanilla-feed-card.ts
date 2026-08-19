import {
  REACTION_CHANGE_EVENT,
  REACTION_DEFS,
  avatarUrl,
  cloneReactions,
  createReactions,
  isAbortError,
  loadFeed,
  parsePostId,
  persistReactions,
  toggleReaction,
  type FeedStatus,
  type Post,
  type ReactionChangeDetail,
  type ReactionId,
  type ReactionMap,
  type User,
} from "@wcc/shared";
import cssText from "./styles.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

const refreshIcon = `
<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M21 12a9 9 0 1 1-2.6-6.3"></path>
  <path d="M21 3v6h-6"></path>
</svg>
`;

export class VanillaFeedCard extends HTMLElement {
  static get observedAttributes() {
    return ["post-id"];
  }

  #status: FeedStatus = "loading";
  #post: Post | null = null;
  #user: User | null = null;
  #reactions: ReactionMap = createReactions(1);
  #error = "";
  #saveError = "";
  #loadController: AbortController | null = null;
  #saveController: AbortController | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [sheet];
    root.addEventListener("click", (event) => this.#onClick(event));
  }

  #queued = false;

  connectedCallback() {
    if (!this.hasAttribute("post-id")) {
      this.setAttribute("post-id", "1");
    }
    this.#queueLoad();
  }

  disconnectedCallback() {
    this.#loadController?.abort();
    this.#saveController?.abort();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name === "post-id" && oldValue !== newValue) {
      this.#queueLoad();
    }
  }

  #queueLoad() {
    if (this.#queued || !this.isConnected) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.isConnected) void this.#load();
    });
  }

  get #postId() {
    return parsePostId(this.getAttribute("post-id"));
  }

  #onClick(event: Event) {
    const target = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-action]");
    if (!target || target.disabled) return;

    const action = target.dataset.action;
    if (action === "refresh" || action === "retry") {
      this.#load();
      return;
    }
    if (action === "react") {
      const id = target.dataset.id as ReactionId | undefined;
      if (id) void this.#react(id);
    }
  }

  async #load() {
    const postId = this.#postId;
    this.#loadController?.abort();
    this.#saveController?.abort();
    this.#loadController = new AbortController();
    this.#status = "loading";
    this.#error = "";
    this.#saveError = "";
    this.#render();

    try {
      const { post, user } = await loadFeed(postId, this.#loadController.signal);
      this.#post = post;
      this.#user = user;
      this.#reactions = createReactions(postId);
      this.#status = "ready";
    } catch (error) {
      if (isAbortError(error)) return;
      this.#status = "error";
      this.#error = error instanceof Error ? error.message : "読み込みに失敗しました";
    }

    this.#render();
  }

  async #react(id: ReactionId) {
    if (this.#status !== "ready") return;

    const previous = cloneReactions(this.#reactions);
    const next = toggleReaction(this.#reactions, id);
    this.#reactions = next;
    this.#saveError = "";
    this.#render();
    this.#emit(id, next);

    this.#saveController?.abort();
    this.#saveController = new AbortController();

    try {
      await persistReactions(this.#postId, next, this.#saveController.signal);
    } catch (error) {
      if (isAbortError(error)) return;
      this.#reactions = previous;
      this.#saveError = "保存に失敗しました";
      this.#render();
    }
  }

  #emit(id: ReactionId, reactions: ReactionMap) {
    const def = REACTION_DEFS.find((item) => item.id === id);
    if (!def) return;
    const detail: ReactionChangeDetail = {
      id,
      emoji: def.emoji,
      count: reactions[id].count,
      active: reactions[id].active,
    };
    this.dispatchEvent(
      new CustomEvent(REACTION_CHANGE_EVENT, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  #render() {
    const root = this.shadowRoot;
    if (!root) return;
    const postId = this.#postId;

    root.innerHTML = `
      <div class="card" data-status="${this.#status}">
        <div class="toolbar">
          <span class="kicker">POST ${postId}</span>
          <button type="button" class="icon-btn" data-action="refresh" aria-label="再読み込み" ${this.#status === "loading" ? "disabled" : ""}>
            ${refreshIcon}
          </button>
        </div>
        ${this.#status === "loading" ? this.#skeleton() : ""}
        ${this.#status === "error" ? this.#errorView() : ""}
        ${this.#status === "ready" && this.#post && this.#user ? this.#readyView() : ""}
      </div>
    `;
  }

  #skeleton() {
    return `
      <div class="skeleton" aria-busy="true">
        <div class="skel-head">
          <div class="skel-avatar"></div>
          <div style="flex:1; display:grid; gap:8px;">
            <div class="skel-line" style="width:46%"></div>
            <div class="skel-line" style="width:32%"></div>
          </div>
        </div>
        <div class="skel-line skel-title"></div>
        <div class="skel-line skel-body"></div>
        <div class="skel-line skel-body short"></div>
      </div>
    `;
  }

  #errorView() {
    return `
      <div class="error">
        <p>${escapeHtml(this.#error)}</p>
        <button type="button" class="retry" data-action="retry">再試行</button>
      </div>
    `;
  }

  #readyView() {
    const post = this.#post!;
    const user = this.#user!;
    const reactions = REACTION_DEFS.map((def) => {
      const value = this.#reactions[def.id];
      return `
        <button
          type="button"
          class="reaction"
          data-action="react"
          data-id="${def.id}"
          aria-pressed="${value.active}"
          aria-label="${def.label}"
        >
          <span class="emoji" aria-hidden="true">${def.emoji}</span>
          <span class="count">${value.count}</span>
        </button>
      `;
    }).join("");

    return `
      <header class="header">
        <img class="avatar" alt="" src="${avatarUrl(user.id)}" />
        <div class="meta">
          <div class="name">${escapeHtml(user.name)}</div>
          <div class="handle">@${escapeHtml(user.username)} · ${escapeHtml(user.company.name)}</div>
        </div>
      </header>
      <h2 class="title">${escapeHtml(post.title)}</h2>
      <p class="body">${escapeHtml(post.body)}</p>
      <div class="reactions">${reactions}</div>
      ${this.#saveError ? `<p class="save-error">${escapeHtml(this.#saveError)}</p>` : ""}
    `;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

customElements.define("vanilla-feed-card", VanillaFeedCard);
