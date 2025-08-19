<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { User } from "@supabase/supabase-js";

const props = defineProps<{ initialUser: User | null }>();

const activeTab = ref("profile");
const user = ref<User | null>(props.initialUser ?? null);

// Handle URL parameters to set initial tab
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  if (tab && ['profile', 'chats', 'subscription'].includes(tab)) {
    activeTab.value = tab;
  }
});
</script>

<template>
  <div class="profile-container">
    <h1>Your Profile</h1>
    <div class="tabs">
      <button
        :class="{ active: activeTab === 'profile' }"
        @click="activeTab = 'profile'"
      >
        Profile
      </button>
      <button
        :class="{ active: activeTab === 'chats' }"
        @click="activeTab = 'chats'"
      >
        Chats
      </button>
      <button
        :class="{ active: activeTab === 'subscription' }"
        @click="activeTab = 'subscription'"
      >
        Manage Subscription
      </button>
    </div>
    <div class="tab-content">
      <div v-if="activeTab === 'profile'">
        <h2>Profile Details</h2>
        <p v-if="user">Email: {{ user.email }}</p>
        <p v-if="user">
          Joined: {{ new Date(user.created_at).toLocaleDateString() }}
        </p>
      </div>
      <div v-if="activeTab === 'chats'">
        <h2>Your Chats</h2>
        <p>Chat history will be available here soon.</p>
      </div>
      <div v-if="activeTab === 'subscription'">
        <h2>Manage Your Subscription</h2>
        <p>Subscription management powered by Stripe is coming soon.</p>
      </div>
    </div>
  </div>
</template>