export default defineNuxtRouteMiddleware(async (to) => {
  const user = useDirectusUser()
  const router = useRouter()

  if (!user.value) {
    return router.push('/')
  }
})
