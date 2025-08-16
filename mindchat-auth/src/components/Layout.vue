<template>
  <div class="layout">
    <Navbar
      :is-authenticated="isAuthenticated"
      @login="handleLogin"
      @register="handleRegister"
      @logout="handleLogout"
    />
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Navbar from "./Navbar.vue";

// User authentication state
const isAuthenticated = ref(false);

// Event handlers
const handleLogin = (): void => {
  // This will be implemented when you create the login form
  console.log("Login clicked");
};

const handleRegister = (): void => {
  // This will be implemented when you create the register form
  console.log("Register clicked");
};

const handleLogout = (): void => {
  // This will be implemented with your auth logic
  console.log("Logout clicked");
  isAuthenticated.value = false;
};

// Expose methods if needed by parent components
defineExpose({
  setAuthenticated: (value: boolean) => {
    isAuthenticated.value = value;
  },
});
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
