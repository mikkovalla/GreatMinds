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


