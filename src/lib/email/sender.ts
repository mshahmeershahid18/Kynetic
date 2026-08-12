import nodemailer from 'nodemailer'

export async function sendAuthEmail(to: string, type: 'signup' | 'recovery', actionLink: string) {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com'
  const port = Number(process.env.EMAIL_PORT) || 465
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    console.warn(`\n=== [Mock Email Sent] ===\nTo: ${to}\nType: ${type}\nAction Link: ${actionLink}\n=========================\n`)
    return
  }

  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass }
  })

  const subject = type === 'signup' ? 'Confirm your Kynetic Account' : 'Reset your Kynetic Password'
  const html = type === 'signup'
    ? `<div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
         <h2>Welcome to Kynetic!</h2>
         <p>Click <a href="${actionLink}">here</a> to confirm your account.</p>
       </div>`
    : `<div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
         <h2>Reset Password</h2>
         <p>Click <a href="${actionLink}">here</a> to reset your Kynetic password.</p>
       </div>`

  try {
    await transporter.sendMail({
      from: `"Kynetic" <${user}>`,
      to, subject, html
    })
  } catch (error) {
    console.error('Failed to send auth email:', error)
  }
}
