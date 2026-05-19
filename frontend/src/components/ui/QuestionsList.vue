<script setup lang="ts">
defineProps<{
  items: string[];
  label?: string;
}>();
</script>

<template>
  <div class="questions" :class="{ 'questions--no-label': !label }">
    <p v-if="label" class="questions-label">{{ label }}</p>
    <ul class="questions-list">
      <li v-for="(q, i) in items" :key="i" class="questions-list__item">{{ q }}</li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.questions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.questions-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.questions-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;

  &__item {
    color: var(--color-primary);
    padding-left: 16px;
    position: relative;
    line-height: 1.45;

    &::before {
      content: "→";
      position: absolute;
      left: 0;
      color: var(--color-primary);
      font-size: 11px;
    }
  }
}
</style>
