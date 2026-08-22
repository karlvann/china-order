export default defineNuxtRouteMiddleware(async () => {
  const user = useDirectusUser()
  const { fetchUser } = useDirectusAuth()
  const { token, refreshToken, token_expired, checkAutoRefresh } = useDirectusToken()
  const { clearDirectusSession, isAllowedUser } = useDirectusSession()

  const hadSession = !!token.value || !!refreshToken.value || !!user.value

  await checkAutoRefresh()

  if (token.value && !token_expired.value && !user.value) {
    await fetchUser()
  }

  if (token.value && !token_expired.value && user.value) {
    if (isAllowedUser()) return

    clearDirectusSession()
    return navigateTo({
      path: '/',
      query: {
        session: 'unauthorized'
      }
    })
  }

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
