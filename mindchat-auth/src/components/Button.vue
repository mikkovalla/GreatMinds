<template>
  <component
    :is="tag"
    :class="buttonClasses"
    :type="tag === 'button' ? buttonType : undefined"
    :href="tag === 'a' ? href : undefined"
    :target="tag === 'a' && external ? '_blank' : undefined"
    :rel="tag === 'a' && external ? 'noopener noreferrer' : undefined"
    @click="handleClick"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "small" | "medium" | "large";
type ButtonType = "button" | "submit" | "reset";

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  external?: boolean;
  buttonType?: ButtonType;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "medium",
  disabled: false,
  loading: false,
  buttonType: "button",
});

const emit = defineEmits<{
  click: [event: Event];
}>();

const tag = computed(() => (props.href ? "a" : "button"));

const buttonClasses = computed(() => [
  "button",
  `button--${props.variant}`,
  `button--${props.size}`,
  {
    "button--disabled": props.disabled,
    "button--loading": props.loading,
  },
]);

const handleClick = (event: Event): void => {
  if (props.disabled || props.loading) {
    event.preventDefault();
    return;
  }
  emit("click", event);
};
</script>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--primary-font);
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;
  user-select: none;
}

.button:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--gold-medium);
}

.button--disabled,
.button--loading {
  pointer-events: none;
  opacity: 0.6;
}

/* Variants */
.button--primary {
  color: #fff;
  background-color: var(--background-color);
  border-color: var(--gold-medium);
  box-shadow: 0 2px 5px #0003;
}

.button--primary:hover {
  background-color: #333;
  color: var(--gold-bright);
  box-shadow: 0 4px 15px #0000004d;
  transform: translateY(-2px);
}

.button--secondary {
  color: var(--text-color);
  background-color: var(--component-bg);
  border-color: var(--border-color);
}

.button--secondary:hover {
  background-color: var(--component-bg-hover);
  color: var(--gold-bright);
  border-color: var(--gold-medium);
}

.button--ghost {
  color: var(--text-color);
  background-color: transparent;
  border-color: transparent;
}

.button--ghost:hover {
  color: var(--gold-bright);
  background-color: var(--component-bg);
}

/* Sizes */
.button--small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.button--medium {
  padding: 0.8rem 1.8rem;
  font-size: 1rem;
}

.button--large {
  padding: 1rem 2.4rem;
  font-size: 1.125rem;
}
</style>
