import { registerExport } from "@aicore-fivem/lib/client";
import { ownTarget, type GroupType } from "common/boss";
import { openBoss } from "./menu";

/** The boss menu of the player's own job / gang, opened by another script; the server checks the boss grade. */
const open = (type: GroupType, name?: string) =>
  void openBoss(ownTarget(type, name));

/** Name of a job / gang from another script; anything else means the current one. */
const groupName = (v: unknown): string | undefined =>
  typeof v === "string" && /^[a-z0-9_]{2,32}$/.test(v) ? v : undefined;

registerExport("OpenBossMenu", (type: unknown, name: unknown) =>
  open(type === "gang" ? "gang" : "job", groupName(name)),
);

// QB / ESX scripts open their framework's boss menu with these local events; the real menu answers them while it runs.
const answered = (...resources: string[]) =>
  resources.some((r) => GetResourceState(r) === "started");
on("qb-bossmenu:client:OpenMenu", () => {
  if (!answered("qb-management", "qbx_management")) open("job");
});
on("qb-gangmenu:client:OpenMenu", () => {
  if (!answered("qb-management", "qbx_management")) open("gang");
});
on("esx_society:openBossMenu", (society: unknown) => {
  if (!answered("esx_society"))
    open(
      "job",
      groupName(
        typeof society === "string"
          ? society.replace(/^society_/, "")
          : society,
      ),
    );
});
