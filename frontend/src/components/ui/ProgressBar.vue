<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  pct: number
  color?: 'primary' | 'auto' | 'danger'
  height?: number
}>()

const fillClass = computed(() => {
  if (props.color === 'danger') return 'fill--low'
  if ((props.color ?? 'auto') === 'primary') return 'fill--primary'
  if (props.pct >= 70) return 'fill--good'
  if (props.pct >= 40) return 'fill--mid'
  return 'fill--low'
})
</script>

<template>
  <div class="progress-bar" :style="{ height: `${height ?? 4}px` }">
    <div class="progress-bar-fill" :class="fillClass" :style="{ width: pct + '%' }" />
  </div>
</template>

<style lang="scss" scoped>
.progress-bar {
  background: var(--color-border);
  border-radius: 99px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;

  &.fill--primary { background: var(--color-primary); }
  &.fill--good { background: var(--color-success); }
  &.fill--mid { background: var(--color-warning); }
  &.fill--low { background: var(--color-danger); }
}
</style>
