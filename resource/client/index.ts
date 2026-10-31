import {
  AdminWorld,
  allows,
  callAction,
  input,
  menu,
  nearestPlayer,
  notify,
  onMembershipChange,
  Points,
} from "@aicore-fivem/lib/client";
import { record, RecordObjects } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, readPoint } from "common/boss";

const world = new AdminWorld(["points"]);
const FALLBACK = { fallback: "BOSS_ERR_DENIED" };
/** Runs a boss action; the server's refusal shows by itself, a success says so. */
const act = async (name: string, args: unknown[]) => {
  if (await callAction(name, args, FALLBACK))
    notify(Locale("BOSS_DONE"), "success");
};

async function pickGrade(grades: string[]): Promise<number | null> {
  const picked = await menu({
    title: Locale("BOSS_PICK_GRADE"),
    items: grades.map((g, i) => ({
      id: String(i),
      label: g,
      icon: "ranking-star",
    })),
  });
  return picked === null ? null : Number(picked);
}

/** The boss menu (ai-core's shared menu and input): online members, hiring the closest player, the group account. */
async function openBoss(id: string): Promise<void> {
  const view = await callAction(EVENTS.view, [id], FALLBACK);
  if (!view) return;
  const grades = Array.isArray(view.grades) ? view.grades.map(String) : [];
  const members = Array.isArray(view.members)
    ? view.members.map(record).filter((m) => typeof m.id === "number")
    : [];
  const picked = await menu({
    title: String(view.label ?? ""),
    items: [
      {
        id: "money",
        label: Locale(
          "BOSS_BALANCE",
          Number(view.balance ?? 0).toLocaleString("en-US"),
        ),
        icon: "wallet",
      },
      { id: "hire", label: Locale("BOSS_HIRE"), icon: "user" },
      ...members.map((m) => ({
        id: `m:${Number(m.id)}`,
        label: String(m.name),
        description: grades[Number(m.grade)] ?? "",
        icon: "users",
      })),
    ],
  });
  if (!picked) return;
  if (picked === "money") {
    const kind = await menu({
      title: Locale("BOSS_MONEY"),
      items: [
        {
          id: "deposit",
          label: Locale("BOSS_DEPOSIT"),
          icon: "money-bill-wave",
        },
        { id: "withdraw", label: Locale("BOSS_WITHDRAW"), icon: "wallet" },
      ],
    });
    if (!kind) return;
    const values = await input({
      title: Locale("BOSS_MONEY"),
      confirm: Locale("BOSS_CONFIRM"),
      fields: [
        {
          name: "amount",
          label: Locale("BOSS_AMOUNT"),
          type: "number",
          min: 1,
        },
      ],
    });
    if (!values) return;
    await act(EVENTS.money, [id, kind, Math.floor(Number(values.amount))]);
  } else if (picked === "hire") {
    const target = nearestPlayer(3);
    if (target === null) return notify(Locale("BOSS_ERR_TARGET"), "error");
    const grade = await pickGrade(grades);
    if (grade === null) return;
    await act(EVENTS.member, [id, "hire", target, grade]);
  } else {
    const target = Number(picked.slice(2));
    const action = await menu({
      title: Locale("BOSS_MEMBER"),
      items: [
        { id: "grade", label: Locale("BOSS_SET_GRADE"), icon: "ranking-star" },
        { id: "fire", label: Locale("BOSS_FIRE"), icon: "user" },
      ],
    });
    if (action === "fire") await act(EVENTS.member, [id, "fire", target]);
    else if (action === "grade") {
      const grade = await pickGrade(grades);
      if (grade !== null)
        await act(EVENTS.member, [id, "grade", target, grade]);
    }
  }
}

/** Boss points show to members of their job / gang only (the server checks the boss grade). */
const points = new Points();
new RecordObjects(world, "points", readPoint, (id, point) => {
  points.add(`boss:${id}`, {
    coords: { x: point.x, y: point.y, z: point.z },
    label: Locale("BOSS_PROMPT", point.label),
    icon: "briefcase",
    radius: point.radius,
    canShow: () => allows(point.access),
    onPressed: () => openBoss(id),
  });
  return () => points.remove(`boss:${id}`);
});
onMembershipChange(() => points.refresh());
