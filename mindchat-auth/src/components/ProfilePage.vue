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

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

const activeTab = ref("profile");
const user = ref<User | null>(null);

onMounted(async () => {
  const { data } = await supabase.auth.getUser();
  user.value = data.user;
});
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: var(--component-bg);
  border-radius: 8px;
}

h1 {
  color: var(--gold-bright);
  text-align: center;
  margin-bottom: 2rem;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 2rem;
}

.tabs button {
  padding: 1rem 1.5rem;
  cursor: pointer;
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1rem;
  position: relative;
  bottom: -1px;
}

.tabs button.active {
  color: var(--gold-bright);
  border-bottom: 2px solid var(--gold-bright);
}

.tab-content {
  color: var(--text-color);
}
</style>
