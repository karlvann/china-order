<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="bg-surface border border-surface-border rounded-xl p-8 max-w-md w-full">
      <h2 class="text-xl font-bold text-zinc-50 mb-6">Login</h2>
      <form @submit.prevent="onSubmit" class="space-y-4">
        <div>
          <label class="block text-sm text-zinc-400 mb-1">Email</label>
          <input
            v-model="formState.email"
            type="email"
            autocapitalize="none"
            class="w-full bg-surface-darker border border-surface-border rounded-lg px-4 py-2 text-zinc-200 focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label class="block text-sm text-zinc-400 mb-1">Password</label>
          <input
            v-model="formState.password"
            type="password"
            class="w-full bg-surface-darker border border-surface-border rounded-lg px-4 py-2 text-zinc-200 focus:outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-brand hover:bg-brand/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          <span v-if="loading">Logging in...</span>
          <span v-else>Login</span>
        </button>
        <div v-if="loginError" class="text-red-400 text-sm">{{ loginError }}</div>
      </form>
    </div>
  </div>
</template>

<script setup>
const { login } = useDirectusAuth()
const router = useRouter()
const user = useDirectusUser()

const loading = ref(false)
const loginError = ref(null)

const formState = ref({
  email: '',
  password: ''
})

const onSubmit = async () => {
  loading.value = true
  loginError.value = null
  try {
    await login({
      email: formState.value.email,
      password: formState.value.password
    })
    router.push('/dashboard')
  } catch (e) {
    loginError.value = 'Invalid email or password'
  } finally {
    loading.value = false
  }
}

watchEffect(() => {
  if (user.value) {
    router.push('/dashboard')
  }
})
</script>
