<script setup lang="ts">
import { ref } from 'vue';
import { handleLogout } from '@/lib/clientAuth';

const props = defineProps<{
  user?: any;
}>();

const userMenuOpen = ref(false);
const toggleUserMenu = () => { userMenuOpen.value = !userMenuOpen.value };
const closeMenus = (e: Event) => {
  const target = e.target as Element;
  if (!target.closest('.user-menu')) userMenuOpen.value = false;
}
const goToProfile = () => { globalThis.location.href = '/profile'; };
const goToManageSubscription = () => { globalThis.location.href = '/profile?tab=subscription'; };

const onLogout = async () => {
  await handleLogout();
};

if (typeof document !== 'undefined') document.addEventListener('click', closeMenus);
</script>

<template>
  <div :class="['user-menu', { 'open': userMenuOpen }]">
    <button class="user-menu-button" @click.prevent="toggleUserMenu">
      <span class="user-avatar"></span>
    </button>
    <div v-if="userMenuOpen" class="user-menu-dropdown">
  <button @click="goToProfile">Profile</button>
  <button @click="goToManageSubscription">Manage Subscription</button>
      <button @click="onLogout">Log Out</button>
    </div>
  </div>
</template>
