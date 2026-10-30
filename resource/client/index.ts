import { AdminWorld, cache, input, loadLocaleTexts, menu, notify, Points, triggerServerCallback } from "@aicore-fivem/lib/client";
import { record } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, readPoints } from "common/boss";

const world = new AdminWorld(["points"]);
const texts = loadLocaleTexts();
const errorText = (v: unknown, fallback: string): string => {
  const key = typeof record(v).error === "string" ? String(record(v).error) : fallback;
  return texts[key] ?? key;
};
const report = (r: unknown, done: string) => (record(r).ok === true ? notify(done, "success") : notify(errorText(r, "BOSS_ERR_DENIED"), "error"));

/** The closest other player within 3 m (server id). */
function closestPlayer(): number | null {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  let best: number | null = null;
  let bestDistance = 3;
  for (const player of GetActivePlayers() as number[]) {
    if (player === cache.playerId) continue;
    const [px = 0, py = 0, pz = 0] = GetEntityCoords(GetPlayerPed(player), false);
    const d = Math.hypot(px - x, py - y, pz - z);
    if (d < bestDistance) [best, bestDistance] = [GetPlayerServerId(player), d];
  }
  return best;
}

async function pickGrade(grades: string[]): Promise<number | null> {
  const picked = await menu({ title: Locale("BOSS_PICK_GRADE"), items: grades.map((g, i) => ({ id: String(i), label: g, icon: "ranking-star" })) });
  return picked === null ? null : Number(picked);
}

/** The boss menu (ai-core's shared menu and input): online members, hiring the closest player, the group account. */
async function openBoss(id: string): Promise<void> {
  const view = record(await triggerServerCallback(EVENTS.view, [id]).catch(() => null));
  if (view.ok !== true) return notify(errorText(view, "BOSS_ERR_DENIED"), "error");
  const grades = Array.isArray(view.grades) ? view.grades.map(String) : [];
  const members = Array.isArray(view.members) ? view.members.map(record).filter((m) => typeof m.id === "number") : [];
  const picked = await menu({
    title: String(view.label ?? ""),
    items: [
      { id: "money", label: Locale("BOSS_BALANCE", Number(view.balance ?? 0).toLocaleString("en-US")), icon: "wallet" },
      { id: "hire", label: Locale("BOSS_HIRE"), icon: "user" },
      ...members.map((m) => ({ id: `m:${Number(m.id)}`, label: String(m.name), description: grades[Number(m.grade)] ?? "", icon: "users" })),
    ],
  });
  if (!picked) return;
  if (picked === "money") {
    const kind = await menu({ title: Locale("BOSS_MONEY"), items: [{ id: "deposit", label: Locale("BOSS_DEPOSIT"), icon: "money-bill-wave" }, { id: "withdraw", label: Locale("BOSS_WITHDRAW"), icon: "wallet" }] });
    if (!kind) return;
    const values = await input({ title: Locale("BOSS_MONEY"), confirm: Locale("BOSS_CONFIRM"), fields: [{ name: "amount", label: Locale("BOSS_AMOUNT"), type: "number", min: 1 }] });
    if (!values) return;
    report(await triggerServerCallback(EVENTS.money, [id, kind, Math.floor(Number(values.amount))]).catch(() => null), Locale("BOSS_DONE"));
  } else if (picked === "hire") {
    const target = closestPlayer();
    if (target === null) return notify(Locale("BOSS_ERR_TARGET"), "error");
    const grade = await pickGrade(grades);
    if (grade === null) return;
    report(await triggerServerCallback(EVENTS.member, [id, "hire", target, grade]).catch(() => null), Locale("BOSS_DONE"));
  } else {
    const target = Number(picked.slice(2));
    const action = await menu({ title: Locale("BOSS_MEMBER"), items: [{ id: "grade", label: Locale("BOSS_SET_GRADE"), icon: "ranking-star" }, { id: "fire", label: Locale("BOSS_FIRE"), icon: "user" }] });
    if (action === "fire") report(await triggerServerCallback(EVENTS.member, [id, "fire", target]).catch(() => null), Locale("BOSS_DONE"));
    else if (action === "grade") {
      const grade = await pickGrade(grades);
      if (grade !== null) report(await triggerServerCallback(EVENTS.member, [id, "grade", target, grade]).catch(() => null), Locale("BOSS_DONE"));
    }
  }
}

const points = new Points();
function rebuild(): void {
  points.clear();
  for (const point of readPoints(world.get("points")).values())
    points.add(`boss:${point.id}`, { coords: { x: point.x, y: point.y, z: point.z }, label: Locale("BOSS_PROMPT", point.label), icon: "briefcase", radius: point.radius, onPressed: () => openBoss(point.id) });
}
rebuild();
world.onChange("points", rebuild);
