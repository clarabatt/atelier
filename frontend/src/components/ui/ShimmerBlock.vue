<script setup lang="ts">
defineProps<{
  width?: string
  height?: number
}>()
</script>

<template>
  <div
    class="shimmer-block"
    :style="{ width: width ?? '100%', height: `${height ?? 12}px` }"
  />
</template>

<style lang="scss" scoped>
.shimmer-block {
  background: var(--color-border);
  border-radius: var(--radius);
  animation: shimmer 1.4s ease infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
