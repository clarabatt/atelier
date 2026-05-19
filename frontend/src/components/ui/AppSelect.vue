<script setup lang="ts">
import { computed } from "vue";
import {
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from "radix-vue";
import IconChevronDown from "@/components/icons/IconChevronDown.vue";

defineProps<{
  options: { value: string; label: string }[];
  placeholder?: string;
}>();

const model = defineModel<string | null>();
const selectValue = computed({
  get: () => model.value ?? undefined,
  set: (v: string | undefined) => { model.value = v ?? null; },
});
</script>

<template>
  <SelectRoot v-model="selectValue">
    <SelectTrigger class="app-select-trigger">
      <SelectValue :placeholder="placeholder ?? 'Select…'" />
      <IconChevronDown />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent class="app-select-content" position="popper" :side-offset="4">
        <SelectViewport>
          <SelectItem
            v-for="opt in options"
            :key="opt.value"
            :value="opt.value"
            class="app-select-item"
          >
            <SelectItemText>{{ opt.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style lang="scss" scoped>
.app-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 13px;
  font-family: inherit;
  color: var(--color-text);
  cursor: pointer;
  gap: 4px;

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }
}
</style>

<!-- Portal content is teleported outside the component, so these must be global -->
<style lang="scss">
.app-select-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  z-index: 400;
  width: var(--radix-select-trigger-width);
  padding: 4px;
}

.app-select-item {
  padding: 7px 10px;
  font-size: 13px;
  font-family: inherit;
  border-radius: var(--radius);
  cursor: pointer;
  user-select: none;
  color: var(--color-text);
  outline: none;

  &[data-highlighted] {
    background: var(--color-bg-subtle);
  }
}
</style>
