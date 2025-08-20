<template>
  <div>
    <input
      :id="id"
      :name="name"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :value="modelValue"
      @input="updateValue"
      class="form-input"
    />
    <div v-if="error" class="form-error" role="alert" aria-live="polite">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

interface Props {
  id: string;
  name: string;
  type?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  modelValue?: string;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  required: false,
  modelValue: "",
  error: null,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
};
</script>

<style scoped>
.form-input {
  width: -webkit-fill-available;
  padding: 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  background-color: transparent;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  outline: none;
  color: var(--text-color);
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-input::placeholder {
  color: #9ca3af;
}

.form-input:focus {
  border-color: var(--gold-medium);
  box-shadow: none;
}

.form-input:hover {
  border-color: var(--gold-medium);
}

.form-error {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--danger-color, #dc2626);
}
</style>
