import { num, record, str } from "@aicore-fivem/lib/shared"

/** ai-management's contracts and panel content. No natives. */

export type GroupType = "job" | "gang"

export const EVENTS = {
  /** Callback: (pointId) -> BossView | { ok: false, error } what the boss menu shows. */
  view: "ai-management:view",
  /** Callback: (pointId, action, target serverId, grade?) -> { ok } hire, set grade or fire. */
  member: "ai-management:member",
  /** Callback: (pointId, kind: "deposit" | "withdraw", amount) -> { ok } the group account. */
  money: "ai-management:money",
} as const

export interface BossPoint {
  id: string
  label: string
  type: GroupType
  /** Job or gang name. */
  owner: string
  x: number
  y: number
  z: number
  radius: number
}

export interface BossView {
  ok: true
  label: string
  balance: number
  grades: string[]
  members: Array<{ id: number; name: string; grade: number }>
}

export function readPoints(raw: unknown): Map<string, BossPoint> {
  const out = new Map<string, BossPoint>()
  for (const [id, value] of Object.entries(record(raw))) {
    const v = record(value)
    const c = record(v.coords)
    const owner = str(v.owner, "", 32)
    if (!owner) continue
    out.set(id, {
      id,
      label: str(v.label, id, 48),
      type: v.type === "gang" ? "gang" : "job",
      owner,
      x: num(c.x, 0),
      y: num(c.y, 0),
      z: num(c.z, 0),
      radius: num(v.radius, 1.5, 0.5, 10),
    })
  }
  return out
}
