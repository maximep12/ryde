export const getLastPathElement = (pathname: string): string => {
  const pathElements = pathname.split('/').filter((element) => element !== '')
  return pathElements[pathElements.length - 1] || ''
}
