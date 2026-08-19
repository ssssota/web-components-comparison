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
import { LitElement, html, nothing, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

export class LitFeedCard extends LitElement {
  static styles = unsafeCSS(styles);
  static properties = {
    postId: { type: Number, attribute: "post-id" },
    status: { state: true },
    post: { state: true },
    user: { state: true },
    reactions: { state: true },
    error: { state: true },
    saveError: { state: true },
  };

  declare postId: number;
  declare status: FeedStatus;
  declare post: Post | null;
  declare user: User | null;
  declare reactions: ReactionMap;
  declare error: string;
  declare saveError: string;

  #loadController: AbortController | null = null;
  #saveController: AbortController | null = null;

  constructor() {
    super();
    this.postId = 1;
    this.status = "loading";
    this.post = null;
    this.user = null;
    this.reactions = createReactions(1);
    this.error = "";
    this.saveError = "";
  }

  connectedCallback() {
    super.connectedCallback();
    void this.#load();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#loadController?.abort();
    this.#saveController?.abort();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("postId") && changed.get("postId") !== undefined) {
      void this.#load();
    }
  }

  async #load() {
    const postId = parsePostId(this.postId);
    this.#loadController?.abort();
    this.#saveController?.abort();
    this.#loadController = new AbortController();
    this.status = "loading";
    this.error = "";
    this.saveError = "";

    try {
      const { post, user } = await loadFeed(postId, this.#loadController.signal);
      this.post = post;
      this.user = user;
      this.reactions = createReactions(postId);
      this.status = "ready";
    } catch (error) {
      if (isAbortError(error)) return;
      this.status = "error";
      this.error = error instanceof Error ? error.message : "読み込みに失敗しました";
    }
  }

  async #react(id: ReactionId) {
    if (this.status !== "ready") return;
    const previous = cloneReactions(this.reactions);
    const next = toggleReaction(this.reactions, id);
    this.reactions = next;
    this.saveError = "";
    this.#emit(id, next);

    this.#saveController?.abort();
    this.#saveController = new AbortController();
    try {
      await persistReactions(parsePostId(this.postId), next, this.#saveController.signal);
    } catch (error) {
      if (isAbortError(error)) return;
      this.reactions = previous;
      this.saveError = "保存に失敗しました";
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

  render() {
    const postId = parsePostId(this.postId);
    return html`
      <div class="card" data-status=${this.status}>
        <div class="toolbar">
          <span class="kicker">POST ${postId}</span>
          <button
            type="button"
            class="icon-btn"
            aria-label="再読み込み"
            ?disabled=${this.status === "loading"}
            @click=${() => this.#load()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.6-6.3"></path>
              <path d="M21 3v6h-6"></path>
            </svg>
          </button>
        </div>
        ${this.status === "loading" ? this.#skeleton() : nothing}
        ${this.status === "error" ? this.#errorView() : nothing}
        ${this.status === "ready" && this.post && this.user ? this.#readyView() : nothing}
      </div>
    `;
  }

  #skeleton() {
    return html`
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
    return html`
      <div class="error">
        <p>${this.error}</p>
        <button type="button" class="retry" @click=${() => this.#load()}>再試行</button>
      </div>
    `;
  }

  #readyView() {
    const post = this.post!;
    const user = this.user!;
    return html`
      <header class="header">
        <img class="avatar" alt="" src=${avatarUrl(user.id)} />
        <div class="meta">
          <div class="name">${user.name}</div>
          <div class="handle">@${user.username} · ${user.company.name}</div>
        </div>
      </header>
      <h2 class="title">${post.title}</h2>
      <p class="body">${post.body}</p>
      <div class="reactions">
        ${REACTION_DEFS.map((def) => {
          const value = this.reactions[def.id];
          return html`
            <button
              type="button"
              class="reaction"
              aria-pressed=${value.active}
              aria-label=${def.label}
              @click=${() => this.#react(def.id)}
            >
              <span class="emoji" aria-hidden="true">${def.emoji}</span>
              <span class="count">${value.count}</span>
            </button>
          `;
        })}
      </div>
      ${this.saveError ? html`<p class="save-error">${this.saveError}</p>` : nothing}
    `;
  }
}

customElements.define("lit-feed-card", LitFeedCard);
