<template>
  <div class="social-section">
    <p class="social-label">Connect With</p>
    <ul class="social-buttons-list">
      <li class="social-button-item">
        <SocialButton 
          provider="facebook" 
          aria-label="Sign in with Facebook"
          @click="$emit('facebook-click')"
        />
      </li>
      <li class="social-button-item">
        <SocialButton 
          provider="twitter" 
          aria-label="Sign in with Twitter"
          @click="$emit('twitter-click')"
        />
      </li>
      <li class="social-button-item">
        <SocialButton 
          provider="google" 
          aria-label="Sign in with Google"
          @click="$emit('google-click')"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { defineEmits } from 'vue'
import SocialButton from './SocialButton.vue'

const emit = defineEmits<{
  'facebook-click': []
  'twitter-click': []
  'google-click': []
}>()
</script>

<style scoped>
.social-section {
  margin-bottom: 3rem;
}

.social-label {
  margin-bottom: 1.5rem;
  font-size: 1rem;
  text-align: center;
  color: #9ca3af;
}

.social-buttons-list {
  display: flex;
  justify-content: space-between;
  margin: 0 -0.5rem;
  list-style: none;
  padding: 0;
}

.social-button-item {
  width: 100%;
  padding: 0 0.5rem;
}
</style>