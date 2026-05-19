<script setup lang="ts">
import BaseButton from "@/components/ui/BaseButton.vue";
import IconUpload from "@/components/icons/IconUpload.vue";

defineProps<{
  title: string;
  titleUrl?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
}>();

defineEmits<{ action: [] }>();
</script>

<template>
  <div class="title-bar">
    <RouterLink v-if="titleUrl" class="title-bar__title title-bar__title--link" :to="titleUrl">{{
      title
    }}</RouterLink>
    <h2 v-else class="title-bar__title">{{ title }}</h2>
    <BaseButton v-if="actionLabel" :disabled="actionDisabled" @click="$emit('action')">
      <IconUpload />
      {{ actionLabel }}
    </BaseButton>
    <slot v-else name="action" />
  </div>
</template>

<style lang="scss" scoped>
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 2.5rem;
  min-height: 3rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-bg);
}

.title-bar__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);

  &--link {
    transition: 0.2s color;

    &:hover {
      color: var(--color-primary-hover);
      transition: 0.2s color;
    }
  }
}
</style>
