import {
  AdminWorld,
  allows,
  onMembershipChange,
  Points,
} from "@aicore-fivem/lib/client";
import { RecordObjects } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { readPoint } from "common/boss";
import { openBoss } from "./menu";

const world = new AdminWorld(["points"]);

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
