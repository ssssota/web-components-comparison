import {
  REACTION_CHANGE_EVENT,
  REACTION_DEFS,
  avatarUrl,
  cloneReactions,
  createReactions,
  isAbortError,
  loadFeed,
  persistReactions,
  toggleReaction,
  type FeedStatus,
  type Post,
  type ReactionChangeDetail,
  type ReactionId,
  type ReactionMap,
  type User,
} from "@wcc/shared";
import { Component, Element, Prop, State, Watch, h } from "@stencil/core";

@Component({
  tag: "stencil-feed-card",
  styleUrl: "stencil-feed-card.css",
  shadow: true,
})
export class StencilFeedCard {
  @Element() host!: HTMLElement;
  @Prop({ attribute: "post-id", reflect: true }) postId = 1;

  @State() status: FeedStatus = "loading";
  @State() post: Post | null = null;
  @State() user: User | null = null;
  @State() reactions: ReactionMap = createReactions(1);
  @State() error = "";
  @State() saveError = "";

  #loadController: AbortController | null = null;
  #saveController: AbortController | null = null;

  componentWillLoad() {
    void this.load();
  }

  disconnectedCallback() {
    this.#loadController?.abort();
    this.#saveController?.abort();
  }

  @Watch("postId")
  onPostIdChange() {
    void this.load();
  }

  async load() {
    const postId = Number(this.postId) > 0 ? Number(this.postId) : 1;
    this.#loadController?.abort();
    this.#saveController?.abort();
    this.#loadController = new AbortController();
    this.status = "loading";
    this.error = "";
    this.saveError = "";

    try {
      const data = await loadFeed(postId, this.#loadController.signal);
      this.post = data.post;
      this.user = data.user;
      this.reactions = createReactions(postId);
      this.status = "ready";
    } catch (error) {
      if (isAbortError(error)) return;
      this.status = "error";
      this.error = error instanceof Error ? error.message : "読み込みに失敗しました";
    }
  }

  async react(id: ReactionId) {
    if (this.status !== "ready") return;
    const previous = cloneReactions(this.reactions);
    const next = toggleReaction(this.reactions, id);
    this.reactions = next;
    this.saveError = "";
    this.emitReaction(id, next);

    this.#saveController?.abort();
    this.#saveController = new AbortController();
    try {
      const postId = Number(this.postId) > 0 ? Number(this.postId) : 1;
      await persistReactions(postId, next, this.#saveController.signal);
    } catch (error) {
      if (isAbortError(error)) return;
      this.reactions = previous;
      this.saveError = "保存に失敗しました";
    }
  }

  emitReaction(id: ReactionId, reactions: ReactionMap) {
    const def = REACTION_DEFS.find((item) => item.id === id);
    if (!def) return;
    const detail: ReactionChangeDetail = {
      id,
      emoji: def.emoji,
      count: reactions[id].count,
      active: reactions[id].active,
    };
    this.host.dispatchEvent(
      new CustomEvent(REACTION_CHANGE_EVENT, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const postId = Number(this.postId) > 0 ? Number(this.postId) : 1;
    return (
      <div class="card" data-status={this.status}>
        <div class="toolbar">
          <span class="kicker">POST {postId}</span>
          <button
            type="button"
            class="icon-btn"
            aria-label="再読み込み"
            disabled={this.status === "loading"}
            onClick={() => this.load()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.6-6.3"></path>
              <path d="M21 3v6h-6"></path>
            </svg>
          </button>
        </div>

        {this.status === "loading" && (
          <div class="skeleton" aria-busy="true">
            <div class="skel-head">
              <div class="skel-avatar"></div>
              <div style={{ flex: "1", display: "grid", gap: "8px" }}>
                <div class="skel-line" style={{ width: "46%" }}></div>
                <div class="skel-line" style={{ width: "32%" }}></div>
              </div>
            </div>
            <div class="skel-line skel-title"></div>
            <div class="skel-line skel-body"></div>
            <div class="skel-line skel-body short"></div>
          </div>
        )}

        {this.status === "error" && (
          <div class="error">
            <p>{this.error}</p>
            <button type="button" class="retry" onClick={() => this.load()}>
              再試行
            </button>
          </div>
        )}

        {this.status === "ready" && this.post && this.user && [
            <header class="header">
              <img class="avatar" alt="" src={avatarUrl(this.user.id)} />
              <div class="meta">
                <div class="name">{this.user.name}</div>
                <div class="handle">
                  @{this.user.username} · {this.user.company.name}
                </div>
              </div>
            </header>,
            <h2 class="title">{this.post.title}</h2>,
            <p class="body">{this.post.body}</p>,
            <div class="reactions">
              {REACTION_DEFS.map((def) => {
                const value = this.reactions[def.id];
                return (
                  <button
                    type="button"
                    class="reaction"
                    aria-pressed={String(value.active)}
                    aria-label={def.label}
                    onClick={() => this.react(def.id)}
                  >
                    <span class="emoji" aria-hidden="true">
                      {def.emoji}
                    </span>
                    <span class="count">{value.count}</span>
                  </button>
                );
              })}
            </div>,
            this.saveError ? <p class="save-error">{this.saveError}</p> : null,
          ]}
      </div>
    );
  }
}
