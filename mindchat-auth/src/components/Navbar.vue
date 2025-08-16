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
          <Button variant="ghost" size="small" @click="handleLogout">
            Logout
          </Button>
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

<style scoped>
/* Use the exact classes and structure from the client site */
.nav {
  background: var(--background-color);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.container {
  width: 100%;
  max-width: var(--main-column-width);
  margin: 0 auto;
  padding: 0 5%;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0;
}

.nav-logo {
  margin-right: auto;
}

.nav-logo a {
  font-family: var(--title-font);
  font-size: 1.8rem;
  font-weight: 700;
  text-decoration: none;
  letter-spacing: 1px;
}

.text-gold {
  background: linear-gradient(45deg, #c19000, #f9d423, #fff6a9, #c19000);
  background-size: 200% auto;
  color: transparent;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 1px 1px #000, 0 0 0 #c19000;
}

.text-gold-animated {
  animation: goldenBase 6s ease-in-out infinite;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 2rem;
  margin: 0;
  padding: 0;
  align-items: center;
}

.nav-links li a {
  color: var(--text-color);
  text-decoration: none;
  font-size: 1.1rem;
  padding: 0.5rem;
  transition: color 0.3s ease;
}

.nav-links li a:hover {
  color: var(--gold-medium);
}

.nav-language-picker {
  display: none;
}

.desktop-language-picker {
  display: block;
  margin-left: 2rem;
}

.nav-auth {
  display: flex;
  gap: 0.75rem;
  margin-left: 1rem;
  align-items: center;
}

.mobile-auth {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
  align-items: center;
}

.language-picker {
  position: relative;
}

.current-language {
  cursor: pointer;
}

.current-language .flag-icon {
  width: 28px;
  height: auto;
  border-radius: 4px;
  transition: transform 0.2s ease;
}

.current-language:hover .flag-icon {
  transform: scale(1.1);
}

.dropdown {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--component-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem;
  min-width: 150px;
  z-index: 10;
  box-shadow: 0 4px 15px #0000004d;
  flex-direction: column;
  gap: 0.25rem;
}

.dropdown.active {
  display: flex;
}

.dropdown a {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.dropdown a:hover {
  background-color: var(--component-bg-hover);
}

.dropdown .flag-icon {
  width: 24px;
  height: auto;
}

.hamburger {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  gap: 0.25rem;
}

.hamburger span {
  width: 25px;
  height: 3px;
  background-color: var(--text-color);
  transition: all 0.3s ease;
  border-radius: 1px;
}

.hamburger.active span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
}

.hamburger.active span:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

/* Mobile Styles */
@media (max-width: 1023px) {
  .nav-links {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--background-color);
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    z-index: 99;
  }

  .nav-links.active {
    display: flex;
  }

  .nav-language-picker {
    display: block;
    margin-top: 2rem;
  }

  .desktop-language-picker {
    display: none;
  }

  .hamburger {
    display: flex;
    z-index: 101;
  }
}

@media (max-width: 767px) {
  .container {
    padding: 0 3%;
  }

  .nav-container {
    padding: 1rem 0;
  }

  .nav-logo a {
    font-size: 1.5rem;
  }
}

@keyframes goldenBase {
  0%,
  to {
    background-position: -150% 0%, 0% 50%;
  }

  50% {
    background-position: 150% 0%, 0% 50%;
  }
}
</style>
