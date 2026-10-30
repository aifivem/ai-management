import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  coordsOf,
  isNear,
  money,
  notify,
  onClientCallback,
  online,
  resourceExport,
} from "@aicore-fivem/lib/server";
import {
  fail,
  oneArg,
  readId,
  readInt,
  readText,
} from "@aicore-fivem/lib/shared";
import type { MoneyRef } from "@aicore-fivem/shared";
import { Locale } from "common";
import { EVENTS, readPoint, type BossPoint, type BossView } from "common/boss";
import { schema } from "./schema";

const core = resourceExport("ai-core");
const panel = new AdminPanel(schema);
const content = { points: panel.records("points", readPoint) };
aiLogChannels({ management: {} });

const gradeOf = (source: number, point: BossPoint): number | null =>
  point.type === "job"
    ? ((core.GetJobs(source) ?? []).find((m) => m.job === point.owner)?.grade ??
      null)
    : ((core.GetGangs(source) ?? []).find((m) => m.gang === point.owner)
        ?.grade ?? null);
/** The grades of a point's job / gang (one definitions copy from ai-core per call: ask once per action). */
const gradesOf = (point: BossPoint) =>
  (point.type === "job"
    ? core.GetJobDefinitions()[point.owner]?.grades
    : core.GetGangDefinitions()[point.owner]?.grades) ?? [];

interface Boss {
  point: BossPoint;
  grades: ReturnType<typeof gradesOf>;
  /** The boss's own grade. */
  own: number;
}

/** The player is at the point and holds a boss grade of its job / gang. */
function bossAt(source: number, id: string): Boss | null {
  const point = content.points.get(id);
  if (!point || !isNear(source, point, point.radius + 2)) return null;
  const own = gradeOf(source, point);
  if (own === null) return null;
  const grades = gradesOf(point);
  return grades[own]?.boss === true ? { point, grades, own } : null;
}

/**
 * A boss acts on members below their own grade and gives grades below it; only the highest grade also reaches its
 * own grade (two bosses of one lower grade never fire or promote each other).
 */
const reaches = (boss: Boss, grade: number) =>
  grade < boss.own || boss.own === boss.grades.length - 1;

const pointArg = (v: unknown) => readText(v, 64);

onClientCallback(
  EVENTS.view,
  { args: oneArg(pointArg) },
  (source, id): BossView | ReturnType<typeof fail> => {
    const boss = bossAt(source, id);
    if (!boss) return fail("BOSS_ERR_DENIED");
    const { point } = boss;
    // Members come from the local mirror; only they cost an ai-core call (their grade).
    const isMember = (s: number) =>
      (point.type === "job" ? online.jobs(s) : online.gangs(s)).includes(
        point.owner,
      );
    const members = [...online.sources()].filter(isMember).flatMap((s) => {
      const grade = gradeOf(s, point);
      const c = online.character(s);
      return grade !== null && c
        ? [{ id: s, name: `${c.firstname} ${c.lastname}`, grade }]
        : [];
    });
    return {
      ok: true,
      label: point.label,
      balance: core.GetSharedMoney(point.type, point.owner, "bank") ?? 0,
      grades: boss.grades.map((g) => g.label),
      members,
    };
  },
);

onClientCallback(
  EVENTS.member,
  {
    args: ([id, action, target, grade]):
      [string, "hire" | "grade" | "fire", number, number] | null => {
      const point = pointArg(id);
      const who = readId(target);
      const to = grade == null ? 0 : readInt(grade, 0, 100);
      return point !== null &&
        (action === "hire" || action === "grade" || action === "fire") &&
        who !== null &&
        to !== null
        ? [point, action, who, to]
        : null;
    },
    lock: true,
  },
  (source, id, action, target, grade) => {
    const boss = bossAt(source, id);
    if (!boss) return fail("BOSS_ERR_DENIED");
    const { point, grades } = boss;
    if (target === source) return fail("BOSS_ERR_SELF");
    if (!online.character(target)) return fail("BOSS_ERR_TARGET");
    if (action !== "fire" && (grade >= grades.length || !reaches(boss, grade)))
      return fail("BOSS_ERR_GRADE");
    if (action === "fire" || action === "grade") {
      const current = gradeOf(target, point);
      if (current === null) return fail("BOSS_ERR_TARGET");
      if (!reaches(boss, current)) return fail("BOSS_ERR_GRADE");
    }
    if (action === "hire" && !isNear(source, coordsOf(target), 5))
      return fail("BOSS_ERR_TARGET");
    const ok =
      action === "fire"
        ? point.type === "job"
          ? core.RemoveJob(target, point.owner)
          : core.RemoveGang(target, point.owner)
        : point.type === "job"
          ? core.SetJob(target, point.owner, grade)
          : core.SetGang(target, point.owner, grade);
    if (!ok) return fail("BOSS_ERR_TARGET");
    notify(
      target,
      Locale(
        action === "fire"
          ? "BOSS_FIRED"
          : action === "hire"
            ? "BOSS_HIRED"
            : "BOSS_GRADED",
        point.label,
        grades[grade]?.label ?? "",
      ),
      "info",
      8000,
    );
    aiLog("management", `${action} ${point.type}:${point.owner}`, {
      source,
      target,
      metadata: { grade },
    });
    return { ok: true };
  },
);

onClientCallback(
  EVENTS.money,
  {
    args: ([id, kind, amount]):
      [string, "deposit" | "withdraw", number] | null => {
      const point = pointArg(id);
      const value = readInt(amount, 1, 1_000_000_000);
      return point !== null &&
        (kind === "deposit" || kind === "withdraw") &&
        value !== null
        ? [point, kind, value]
        : null;
    },
    lock: true,
  },
  (source, id, kind, amount) => {
    const boss = bossAt(source, id);
    if (!boss) return fail("BOSS_ERR_DENIED");
    const { point } = boss;
    const cash: MoneyRef = { source, account: "cash" };
    const group: MoneyRef = {
      owner: point.type,
      id: point.owner,
      account: "bank",
    };
    // One transaction with both ledger rows (lib `money.transfer`).
    const done =
      kind === "deposit"
        ? money.transfer(cash, group, amount, `society:${point.owner}:deposit`)
        : money.transfer(
            group,
            cash,
            amount,
            `society:${point.owner}:withdraw`,
          );
    if (!done) return fail("BOSS_ERR_MONEY");
    aiLog("management", `${kind} $${amount} on ${point.type}:${point.owner}`, {
      source,
      metadata: { amount },
    });
    return { ok: true };
  },
);
