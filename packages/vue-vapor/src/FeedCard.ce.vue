<script setup vapor lang="ts">
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
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  postId: { type: Number, default: 1 },
});

const emit = defineEmits<{
  "reaction-change": [init: CustomEventInit<ReactionChangeDetail>];
}>();

const status = ref<FeedStatus>("loading");
const post = ref<Post | null>(null);
const user = ref<User | null>(null);
const reactions = ref<ReactionMap>(createReactions(1));
const error = ref("");
const saveError = ref("");

let loadController: AbortController | null = null;
let saveController: AbortController | null = null;

const id = computed(() => parsePostId(props.postId));

async function load() {
  const postId = id.value;
  loadController?.abort();
  saveController?.abort();
  loadController = new AbortController();
  status.value = "loading";
  error.value = "";
  saveError.value = "";

  try {
    const data = await loadFeed(postId, loadController.signal);
    post.value = data.post;
    user.value = data.user;
    reactions.value = createReactions(postId);
    status.value = "ready";
  } catch (err) {
    if (isAbortError(err)) return;
    status.value = "error";
    error.value = err instanceof Error ? err.message : "読み込みに失敗しました";
  }
}

function emitReaction(reactionId: ReactionId, next: ReactionMap) {
  const def = REACTION_DEFS.find((item) => item.id === reactionId);
  if (!def) return;
  emit(REACTION_CHANGE_EVENT, {
    detail: {
      id: reactionId,
      emoji: def.emoji,
      count: next[reactionId].count,
      active: next[reactionId].active,
    },
    bubbles: true,
    composed: true,
  });
}

async function react(reactionId: ReactionId) {
  if (status.value !== "ready") return;
  const previous = cloneReactions(reactions.value);
  const next = toggleReaction(reactions.value, reactionId);
  reactions.value = next;
  saveError.value = "";
  emitReaction(reactionId, next);

  saveController?.abort();
  saveController = new AbortController();
  try {
    await persistReactions(id.value, next, saveController.signal);
  } catch (err) {
    if (isAbortError(err)) return;
    reactions.value = previous;
    saveError.value = "保存に失敗しました";
  }
}

watch(id, load, { immediate: true });
onBeforeUnmount(() => {
  loadController?.abort();
  saveController?.abort();
});
</script>

<template>
  <div class="card" :data-status="status">
    <div class="toolbar">
      <span class="kicker">POST {{ id }}</span>
      <button
        type="button"
        class="icon-btn"
        aria-label="再読み込み"
        :disabled="status === 'loading'"
        @click="load"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-2.6-6.3" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
    </div>

    <div v-if="status === 'loading'" class="skeleton" aria-busy="true">
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

    <div v-else-if="status === 'error'" class="error">
      <p>{{ error }}</p>
      <button type="button" class="retry" @click="load">再試行</button>
    </div>

    <template v-else-if="status === 'ready' && post && user">
      <header class="header">
        <img class="avatar" alt="" :src="avatarUrl(user.id)" />
        <div class="meta">
          <div class="name">{{ user.name }}</div>
          <div class="handle">@{{ user.username }} · {{ user.company.name }}</div>
        </div>
      </header>
      <h2 class="title">{{ post.title }}</h2>
      <p class="body">{{ post.body }}</p>
      <div class="reactions">
        <button
          v-for="def in REACTION_DEFS"
          :key="def.id"
          type="button"
          class="reaction"
          :aria-pressed="reactions[def.id].active"
          :aria-label="def.label"
          @click="react(def.id)"
        >
          <span class="emoji" aria-hidden="true">{{ def.emoji }}</span>
          <span class="count">{{ reactions[def.id].count }}</span>
        </button>
      </div>
      <p v-if="saveError" class="save-error">{{ saveError }}</p>
    </template>
  </div>
</template>

<style>
:host {
  all: initial;
  display: block;
  width: 100%;
  max-width: 420px;
  box-sizing: border-box;
  color: #1c1917;
  font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  letter-spacing: 0;
  -webkit-font-smoothing: antialiased;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

button {
  appearance: none;
  font: inherit;
  color: inherit;
  letter-spacing: inherit;
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
}

.card {
  position: relative;
  overflow: hidden;
  background: #faf6ee;
  border: 1px solid #e4dcc8;
  border-radius: 16px;
  padding: 18px 18px 16px;
  box-shadow:
    0 1px 2px rgb(28 25 23 / 4%),
    0 10px 28px rgb(28 25 23 / 7%);
}

.card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, #c2410c 0%, #ea580c 55%, #f59e0b 100%);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.kicker {
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.08em;
  color: #c2410c;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  color: #57534e;
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  background: #f0e9da;
  color: #1c1917;
}

.icon-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.icon-btn svg {
  display: block;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e7e0d4;
  object-fit: cover;
  flex: none;
}

.meta {
  min-width: 0;
}

.name {
  font-weight: 650;
  font-size: 15px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.handle {
  color: #78716c;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title {
  margin: 14px 0 8px;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.35;
  text-transform: none;
}

.body {
  margin: 0;
  color: #44403c;
  font-size: 14.5px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #e4dcc8;
}

.reaction {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e4dcc8;
  background: #fffdf8;
  cursor: pointer;
  transition:
    background 120ms ease,
    border-color 120ms ease,
    transform 120ms ease;
}

.reaction:hover {
  border-color: #d6cbb3;
  background: #fff7ea;
}

.reaction:active {
  transform: scale(0.96);
}

.reaction[aria-pressed="true"] {
  background: #fff1e6;
  border-color: #f0b48a;
  color: #c2410c;
}

.emoji {
  font-size: 15px;
  line-height: 1;
}

.count {
  font-size: 13px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.save-error {
  margin: 10px 0 0;
  color: #b91c1c;
  font-size: 12px;
}

.error {
  padding: 18px 4px 8px;
}

.error p {
  margin: 0 0 12px;
  color: #44403c;
}

.retry {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: #1c1917;
  color: #faf6ee;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.retry:hover {
  background: #44403c;
}

.skeleton {
  display: grid;
  gap: 12px;
  padding-top: 2px;
}

.skel-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skel-line,
.skel-avatar {
  background: linear-gradient(90deg, #ebe4d4 25%, #f5efe3 50%, #ebe4d4 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

.skel-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex: none;
}

.skel-line {
  height: 12px;
  border-radius: 999px;
}

.skel-title {
  width: 78%;
  height: 18px;
  margin-top: 6px;
}

.skel-body {
  width: 100%;
}

.skel-body.short {
  width: 62%;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
