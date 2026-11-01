import {
  AdminPanel,
  definitions,
  isNear,
  online,
  resourceExport,
} from "@aicore-fivem/lib/server";
import { readText } from "@aicore-fivem/lib/shared";
import { readPoint, type BossPoint } from "common/boss";
import { schema } from "./schema";

export const core = resourceExport("ai-core");
const panel = new AdminPanel(schema);
const content = { points: panel.records("points", readPoint) };

export const gradeOf = (source: number, point: BossPoint): number | null =>
  point.type === "job"
    ? online.jobGrade(source, point.owner)
    : online.gangGrade(source, point.owner);
/** The grades of a point's job / gang. */
const gradesOf = (point: BossPoint) =>
  (point.type === "job"
    ? definitions.job(point.owner)?.grades
    : definitions.gang(point.owner)?.grades) ?? [];

interface Boss {
  point: BossPoint;
  grades: ReturnType<typeof gradesOf>;
  /** The boss's own grade. */
  own: number;
}

/** The player is at the point and holds a boss grade of its job / gang. */
export function bossAt(source: number, id: string): Boss | null {
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
export const reaches = (boss: Boss, grade: number) =>
  grade < boss.own || boss.own === boss.grades.length - 1;

export const pointArg = (v: unknown) => readText(v, 64);
