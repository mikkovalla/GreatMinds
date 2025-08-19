/**
 * Client-side authentication utilities
 * Handles logout and other auth-related client operations
 */
import { createUsualClient } from "./supabaseClient";

/**
 * Handles client-side logout
 * This function is called from client-side components
 */
export async function handleLogout(): Promise<void> {
  try {
    // Call server-side logout endpoint
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    // Additional client-side cleanup if needed
    const supabase = createUsualClient();
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Client-side signOut failed (non-fatal)", e);
    }

    // Redirect to home page
    window.location.replace("/");
  } catch (err) {
    console.error("Logout failed", err);

    // Fallback: try client-side logout and redirect
    try {
      const supabase = createUsualClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Client-side signOut during fallback failed", e);
    }
    window.location.replace("/");
  }
}
