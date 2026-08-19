import type { Post, User } from "./types.ts";

const API = "https://jsonplaceholder.typicode.com";

export function parsePostId(
  value: string | number | null | undefined,
  fallback = 1,
): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function avatarUrl(seed: string | number): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(String(seed))}`;
}

export async function loadFeed(
  postId: number,
  signal?: AbortSignal,
): Promise<{ post: Post; user: User }> {
  const postRes = await fetch(`${API}/posts/${postId}`, { signal });
  if (!postRes.ok) {
    throw new Error(`投稿の取得に失敗しました (${postRes.status})`);
  }
  const post = (await postRes.json()) as Post;

  const userRes = await fetch(`${API}/users/${post.userId}`, { signal });
  if (!userRes.ok) {
    throw new Error(`ユーザーの取得に失敗しました (${userRes.status})`);
  }
  const user = (await userRes.json()) as User;

  return { post, user };
}

export async function persistReactions(
  postId: number,
  reactions: Record<string, { count: number; active: boolean }>,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API}/posts/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ reactions }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`リアクションの保存に失敗しました (${res.status})`);
  }
}
