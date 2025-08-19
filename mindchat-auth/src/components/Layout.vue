<template>
  <div class="layout">
    <Navbar
      :is-authenticated="isAuthenticated"
      @login="openLoginModal"
      @register="openRegisterModal"
      @logout="handleLogout"
    />
    <main class="main-content">
      <slot />
    </main>
    <AuthModal
      :is-visible="isAuthModalVisible"
      :initial-view="authModalView"
      @close="closeAuthModal"
      @authenticated="handleAuthentication"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import Navbar from "./Navbar.vue";
import AuthModal from "./AuthModal.vue";
import { createUsualClient } from "@/lib/supabaseClient";
const supabase = createUsualClient();

const isAuthenticated = ref(false);
const isAuthModalVisible = ref(false);
const authModalView = ref<"login" | "register">("login");

onMounted(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    isAuthenticated.value = !!session;
  });
});

const openLoginModal = () => {
  authModalView.value = "login";
  isAuthModalVisible.value = true;
};

const openRegisterModal = () => {
  authModalView.value = "register";
  isAuthModalVisible.value = true;
};

const closeAuthModal = () => {
  isAuthModalVisible.value = false;
};

const handleAuthentication = () => {
  isAuthenticated.value = true;
  closeAuthModal();
};

const handleLogout = async () => {
  try {
    // Call server-side logout to ensure HTTP-only cookies are cleared (SSR session)
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });

    // Also sign out client-side to clear any browser-stored session
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Non-fatal: server-side logout is authoritative for SSR; log to console for debugging
      // eslint-disable-next-line no-console
      console.warn('Client-side signOut failed (non-fatal)', e);
    }

    // Force a full reload so SSR will run and see the anonymous session
    window.location.replace('/');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Logout failed', err);
    // Fallback: try client sign out and update UI state
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    isAuthenticated.value = false;
  }
};
</script>


