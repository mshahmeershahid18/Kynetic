import nodemailer from 'nodemailer'

/**
 * Transactional email.
 *
 * Credentials are read from EMAIL_* first, falling back to the GMAIL_* names
 * used in .env.example, so either naming works. With no credentials configured
 * the message is logged instead of sent, which keeps local development usable
 * without a mail account.
 */

type Credentials = {
  host: string
  port: number
  user: string
  pass: string
}

function readCredentials(): Credentials | null {
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null

  return {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 465,
    user,
    pass,
  }
}

async function deliver(to: string, subject: string, html: string) {
  const credentials = readCredentials()

  if (!credentials) {
    console.warn(`[email skipped — no credentials configured] to=${to} subject="${subject}"`)
    return
  }

  const transporter = nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.port === 465,
    auth: { user: credentials.user, pass: credentials.pass },
  })

  try {
    await transporter.sendMail({
      from: `"Kynetic" <${credentials.user}>`,
      to,
      subject,
      html,
    })
  } catch (error) {
    // Email is never load-bearing: log and let the caller continue.
    console.error(`Failed to send "${subject}" to ${to}:`, error)
  }
}

function layout(heading: string, body: string) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#18181b;">
      <p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#71717a;margin:0 0 8px;">Kynetic</p>
      <h1 style="font-size:22px;margin:0 0 16px;">${heading}</h1>
      ${body}
      <p style="margin-top:32px;font-size:13px;color:#71717a;">— The Kynetic team</p>
    </div>
  `
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${label}</a>
  </p>`
}

export async function sendAuthEmail(
  to: string,
  type: 'signup' | 'recovery' | 'email_change',
  actionLink: string
) {
  if (type === 'email_change') {
    await deliver(
      to,
      'Confirm your new Kynetic email address',
      layout(
        'Confirm your new email',
        `<p style="line-height:1.6;">Confirm this address to finish moving your Kynetic account to it. Until you do, your old address stays in use.</p>
         ${button(actionLink, 'Confirm new email')}
         <p style="font-size:13px;color:#71717a;line-height:1.6;">If you did not request this change, you can ignore this email.</p>`
      )
    )
    return
  }

  if (type === 'signup') {
    await deliver(
      to,
      'Confirm your Kynetic account',
      layout(
        'Confirm your account',
        `<p style="line-height:1.6;">Confirm your email address to finish creating your Kynetic account.</p>
         ${button(actionLink, 'Confirm account')}
         <p style="font-size:13px;color:#71717a;line-height:1.6;">If you did not sign up for Kynetic, you can ignore this email.</p>`
      )
    )
    return
  }

  await deliver(
    to,
    'Reset your Kynetic password',
    layout(
      'Reset your password',
      `<p style="line-height:1.6;">Use the link below to choose a new password.</p>
       ${button(actionLink, 'Reset password')}
       <p style="font-size:13px;color:#71717a;line-height:1.6;">If you did not request this, you can safely ignore this email — your password will not change.</p>`
    )
  )
}

export async function sendWelcomeEmail(to: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  await deliver(
    to,
    'Welcome to Kynetic',
    layout(
      'Your profile is ready',
      `<p style="line-height:1.6;">We have built your training profile and generated your 3D avatar from your body metrics and experience level.</p>
       <p style="line-height:1.6;">Generate your first workout and Kynetic will adapt every session that follows to how the last ones actually went.</p>
       ${button(`${siteUrl}/dashboard`, 'Open your dashboard')}`
    )
  )
}
