export function getUserFullname(user: {
  givenName: string | null
  familyName: string | null
  fallbackName: string | null
}) {
  const { givenName, familyName, fallbackName } = user

  if (!givenName && !familyName) return fallbackName || 'Unknown'
  return `${givenName} ${familyName}`
}

export function getUserGivenName(user: { givenName: string | null; fallbackName: string | null }) {
  const { givenName, fallbackName } = user

  if (givenName) return givenName
  return fallbackName?.split(' ')[0]
}
