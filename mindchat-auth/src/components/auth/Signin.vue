<template>
  <div class="auth-form-container">
    <form :method="method" :action="action" class="auth-form">
      <div class="form-content">
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Email"
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          required
        />

        <div class="submit-section">
          <input type="submit" :value="submitText" class="submit-button" />
        </div>
      </div>
    </form>

    <SocialButtons />

    <div class="auth-footer">
      <a href="/forgot-password" class="forgot-link">Forget Password?</a>
      <p class="signup-text">
        <span>Not a member yet? </span>
        <a href="/register" class="signup-link">Sign Up</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import SocialButtons from "../SocialButtons.vue";
import Input from "../Input.vue";

interface Props {
  method?: string;
  action: string;
  submitText: string;
}

const props = withDefaults(defineProps<Props>(), {
  method: "post",
});
</script>

<style scoped>
.auth-form-container {
  width: 100%;
}

.auth-form {
  width: 100%;
}

.form-content {
  margin: 16px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-content :deep(.form-group) {
  margin-bottom: 1.5rem;
}

.submit-section {
  margin-bottom: 2.5rem;
}

.submit-button {
  width: 100%;
  padding: 0.75rem 1.25rem;
  font-size: 1rem;
  font-weight: 500;
  color: white;
  background-color: var(--gold-medium);
  border: 1px solid var(--gold-medium);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-button:hover {
  background-color: var(--gold-dark);
  border-color: var(--gold-dark);
}

.auth-footer {
  text-align: center;
}

.auth-footer :deep(.forgot-link) {
  display: inline-block;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  color: var(--text-color);
  text-decoration: none;
}

.auth-footer :deep(.forgot-link:hover) {
  color: var(--gold-bright);
  text-decoration: underline;
}

.auth-footer :deep(.signup-text) {
  font-size: 1rem;
  color: #9ca3af;
  margin: 0;
}

.auth-footer :deep(.signup-text span) {
  margin-right: 0.125rem;
}

.auth-footer :deep(.signup-link) {
  color: var(--gold-medium);
  text-decoration: none;
}

.auth-footer :deep(.signup-link:hover) {
  text-decoration: underline;
}
</style>
