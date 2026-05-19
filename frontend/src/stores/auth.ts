import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: string
  email: string
  display_name: string
  picture_url: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)

  async function fetchMe() {
    isLoading.value = true
    try {
      const res = await fetch('/api/users/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        user.value = data.user
      }
    } catch {
      // backend unreachable — treat as unauthenticated
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    await fetch("/auth/logout", { method: "POST", credentials: "include" }).catch(() => {})
    user.value = null
  }

  return { user, isLoading, isAuthenticated, fetchMe, logout }
})
