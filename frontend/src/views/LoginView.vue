<script setup lang="ts">
import BaseButton from "@/components/ui/BaseButton.vue";
import IconLogo from "@/components/icons/IconLogo.vue";

function loginWithGoogle() {
  window.location.href = "/auth/google/login";
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <IconLogo class="login-logo" />
      <h1 class="login-title">Atelier</h1>
      <p class="login-subtitle">AI-powered personalised study</p>
      <BaseButton variant="primary" block @click="loginWithGoogle">Sign in with Google</BaseButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-subtle);
}

.login-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 48px 40px;
  text-align: center;
  width: 100%;
  max-width: 380px;
}

.login-logo {
  width: 48px;
  height: auto;
  margin-bottom: 16px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.login-subtitle {
  color: var(--color-text-muted);
  margin-bottom: 32px;
}
</style>
