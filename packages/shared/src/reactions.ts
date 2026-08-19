import type { ReactionId, ReactionMap } from "./types.ts";

export function createReactions(postId: number): ReactionMap {
  const seed = (n: number) => (postId * n) % 17;
  return {
    up: { count: seed(7) + 4, active: false },
    heart: { count: seed(11) + 2, active: false },
    laugh: { count: seed(3) + 1, active: false },
    party: { count: seed(5), active: false },
  };
}

export function toggleReaction(map: ReactionMap, id: ReactionId): ReactionMap {
  const current = map[id];
  const active = !current.active;
  return {
    ...map,
    [id]: {
      active,
      count: current.count + (active ? 1 : -1),
    },
  };
}

export function cloneReactions(map: ReactionMap): ReactionMap {
  return {
    up: { ...map.up },
    heart: { ...map.heart },
    laugh: { ...map.laugh },
    party: { ...map.party },
  };
}
