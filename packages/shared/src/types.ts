export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  company: {
    name: string;
  };
}

export const REACTION_DEFS = [
  { id: "up", emoji: "👍", label: "高評価" },
  { id: "heart", emoji: "❤️", label: "好き" },
  { id: "laugh", emoji: "😂", label: "おもしろい" },
  { id: "party", emoji: "🎉", label: "お祝い" },
] as const;

export type ReactionId = (typeof REACTION_DEFS)[number]["id"];

export interface ReactionValue {
  count: number;
  active: boolean;
}

export type ReactionMap = Record<ReactionId, ReactionValue>;

export type FeedStatus = "loading" | "ready" | "error";

export interface ReactionChangeDetail {
  id: ReactionId;
  emoji: string;
  count: number;
  active: boolean;
}

export const REACTION_CHANGE_EVENT = "reaction-change";
