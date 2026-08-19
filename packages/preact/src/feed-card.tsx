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
import { useEffect, useRef, useState } from "preact/hooks";

interface Props {
  postId?: string | number;
  "post-id"?: string | number;
}

export function FeedCard(props: Props) {
  const id = parsePostId(props.postId ?? props["post-id"] ?? 1);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [post, setPost] = useState<Post | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [reactions, setReactions] = useState<ReactionMap>(() => createReactions(id));
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const hostRef = useRef<HTMLDivElement>(null);
  const saveController = useRef<AbortController | null>(null);

  async function load() {
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    setSaveError("");

    try {
      const data = await loadFeed(id, controller.signal);
      setPost(data.post);
      setUser(data.user);
      setReactions(createReactions(id));
      setStatus("ready");
    } catch (err) {
      if (isAbortError(err)) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    }

    return () => controller.abort();
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    setSaveError("");

    void loadFeed(id, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setPost(data.post);
        setUser(data.user);
        setReactions(createReactions(id));
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      });

    return () => {
      cancelled = true;
      controller.abort();
      saveController.current?.abort();
    };
  }, [id]);

  function emit(nextId: ReactionId, next: ReactionMap) {
    const def = REACTION_DEFS.find((item) => item.id === nextId);
    const host = hostRef.current?.getRootNode();
    const element = host instanceof ShadowRoot ? host.host : hostRef.current;
    if (!def || !element) return;
    const detail: ReactionChangeDetail = {
      id: nextId,
      emoji: def.emoji,
      count: next[nextId].count,
      active: next[nextId].active,
    };
    element.dispatchEvent(
      new CustomEvent(REACTION_CHANGE_EVENT, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  async function react(reactionId: ReactionId) {
    if (status !== "ready") return;
    const previous = cloneReactions(reactions);
    const next = toggleReaction(reactions, reactionId);
    setReactions(next);
    setSaveError("");
    emit(reactionId, next);

    saveController.current?.abort();
    saveController.current = new AbortController();
    try {
      await persistReactions(id, next, saveController.current.signal);
    } catch (err) {
      if (isAbortError(err)) return;
      setReactions(previous);
      setSaveError("保存に失敗しました");
    }
  }

  return (
    <div class="card" data-status={status} ref={hostRef}>
      <div class="toolbar">
        <span class="kicker">POST {id}</span>
        <button
          type="button"
          class="icon-btn"
          aria-label="再読み込み"
          disabled={status === "loading"}
          onClick={() => void load()}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.6-6.3" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>

      {status === "loading" && (
        <div class="skeleton" aria-busy="true">
          <div class="skel-head">
            <div class="skel-avatar" />
            <div style="flex:1; display:grid; gap:8px;">
              <div class="skel-line" style="width:46%" />
              <div class="skel-line" style="width:32%" />
            </div>
          </div>
          <div class="skel-line skel-title" />
          <div class="skel-line skel-body" />
          <div class="skel-line skel-body short" />
        </div>
      )}

      {status === "error" && (
        <div class="error">
          <p>{error}</p>
          <button type="button" class="retry" onClick={() => void load()}>
            再試行
          </button>
        </div>
      )}

      {status === "ready" && post && user && (
        <>
          <header class="header">
            <img class="avatar" alt="" src={avatarUrl(user.id)} />
            <div class="meta">
              <div class="name">{user.name}</div>
              <div class="handle">
                @{user.username} · {user.company.name}
              </div>
            </div>
          </header>
          <h2 class="title">{post.title}</h2>
          <p class="body">{post.body}</p>
          <div class="reactions">
            {REACTION_DEFS.map((def) => {
              const value = reactions[def.id];
              return (
                <button
                  type="button"
                  class="reaction"
                  aria-pressed={value.active}
                  aria-label={def.label}
                  onClick={() => void react(def.id)}
                >
                  <span class="emoji" aria-hidden="true">
                    {def.emoji}
                  </span>
                  <span class="count">{value.count}</span>
                </button>
              );
            })}
          </div>
          {saveError ? <p class="save-error">{saveError}</p> : null}
        </>
      )}
    </div>
  );
}
