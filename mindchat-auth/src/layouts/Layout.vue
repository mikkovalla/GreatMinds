<template>
  <div class="layout">
    <!-- Server-rendered Navbar (receives user via Astro.locals in pages) -->
    <!-- Parent .astro page should import the Navbar and pass `user={Astro.locals.user}` -->
    <slot name="navbar" />

    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// Layout is now a lightweight wrapper; server-side navbar is provided by pages
</script>


