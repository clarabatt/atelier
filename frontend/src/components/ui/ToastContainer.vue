<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import IconX from '@/components/icons/IconX.vue'

const toast = useToastStore()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
      >
        <span class="toast-message">{{ t.message }}</span>
        <button class="toast-close" @click="toast.dismiss(t.id)">
          <IconX />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 13px;
  max-width: 360px;
  pointer-events: all;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &--error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  &--success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
  }

  &--info {
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }
}

.toast-message {
  flex: 1;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: inherit;
  opacity: 0.6;
  display: flex;
  align-items: center;
  flex-shrink: 0;

  &:hover { opacity: 1; }
}
</style>
