import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  notify,
  onClientCallback,
  online,
  resourceExport,
} from "@aicore-fivem/lib/server";
import type { PanelSchema } from "@aicore-fivem/shared";
import { Locale } from "common";
import { EVENTS, readPoints, type BossPoint, type BossView } from "common/boss";

const core = resourceExport("ai-core");

/** ai-management's panel: where each job's or gang's boss manages it. */
const schema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "briefcase",
  files: {
    points: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: {
        label: "",
        type: "job",
        owner: "",
        coords: { x: 0, y: 0, z: 0 },
        radius: 1.5,
      },
      sections: {
        label: { type: "text", min: 1, max: 48 },
        type: { type: "enum", values: ["job", "gang"] },
        owner: { type: "text", min: 2, max: 32, pattern: "^[a-z0-9_]{2,32}$" },
        coords: { type: "vec3" },
        radius: { type: "number", min: 0.5, max: 10 },
      },
    },
  },
  tabs: [
    {
      id: "points",
      file: "points",
      icon: "briefcase",
      label: "ADMIN_TAB_POINTS",
      desc: "ADMIN_TAB_POINTS_DESC",
      listSub: "owner",
      createLabel: "ADMIN_NEW_POINT",
      deleteLabel: "ADMIN_DELETE_POINT",
      cards: [
        {
          icon: "briefcase",
          title: "ADMIN_C_POINT",
          desc: "ADMIN_C_POINT_DESC",
          fields: [
            {
              widget: "text",
              path: "label",
              label: "ADMIN_F_LABEL",
              placeholder: "ADMIN_P_LABEL",
            },
            {
              widget: "select",
              path: "type",
              label: "ADMIN_F_TYPE",
              options: [
                { value: "job", label: "ADMIN_O_JOB" },
                { value: "gang", label: "ADMIN_O_GANG" },
              ],
            },
            {
              widget: "text",
              path: "owner",
              label: "ADMIN_F_OWNER",
              hint: "ADMIN_H_OWNER",
              placeholder: "ADMIN_P_OWNER",
            },
            {
              widget: "point",
              path: "coords",
              label: "ADMIN_F_COORDS",
              hint: "ADMIN_H_COORDS",
              ground: true,
            },
            {
              widget: "number",
              path: "radius",
              label: "ADMIN_F_RADIUS",
              min: 0.5,
              max: 10,
              step: 0.5,
              unit: "m",
            },
          ],
        },
      ],
    },
  ],
};

const panel = new AdminPanel(schema);
/** Boss points, parsed again after every change. */
const content = { points: readPoints(panel.get("points")) };
panel.onChange(
  "points",
  () => (content.points = readPoints(panel.get("points"))),
);
aiLogChannels({ management: {} });

const fail = (error: string) => ({ ok: false as const, error });
const gradeOf = (source: number, point: BossPoint): number | null =>
  point.type === "job"
    ? ((core.GetJobs(source) ?? []).find((m) => m.job === point.owner)?.grade ??
      null)
    : ((core.GetGangs(source) ?? []).find((m) => m.gang === point.owner)
        ?.grade ?? null);
const gradesOf = (point: BossPoint) =>
  (point.type === "job"
    ? core.GetJobDefinitions()[point.owner]?.grades
    : core.GetGangDefinitions()[point.owner]?.grades) ?? [];

/** The player is at the point and holds a boss grade of its job / gang. */
function bossAt(source: number, id: string): BossPoint | null {
  const point = content.points.get(id);
  if (!point) return null;
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  if (Math.hypot(x - point.x, y - point.y, z - point.z) > point.radius + 2)
    return null;
  const grade = gradeOf(source, point);
  return grade !== null && gradesOf(point)[grade]?.boss === true ? point : null;
}

onClientCallback(
  EVENTS.view,
  { args: ([id]) => (typeof id === "string" ? [id] : null) },
  (source, id): BossView | ReturnType<typeof fail> => {
    const point = bossAt(source, id);
    if (!point) return fail("BOSS_ERR_DENIED");
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
      grades: gradesOf(point).map((g) => g.label),
      members,
    };
  },
);

onClientCallback(
  EVENTS.member,
  {
    args: ([id, action, target, grade]) =>
      typeof id === "string" &&
      (action === "hire" || action === "grade" || action === "fire") &&
      typeof target === "number"
        ? [id, action, target, typeof grade === "number" ? grade : 0]
        : null,
    lock: true,
  },
  (source, id, action, target, grade) => {
    const point = bossAt(source, id);
    if (!point) return fail("BOSS_ERR_DENIED");
    if (target === source) return fail("BOSS_ERR_SELF");
    if (!core.GetCharacter(target)) return fail("BOSS_ERR_TARGET");
    const grades = gradesOf(point);
    const own = gradeOf(source, point) ?? 0;
    // A boss manages the grades up to their own.
    if (
      action !== "fire" &&
      (grade < 0 || grade >= grades.length || grade > own)
    )
      return fail("BOSS_ERR_GRADE");
    if (action === "fire" || action === "grade") {
      const current = gradeOf(target, point);
      if (current === null) return fail("BOSS_ERR_TARGET");
      if (current > own) return fail("BOSS_ERR_GRADE");
    }
    if (action === "hire") {
      const [x = 0, y = 0, z = 0] = GetEntityCoords(
        GetPlayerPed(String(source)),
      );
      const [tx = 0, ty = 0, tz = 0] = GetEntityCoords(
        GetPlayerPed(String(target)),
      );
      if (Math.hypot(x - tx, y - ty, z - tz) > 5)
        return fail("BOSS_ERR_TARGET");
    }
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
    args: ([id, kind, amount]) =>
      typeof id === "string" &&
      (kind === "deposit" || kind === "withdraw") &&
      typeof amount === "number" &&
      Number.isInteger(amount) &&
      amount > 0
        ? [id, kind, amount]
        : null,
    lock: true,
  },
  (source, id, kind, amount) => {
    const point = bossAt(source, id);
    if (!point) return fail("BOSS_ERR_DENIED");
    if (kind === "deposit") {
      if (!core.RemoveMoney(source, "cash", amount, `society:${point.owner}`))
        return fail("BOSS_ERR_MONEY");
      core.AddSharedMoney(
        point.type,
        point.owner,
        "bank",
        amount,
        `deposit by ${source}`,
      );
    } else {
      if (
        !core.RemoveSharedMoney(
          point.type,
          point.owner,
          "bank",
          amount,
          `withdraw by ${source}`,
        )
      )
        return fail("BOSS_ERR_MONEY");
      core.AddMoney(source, "cash", amount, `society:${point.owner}`);
    }
    aiLog("management", `${kind} $${amount} on ${point.type}:${point.owner}`, {
      source,
      metadata: { amount },
    });
    return { ok: true };
  },
);
