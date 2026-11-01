import { aiLog, money, onClientCallback } from "@aicore-fivem/lib/server";
import { fail, readInt } from "@aicore-fivem/lib/shared";
import type { MoneyRef } from "@aicore-fivem/shared";
import { EVENTS } from "common/boss";
import { bossAt, pointArg } from "./boss";

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
