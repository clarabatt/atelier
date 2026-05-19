<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  src?: string | null
  name: string
}>()

const imgSrc = ref(props.src)
watch(() => props.src, (val) => { imgSrc.value = val })

const initials = computed(() =>
  props.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]!.toUpperCase())
    .join('')
)
</script>

<template>
  <div class="avatar">
    <img v-if="imgSrc" :src="imgSrc" :alt="name" class="avatar-img" @error="imgSrc = null" />
    <span v-else class="avatar-initials">{{ initials }}</span>
  </div>
</template>

<style lang="scss" scoped>
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  line-height: 1;
}
</style>
