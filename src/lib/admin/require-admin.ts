import "server-only";

import { cookies } from "next/headers";

import { ADMIN_COOKIE_NAME, sessionTokenMatches } from "./session";

/** For Route Handlers: is the current request carrying a valid admin session? */
export function isAdminRequest(): boolean {
  return sessionTokenMatches(cookies().get(ADMIN_COOKIE_NAME)?.value);
}
