export function formatError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack || 'No stack trace available' }
  }

  return {
    message: typeof error === 'string' ? error : 'An unknown error occurred',
    stack: 'No stack trace available',
  }
}
