import type { APIContext } from "astro";
import type { User, Session, SupabaseClient } from "@supabase/supabase-js";
import { createErrorResponse } from "./security";
import { logger } from "./logging";
import { SupabaseError } from "./loggingConstants";

/**
 * Defines the possible authentication states for a user.
 */
export enum UserState {
  ANONYMOUS,
  FREE_USER,
  PREMIUM_USER,
  LICENSE_USER,
}

/**
 * Represents the resolved state of a user from a request.
 */
export type UserStateResult = {
  state: UserState;
  user: User | null;
  session: Session | null;
};

/**
 * Determines the user's authentication state based on the request context.
 * It checks for a valid session and queries the user's profile for their role.
 *
 * @param context - The Astro API context.
 * @returns A promise that resolves to a UserStateResult object.
 */
export const getUserState = async (
  context: APIContext
): Promise<UserStateResult> => {
  const supabase: SupabaseClient = context.locals.supabase;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { state: UserState.ANONYMOUS, user: null, session: null };
  }

  const { user } = session;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) {
    logger.logRequestError(
      SupabaseError.DATABASE_ERROR,
      "Failed to fetch user profile for state check.",
      error,
      context.request,
      { userId: user.id }
    );
    return { state: UserState.ANONYMOUS, user: null, session: null };
  }

  if (!profile) {
    logger.logRequestError(
      SupabaseError.USER_NOT_FOUND,
      "User profile not found during state check.",
      new Error("Profile not found"),
      context.request,
      { userId: user.id }
    );
    return { state: UserState.ANONYMOUS, user: null, session: null };
  }

  switch (profile.role) {
    case "premium":
      return { state: UserState.PREMIUM_USER, user, session };
    case "license":
      return { state: UserState.LICENSE_USER, user, session };
    case "free":
    default:
      return { state: UserState.FREE_USER, user, session };
  }
};

/**
 * A type for the handler function that is protected by requireAuthState.
 * It receives the authenticated user, session, and the original context.
 */
type AuthenticatedHandler = (args: {
  user: User;
  session: Session;
  context: APIContext;
}) => Promise<Response>;

/**
 * A higher-order function that wraps an API route handler to enforce authentication states.
 *
 * @param allowedStates - An array of UserState enums that are permitted to access the route.
 * @param handler - The API route handler to execute if authorization succeeds.
 * @returns An APIRoute function that performs the authorization check before executing the handler.
 */
export const requireAuthState = (
  allowedStates: UserState[],
  handler: AuthenticatedHandler
) => {
  return async (context: APIContext): Promise<Response> => {
    const { state, user, session } = await getUserState(context);

    if (!user || !session || !allowedStates.includes(state)) {
      return createErrorResponse(
        403,
        "Forbidden: Access denied.",
        "INSUFFICIENT_PERMISSIONS"
      );
    }

    return handler({ user, session, context });
  };
};
