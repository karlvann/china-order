import { AUSBEDS_EMAIL_DOMAIN, ALLOWED_USER_EMAILS } from '~/lib/constants/index.js'

const AUTH_ERROR_CODES = [
  'INVALID_TOKEN',
  'TOKEN_EXPIRED',
  'INVALID_CREDENTIALS',
  'INVALID_REFRESH_TOKEN',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_INVALID',
  'FAILED_AUTHENTICATION'
]

const getDirectusErrorList = (error) => {
  const errorLists = [
    error?.errors,
    error?.data?.errors,
    error?.response?._data?.errors,
    error?.response?.data?.errors
  ]

  return errorLists.find(items => Array.isArray(items)) || []
}

const getDirectusStatusCode = (error) => {
  const status = error?.statusCode
    || error?.status
    || error?.data?.statusCode
    || error?.response?.status
    || error?.response?._data?.statusCode
    || error?.response?.data?.statusCode

  return Number(status) || null
}

const getDirectusErrorCodes = (error) => {
  return getDirectusErrorList(error)
    .map(item => item?.extensions?.code || item?.code)
    .filter(Boolean)
    .map(code => String(code).toUpperCase())
}

const getDirectusErrorMessage = (error, fallback = 'Directus request failed') => {
  const directusErrors = getDirectusErrorList(error)

  if (directusErrors.length > 0) {
    const messages = directusErrors.map(item => item?.message).filter(Boolean)
    if (messages.length > 0) return messages.join(', ')
  }

  return error?.data?.message
    || error?.response?._data?.message
    || error?.response?.data?.message
    || error?.statusMessage
    || error?.message
    || fallback
}

const getUserEmail = (value) => {
  if (typeof value === 'string') return value.trim().toLowerCase()

  return String(value?.email || '').trim().toLowerCase()
}

export const useDirectusSession = () => {
  const user = useDirectusUser()
  const { token, refreshToken, expires, token_expired } = useDirectusToken()

  const isAusbedsUserEmail = (value) => {
    return getUserEmail(value).endsWith(AUSBEDS_EMAIL_DOMAIN)
  }

  const isAllowedUserEmail = (value) => {
    return ALLOWED_USER_EMAILS.includes(getUserEmail(value))
  }

  const isAllowedUser = (value = user.value) => {
    return isAllowedUserEmail(value)
  }

  const clearDirectusSession = () => {
    token.value = null
    refreshToken.value = null
    expires.value = null
    user.value = null
  }

  const isDirectusAuthError = (error) => {
    const statusCode = getDirectusStatusCode(error)

    if (statusCode === 401) return true

    const codes = getDirectusErrorCodes(error)
    if (codes.some(code => AUTH_ERROR_CODES.includes(code))) return true

    const message = String(getDirectusErrorMessage(error, '')).toLowerCase()
    const hasTokenError = message.includes('token')
      && (message.includes('expired') || message.includes('invalid') || message.includes('malformed'))

    if (hasTokenError) return true

    return statusCode === 403 && token_expired.value
  }

  const handleDirectusAuthError = async (error) => {
    if (!isDirectusAuthError(error)) return false

    clearDirectusSession()
    await navigateTo({
      path: '/',
      query: {
        session: 'expired'
      }
    })

    return true
  }

  return {
    clearDirectusSession,
    isAllowedUser,
    isAllowedUserEmail,
    isAusbedsUserEmail,
    isDirectusAuthError,
    handleDirectusAuthError,
    getDirectusErrorMessage,
    getDirectusStatusCode
  }
}
