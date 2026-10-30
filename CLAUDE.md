# ai-management

Boss points of jobs and gangs: members with a boss grade hire the closest player, change grades, fire, and deposit / withdraw cash on the group account, through ai-core's shared menu and input. Depends on ai-core (jobs, gangs, shared money).

## Decisions

- Online members only: ai-core changes memberships of loaded characters; offline members are not listed (a later ai-core API for offline memberships would add them).
- A boss acts on members below their own grade and gives grades below it; only the highest grade also reaches its own grade (two bosses of one lower grade never fire or promote each other). Nobody acts on themselves. The closest player for a hire is lib `nearestPlayer(3)`; the server checks 5 m.
- Deposit and withdraw are one lib `money.transfer` between the boss's cash and the group account (one transaction, both ledger rows).
- Boss points show only to members of the point's job / gang (`canShow` on the player data `jobs` / `gangs`); the boss grade is checked on the server.
- Grades and members come from lib `online` (`jobGrade` / `gangGrade`, `jobMembers` / `gangMembers`): no export per member. Known cost: the definitions come through `GetJobDefinitions` / `GetGangDefinitions` (a copy of every job) once per action; acceptable per menu open, a mirror of definitions would make it free.
- The account is the group's `bank` shared account in ai-core (the same ai-banking shows to bosses).

## Contracts

- Callbacks: `resource/common/boss.ts`; panel schema `resource/server/schema.ts`.

## Entry points

- Server `resource/server/index.ts`; client menus and boss points (lib `Points`) `resource/client/index.ts`.
