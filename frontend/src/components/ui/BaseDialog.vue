<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "radix-vue";
import BaseButton from "@/components/ui/BaseButton.vue";

defineProps<{
  open: boolean;
  title?: string;
  width?: string;
  maxHeight?: string;
  padding?: string;
  gap?: string;
  closeLabel?: string;
  closeDisabled?: boolean;
  actionLabel?: string;
  actionVariant?: "primary" | "danger";
  actionDisabled?: boolean;
}>();
defineEmits<{ "update:open": [value: boolean]; action: [] }>();
</script>

<template>
  <DialogRoot :open="open" @update:open="$emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="dialog-overlay" />
      <DialogContent
        class="dialog-content"
        :style="{
          width: width ?? '320px',
          maxHeight: maxHeight,
          padding: padding ?? '24px',
          gap: gap ?? '8px',
        }"
      >
        <div class="dialog-header">
          <DialogTitle class="dialog-title">{{ title }}</DialogTitle>
          <DialogClose class="dialog-close" aria-label="Close">✕</DialogClose>
        </div>

        <slot />

        <div class="dialog-actions">
          <DialogClose as-child>
            <BaseButton variant="secondary" :disabled="closeDisabled">
              {{ closeLabel ?? "Close" }}
            </BaseButton>
          </DialogClose>
          <BaseButton
            v-if="actionLabel"
            :variant="actionVariant === 'danger' ? 'danger' : 'primary'"
            :disabled="actionDisabled"
            @click="$emit('action')"
          >
            {{ actionLabel }}
          </BaseButton>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style lang="scss" scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 300;
  animation: fadeIn 0.15s ease;
}

.dialog-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 301;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.15s ease;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.dialog-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 14px;
  border-radius: var(--radius-sm);
  line-height: 1;

  &:hover {
    background: var(--color-bg-subtle);
    color: var(--color-text);
  }
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}


@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
</style>
