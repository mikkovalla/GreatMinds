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
import { supabase } from "@/lib/supabaseClient";

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
  await supabase.auth.signOut();
  isAuthenticated.value = false;
};
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex-grow: 1;
  width: 100%;
}
</style>
