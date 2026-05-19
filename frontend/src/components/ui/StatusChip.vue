<script lang="ts">
export const StatusChipVariant = {
  default: "default",
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
} as const;

export type StatusChipVariant = (typeof StatusChipVariant)[keyof typeof StatusChipVariant];
</script>

<script setup lang="ts">
import Spinner from "@/components/ui/Spinner.vue";

defineProps<{
  text: string;
  variant?: StatusChipVariant;
  loading?: boolean;
}>();
</script>

<template>
  <span class="status-chip" :class="`status-chip--${variant ?? 'default'}`">
    <Spinner v-if="loading" :size="10" />
    {{ text }}
  </span>
</template>

<style lang="scss" scoped>
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 99px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  white-space: nowrap;

  &--info {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  &--success {
    color: var(--color-success);
    border-color: var(--color-success);
  }

  &--warning {
    color: var(--color-warning);
    border-color: var(--color-warning);
  }

  &--error {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }
}
</style>
