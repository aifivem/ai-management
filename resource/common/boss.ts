import {
  num,
  readAccess,
  record,
  str,
  type AccessRule,
} from "@aicore-fivem/lib/shared";

/** ai-management's contracts and panel content. No natives. */

export type GroupType = "job" | "gang";

export const EVENTS = {
  /** Callback: (pointId) -> BossView | { ok: false, error } what the boss menu shows. */
  view: "ai-management:view",
  /** Callback: (pointId, action, target serverId, grade?) -> { ok } hire, set grade or fire. */
  member: "ai-management:member",
  /** Callback: (pointId, kind: "deposit" | "withdraw", amount) -> { ok } the group account. */
  money: "ai-management:money",
} as const;

export interface BossPoint {
  id: string;
  label: string;
  type: GroupType;
  /** Job or gang name. */
  owner: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Who sees the point: members of `owner` (the boss grade is checked on the server). */
  access: AccessRule;
}

export interface BossView {
  ok: true;
  label: string;
  balance: number;
  grades: string[];
  members: Array<{ id: number; name: string; grade: number }>;
}

/** One boss point record (`panel.records` / `world.records`); null without an owner. */
export function readPoint(
  id: string,
  v: Record<string, unknown>,
): BossPoint | null {
  const c = record(v.coords);
  const owner = str(v.owner, "", 32);
  if (!owner) return null;
  const type: GroupType = v.type === "gang" ? "gang" : "job";
  return {
    id,
    label: str(v.label, id, 48),
    type,
    owner,
    x: num(c.x, 0),
    y: num(c.y, 0),
    z: num(c.z, 0),
    radius: num(v.radius, 1.5, 0.5, 10),
    access: readAccess(type === "gang" ? { gangs: [owner] } : { jobs: [owner] }),
  };
}
