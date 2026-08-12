import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    const host = process.env.EMAIL_HOST || 'smtp.gmail.com'
    const port = Number(process.env.EMAIL_PORT) || 465
    const user = process.env.EMAIL_USER
    const pass = process.env.EMAIL_PASS

    if (!user || !pass) {
      console.warn('Email credentials missing, skipping welcome email sending to: ', email)
      return NextResponse.json({ success: true, mocked: true })
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    })

    const mailOptions = {
      from: `"Kynetic" <${user}>`,
      to: email,
      subject: 'Welcome to Kynetic',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2>Welcome to your AI Fitness Coach</h2>
          <p>We've successfully set up your profile and generated your baseline avatar.</p>
          <p>Get ready for adaptive workouts and real-time computer vision rep counting!</p>
          <br/>
          <p>The Kynetic Team</p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to send welcome email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
