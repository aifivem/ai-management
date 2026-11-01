import {
  aiLog,
  coordsOf,
  isNear,
  notify,
  onClientCallback,
  online,
} from "@aicore-fivem/lib/server";
import { fail, readId, readInt } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/boss";
import { bossAt, core, gradeOf, pointArg, reaches } from "./boss";

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
