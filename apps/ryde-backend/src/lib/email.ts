import { Resend } from 'resend'
import { env } from './utils/env'

function getResend() {
  return new Resend(env.RESEND_API_KEY)
}

export async function sendPasswordResetEmail({ to, resetLink }: { to: string; resetLink: string }) {
  if (!env.RESEND_API_KEY) {
    console.log(`[Password Reset] No RESEND_API_KEY set. Reset link for ${to}: ${resetLink}`)
    return
  }

  const resend = getResend()
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to,
    subject: 'Reset your Ryde password',
    html: `
      <p>You requested a password reset for your Ryde account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `,
  })

  if (error) {
    console.error('[Resend] Failed to send password reset email:', error)
    throw new Error(error.message)
  }
}
