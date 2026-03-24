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

export async function sendAccessRequestEmails({
  requesterEmail,
  adminEmails,
}: {
  requesterEmail: string
  adminEmails: string[]
}) {
  if (!env.RESEND_API_KEY) {
    console.log(
      `[Access Request] No RESEND_API_KEY set. ${requesterEmail} requested access. Admins: ${adminEmails.join(', ')}`,
    )
    return
  }

  const resend = getResend()

  if (adminEmails.length > 0) {
    const { error } = await resend.emails.send({
      from: env.RESEND_FROM,
      to: adminEmails,
      subject: 'New access request on Ryde',
      html: `
        <p><strong>${requesterEmail}</strong> has requested access to Ryde.</p>
        <p>Go to the admin panel to approve or reject this request.</p>
      `,
    })
    if (error) console.error('[Resend] Failed to send admin notification:', error)
  }

  const { error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to: requesterEmail,
    subject: 'Your Ryde access request has been received',
    html: `
      <p>Your access request is being reviewed by the team.</p>
      <p>You will receive an email once your account has been approved.</p>
    `,
  })
  if (error) console.error('[Resend] Failed to send requester confirmation:', error)
}

export async function sendAccessApprovedEmail({ to, joinLink }: { to: string; joinLink: string }) {
  if (!env.RESEND_API_KEY) {
    console.log(`[Access Approved] No RESEND_API_KEY set. Join link for ${to}: ${joinLink}`)
    return
  }

  const resend = getResend()
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to,
    subject: 'Your Ryde access has been approved',
    html: `
      <p>Your access to Ryde has been approved!</p>
      <p><a href="${joinLink}">Click here to set your password and activate your account</a></p>
    `,
  })
  if (error) console.error('[Resend] Failed to send access approved email:', error)
}
