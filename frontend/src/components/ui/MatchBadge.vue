<script setup lang="ts">
import IconCheck from "@/components/icons/IconCheck.vue";
import IconX from "@/components/icons/IconX.vue";

defineProps<{ found: boolean }>()
</script>

<template>
  <span :class="found ? 'badge-found' : 'badge-missing'">
    <IconCheck v-if="found" />
    <IconX v-else />
    {{ found ? 'Yes' : 'No' }}
  </span>
</template>

<style lang="scss" scoped>
.badge-found,
.badge-missing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-found {
  color: var(--color-success);
}

.badge-missing {
  color: var(--color-text-muted);
}
</style>
