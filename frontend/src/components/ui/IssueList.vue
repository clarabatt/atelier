<script setup lang="ts">
defineProps<{ items: string[] }>();
</script>

<template>
  <ul class="issue-list">
    <li v-for="(item, i) in items" :key="i" class="issue-list__item">{{ item }}</li>
  </ul>
</template>

<style lang="scss" scoped>
.issue-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__item {
    color: var(--color-text);
    padding-left: 14px;
    position: relative;
    line-height: 1.45;

    &::before {
      content: "•";
      position: absolute;
      left: 0;
      color: var(--color-warning);
    }
  }
}
</style>
