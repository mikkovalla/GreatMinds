<template>
  <div v-if="isVisible" class="auth-modal-backdrop" @click.self="closeModal">
    <div class="auth-modal-container">
      <button class="close-button" @click="closeModal">&times;</button>
      <div class="auth-modal-content">
        <div v-if="isLoginView">
          <h2 class="modal-title">Log In</h2>
          <form @submit.prevent="handleLogin">
            <div class="form-group">
              <label for="login-email">Email</label>
              <input
                id="login-email"
                v-model="loginEmail"
                type="email"
                required
              />
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input
                id="login-password"
                v-model="loginPassword"
                type="password"
                required
              />
            </div>
            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
            <Button type="submit" :loading="isLoading">Log In</Button>
          </form>
          <p class="toggle-view">
            Don't have an account? <button @click="toggleView">Register</button>
          </p>
        </div>
        <div v-else>
          <h2 class="modal-title">Register</h2>
          <form @submit.prevent="handleRegister">
            <div class="form-group">
              <label for="register-email">Email</label>
              <input
                id="register-email"
                v-model="registerEmail"
                type="email"
                required
              />
            </div>
            <div class="form-group">
              <label for="register-password">Password</label>
              <input
                id="register-password"
                v-model="registerPassword"
                type="password"
                required
              />
            </div>
            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
            <Button type="submit" :loading="isLoading">Register</Button>
          </form>
          <p class="toggle-view">
            Already have an account? <button @click="toggleView">Log In</button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Button from "./Button.vue";

interface Props {
  isVisible: boolean;
  initialView?: "login" | "register";
}

const props = withDefaults(defineProps<Props>(), {
  initialView: "login",
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "authenticated"): void;
}>();

const isLoginView = ref(props.initialView === "login");
const loginEmail = ref("");
const loginPassword = ref("");
const registerEmail = ref("");
const registerPassword = ref("");
const isLoading = ref(false);
const errorMessage = ref("");

const closeModal = () => {
  emit("close");
};

const toggleView = () => {
  isLoginView.value = !isLoginView.value;
  errorMessage.value = "";
};

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPassword.value,
      }),
    });
    if (response.ok) {
      emit("authenticated");
      closeModal();
    } else {
      const errorData = await response.json();
      errorMessage.value = errorData.message || "Login failed.";
    }
  } catch (error) {
    errorMessage.value = "An unexpected error occurred.";
  } finally {
    isLoading.value = false;
  }
};

const handleRegister = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: registerEmail.value,
        password: registerPassword.value,
      }),
    });
    if (response.ok) {
      emit("authenticated");
      closeModal();
    } else {
      const errorData = await response.json();
      errorMessage.value = errorData.message || "Registration failed.";
    }
  } catch (error) {
    errorMessage.value = "An unexpected error occurred.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.auth-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.auth-modal-container {
  background-color: var(--component-bg);
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  position: relative;
  border: 1px solid var(--border-color);
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-title {
  color: var(--gold-bright);
  text-align: center;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-color);
}

.error-message {
  color: #ff4d4d;
  margin-bottom: 1rem;
  text-align: center;
}

.toggle-view {
  text-align: center;
  margin-top: 1rem;
}

.toggle-view button {
  background: none;
  border: none;
  color: var(--gold-bright);
  cursor: pointer;
  text-decoration: underline;
}
</style>
