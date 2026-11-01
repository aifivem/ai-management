import { onClientCallback, online } from "@aicore-fivem/lib/server";
import { fail, oneArg } from "@aicore-fivem/lib/shared";
import { EVENTS, type BossView } from "common/boss";
import { bossAt, core, gradeOf, pointArg } from "./boss";

onClientCallback(
  EVENTS.view,
  { args: oneArg(pointArg) },
  (source, id): BossView | ReturnType<typeof fail> => {
    const boss = bossAt(source, id);
    if (!boss) return fail("BOSS_ERR_DENIED");
    const { point } = boss;
    // Members and their grades come from lib `online`'s member set of the job / gang: no export per member.
    const memberSet =
      point.type === "job"
        ? online.jobMembers(point.owner)
        : online.gangMembers(point.owner);
    const members = [...memberSet].flatMap((s) => {
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
