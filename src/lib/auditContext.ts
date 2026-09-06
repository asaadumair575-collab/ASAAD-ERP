import { AsyncLocalStorage } from "node:async_hooks";

// Carries "who is making this request" through the async call chain of a
// single request so the Prisma query extension (lib/prisma.ts) can attach
// it to every write without every action having to pass it explicitly.
// getSessionUser() (lib/auth.ts) populates this as soon as it resolves the
// logged-in user, which happens near the top of virtually every page and
// server action before any database write occurs.
export type Actor = {
  userId: number | null;
  userName: string | null;
  ip: string | null;
};

const EMPTY_ACTOR: Actor = { userId: null, userName: null, ip: null };

const storage = new AsyncLocalStorage<Actor>();

export function setCurrentActor(actor: Actor) {
  storage.enterWith(actor);
}

export function getCurrentActor(): Actor {
  return storage.getStore() ?? EMPTY_ACTOR;
}
