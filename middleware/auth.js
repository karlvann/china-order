export default defineNuxtRouteMiddleware(async () => {
  const user = useDirectusUser()
  const { fetchUser } = useDirectusAuth()
  const { token, refreshToken, token_expired, checkAutoRefresh } = useDirectusToken()
  const { clearDirectusSession } = useDirectusSession()

  const hadSession = !!token.value || !!refreshToken.value || !!user.value

  await checkAutoRefresh()

  if (token.value && !token_expired.value && !user.value) {
    await fetchUser()
  }

  if (token.value && !token_expired.value && user.value) return

  clearDirectusSession()

  return navigateTo(hadSession
    ? {
        path: '/',
        query: {
          session: 'expired'
        }
      }
    : '/'
  )
})
