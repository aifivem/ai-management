# ai-management

Boss points of jobs and gangs: members with a boss grade hire the closest player, change grades, fire, and deposit / withdraw cash on the group account, through ai-core's shared menu and input. Depends on ai-core (jobs, gangs, shared money).

## Decisions

- Online members only: ai-core changes memberships of loaded characters; offline members are not listed (a later ai-core API for offline memberships would add them).
- A boss acts on members below their own grade and gives grades below it; only the highest grade also reaches its own grade (two bosses of one lower grade never fire or promote each other). Nobody acts on themselves. The closest player for a hire is lib `nearestPlayer(3)`; the server checks 5 m.
- Deposit and withdraw are one lib `money.transfer` between the boss's cash and the group account (one transaction, both ledger rows).
- Boss points show only to members of the point's job / gang (`canShow`: lib `allows` on the point's `access`, a rule of its one owner built in `readPoint`; refreshed on `onMembershipChange`); the boss grade is checked on the server. Points come from lib `RecordObjects` (an edited point rebuilds only itself).
- Grades and members come from lib `online` (`jobGrade` / `gangGrade`, `jobMembers` / `gangMembers`): no export per member. Job / gang grades come from lib `definitions`.
- The account is the group's `bank` shared account in ai-core (the same ai-banking shows to bosses).
- Other scripts open the menu without a point (owner decision: tablets and QB / ESX scripts reach it): the caller's own current job / active gang, or a group it holds by name (`ownTarget` ids `@job`, `@gang`, `@job:<name>`); no distance check, the server still requires a boss grade of that group. QB's `qb-bossmenu:client:OpenMenu` / `qb-gangmenu:client:OpenMenu` and ESX's `esx_society:openBossMenu` are answered as local events only while qb-management, qbx_management or esx_society do not run (server-sent ones are not).

## Contracts

- Callbacks: `resource/common/boss.ts`; panel schema `resource/server/schema.ts`.
- Client export `OpenBossMenu(type?: "job" | "gang", name?)` (`resource/client/remote.ts`): the boss menu of the player's own group.

## Entry points

- Server: boss check `resource/server/boss.ts`, callbacks `server/view.ts`, `server/members.ts`, `server/account.ts`; client menus `resource/client/menu.ts`, boss points (lib `Points`) `client/points.ts`.
