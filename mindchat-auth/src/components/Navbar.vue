<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import Button from "./Button.vue";

interface Language {
  code: string;
  name: string;
  flag: string;
  url: string;
}

interface Props {
  isAuthenticated?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isAuthenticated: false,
});

const emit = defineEmits<{
  login: [];
  register: [];
  logout: [];
}>();

// Mobile menu state
const mobileMenuOpen = ref(false);
const userMenuOpen = ref(false);

// Language dropdown state
const languageDropdownOpen = ref(false);

// Available languages with exact URLs from client site
const availableLanguages: Language[] = [
  {
    code: "fr",
    name: "Français",
    flag: "https://cdn.jsdelivr.net/gh/lipis/flag-icons@latest/flags/4x3/fr.svg",
    url: "/fr/categories/ecrivain",
  },
  {
    code: "de",
    name: "Deutsch",
    flag: "https://cdn.jsdelivr.net/gh/lipis/flag-icons@latest/flags/4x3/de.svg",
    url: "/de/categories/schriftsteller",
  },
  {
    code: "es",
    name: "Español",
    flag: "https://cdn.jsdelivr.net/gh/lipis/flag-icons@latest/flags/4x3/es.svg",
    url: "/es/categories/escritor",
  },
  {
    code: "it",
    name: "Italiano",
    flag: "https://cdn.jsdelivr.net/gh/lipis/flag-icons@latest/flags/4x3/it.svg",
    url: "/it/categories/scrittore",
  },
];

// Current language (default to English/US)
const currentLanguageCode = ref("en");

const currentLanguage = computed(() => ({
  code: "us",
  name: "English",
  flag: "https://cdn.jsdelivr.net/gh/lipis/flag-icons@latest/flags/4x3/us.svg",
  url: "/en/",
}));

// Methods
const toggleMobileMenu = (): void => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const toggleUserMenu = (): void => {
  userMenuOpen.value = !userMenuOpen.value;
};

const closeMobileMenu = (): void => {
  mobileMenuOpen.value = false;
};

const toggleLanguageDropdown = (): void => {
  languageDropdownOpen.value = !languageDropdownOpen.value;
};

const selectLanguage = (language: Language): void => {
  currentLanguageCode.value = language.code;
  languageDropdownOpen.value = false;
  // Navigation will be handled by the href
};

const getLanguageUrl = (language: Language): string => {
  return language.url;
};

const handleLogin = (): void => {
  emit("login");
};

const handleRegister = (): void => {
  emit("register");
};

const handleLogout = (): void => {
  emit("logout");
};

// Close dropdowns when clicking outside
const handleDocumentClick = (event: Event): void => {
  const target = event.target as Element;
  if (languageDropdownOpen.value && !target?.closest(".language-picker")) {
    languageDropdownOpen.value = false;
  }
  if (mobileMenuOpen.value && !target?.closest(".hamburger, .nav-links")) {
    mobileMenuOpen.value = false;
  }
  if (userMenuOpen.value && !target?.closest(".user-menu")) {
    userMenuOpen.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  if (typeof document !== "undefined") {
    document.addEventListener("click", handleDocumentClick);
  }
});

onUnmounted(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("click", handleDocumentClick);
  }
});
</script>

<template>
  <header class="nav">
    <div class="container">
      <nav class="nav-container">
        <!-- Logo -->
        <div class="nav-logo text-gold text-gold-animated">
          <a href="/en/">MindChat</a>
        </div>

        <!-- Menu de navigation principal -->
        <ul class="nav-links" :class="{ active: mobileMenuOpen }">
          <li>
            <a href="/en/categories/writer" @click="closeMobileMenu">Writers</a>
          </li>
          <li>
            <a href="/en/categories/thinker" @click="closeMobileMenu"
              >Thinkers</a
            >
          </li>
          <li>
            <a href="/en/categories/scientist" @click="closeMobileMenu"
              >Scientists</a
            >
          </li>

          <!-- LanguagePicker mobile -->
          <div class="nav-language-picker">
            <div class="language-picker">
              <div class="current-language" @click="toggleLanguageDropdown">
                <img
                  :src="currentLanguage.flag"
                  :alt="`Flag ${currentLanguage.code.toUpperCase()}`"
                  class="flag-icon"
                />
              </div>
              <div class="dropdown" :class="{ active: languageDropdownOpen }">
                <a
                  v-for="language in availableLanguages"
                  :key="language.code"
                  :href="getLanguageUrl(language)"
                  :title="language.name"
                  @click="selectLanguage(language)"
                >
                  <img
                    :src="language.flag"
                    :alt="`Flag ${language.code.toUpperCase()}`"
                    class="flag-icon"
                  />
                </a>
              </div>
            </div>
          </div>
        </ul>

        <!-- LanguagePicker sur desktop -->
        <div class="desktop-language-picker">
          <div class="language-picker">
            <div class="current-language" @click="toggleLanguageDropdown">
              <img
                :src="currentLanguage.flag"
                :alt="`Flag ${currentLanguage.code.toUpperCase()}`"
                class="flag-icon"
              />
            </div>
            <div class="dropdown" :class="{ active: languageDropdownOpen }">
              <a
                v-for="language in availableLanguages"
                :key="language.code"
                :href="getLanguageUrl(language)"
                :title="language.name"
                @click="selectLanguage(language)"
              >
                <img
                  :src="language.flag"
                  :alt="`Flag ${language.code.toUpperCase()}`"
                  class="flag-icon"
                />
              </a>
            </div>
          </div>
        </div>

        <!-- Auth buttons -->
        <div class="nav-auth" v-if="!isAuthenticated">
          <Button variant="ghost" size="small" @click="handleLogin">
            Login
          </Button>
          <Button variant="primary" size="small" @click="handleRegister">
            Register
          </Button>
        </div>

        <div class="nav-auth" v-else>
          <div class="user-menu">
            <button class="user-menu-button" @click="toggleUserMenu">
              <span class="user-avatar"></span>
            </button>
            <div v-if="userMenuOpen" class="user-menu-dropdown">
              <a href="/profile">Profile</a>
              <a href="/profile?tab=subscription">Manage Subscription</a>
              <button @click="handleLogout">Log Out</button>
            </div>
          </div>
        </div>

        <!-- Bouton hamburger -->
        <button
          class="hamburger"
          :class="{ active: mobileMenuOpen }"
          @click="toggleMobileMenu"
          aria-label="Ouvrir le menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
    </div>
  </header>
</template>
