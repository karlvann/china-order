<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="bg-surface border border-border rounded-xl p-8 max-w-md w-full">
      <h2 class="text-xl font-bold text-primary mb-6">Log in</h2>
      <form @submit.prevent="onSubmit" class="space-y-4">
        <div>
          <label class="block text-sm text-muted mb-1">Email</label>
          <input
            v-model="formState.email"
            type="email"
            autocapitalize="none"
            class="w-full bg-input-surface border border-border rounded-lg px-4 py-2 text-primary focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label class="block text-sm text-muted mb-1">Password</label>
          <input
            v-model="formState.password"
            type="password"
            class="w-full bg-input-surface border border-border rounded-lg px-4 py-2 text-primary focus:outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-brand hover:bg-brand-hover text-inverse font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          <span v-if="loading">Logging in...</span>
          <span v-else>Log in</span>
        </button>
        <div v-if="loginError || sessionMessage" class="text-danger text-sm">
          {{ loginError || sessionMessage }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const { login, logout } = useDirectusAuth()
const router = useRouter()
const route = useRoute()
const user = useDirectusUser()
const {
  clearDirectusSession,
  getDirectusErrorMessage,
  isAllowedUser,
  isAllowedUserEmail,
  isAusbedsUserEmail
} = useDirectusSession()

const loading = ref(false)
const loginError = ref(null)
const unauthorizedAusbedsMessage = 'This user is not allowed to access inventory data.'
const unauthorizedAccountMessage = 'This account is not authorised to access this app.'
const sessionMessage = computed(() => {
  if (route.query.session === 'expired') return 'Your session expired. Please log in again.'
  if (route.query.session === 'unauthorized') return unauthorizedAccountMessage

  return null
})

const formState = ref({
  email: '',
  password: ''
})

const onSubmit = async () => {
  loading.value = true
  loginError.value = null

  const email = formState.value.email.trim().toLowerCase()

  if (isAusbedsUserEmail(email) && !isAllowedUserEmail(email)) {
    loginError.value = unauthorizedAusbedsMessage
    loading.value = false
    return
  }

  try {
    const result = await login({
      email,
      password: formState.value.password
    })

    if (!isAllowedUser(result.user)) {
      try {
        await logout()
      } catch {
        clearDirectusSession()
      }

      clearDirectusSession()

      const loggedInEmail = result.user?.email || email
      loginError.value = isAusbedsUserEmail(loggedInEmail) && !isAllowedUserEmail(loggedInEmail)
        ? unauthorizedAusbedsMessage
        : unauthorizedAccountMessage
      return
    }

    router.push('/dashboard')
  } catch (e) {
    loginError.value = getDirectusErrorMessage(e, 'Invalid email or password')
  } finally {
    loading.value = false
  }
}

watchEffect(() => {
  if (!user.value) return

  if (isAllowedUser()) {
    router.push('/dashboard')
    return
  }

  clearDirectusSession()
})
</script>
