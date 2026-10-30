# ai-management

Boss points of jobs and gangs: members with a boss grade hire the closest player, change grades, fire, and deposit / withdraw cash on the group account, through ai-core's shared menu and input. Depends on ai-core (jobs, gangs, shared money).

## Decisions

- Online members only: ai-core changes memberships of loaded characters; offline members are not listed (a later ai-core API for offline memberships would add them).
- A boss manages grades up to their own and cannot act on someone above them or on themselves.
- The account is the group's `bank` shared account in ai-core (the same ai-banking shows to bosses).

## Contracts

- Callbacks: `resource/common/boss.ts`.

## Entry points

- Server and panel schema `resource/server/index.ts`; client menus and boss points (lib `Points`) `resource/client/index.ts`.
