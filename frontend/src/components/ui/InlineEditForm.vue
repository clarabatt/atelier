<script setup lang="ts">
import { ref, onMounted } from "vue";
import BaseButton from "@/components/ui/BaseButton.vue";

const props = defineProps<{
  modelValue: string;
  error?: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
  cancel: [];
}>();

const input = ref<HTMLInputElement | null>(null);

onMounted(() => {
  input.value?.select();
});
</script>

<template>
  <div class="inline-edit">
    <form class="inline-edit-form" @submit.prevent="emit('submit')">
      <input
        ref="input"
        class="inline-edit-input"
        :value="props.modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @keydown.esc="emit('cancel')"
      />
      <BaseButton type="submit" size="sm" variant="primary">Save</BaseButton>
      <BaseButton type="button" size="sm" variant="secondary" @click="emit('cancel')">Cancel</BaseButton>
    </form>
    <p v-if="props.error" class="inline-edit-error">{{ props.error }}</p>
  </div>
</template>

<style lang="scss" scoped>
.inline-edit-form {
  display: flex;
  align-items: center;
  gap: 6px;
}

.inline-edit-input {
  flex: 1;
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
}

.inline-edit-error {
  font-size: 11px;
  color: var(--color-danger);
  margin-top: 3px;
}
</style>
