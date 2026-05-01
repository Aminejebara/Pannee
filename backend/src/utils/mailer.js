import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  }
})

export const sendOTPEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from:    `"PANNE" <${process.env.MAIL_USER}>`,
    to:      toEmail,
    subject: "Votre code de vérification PANNE",
    html: `
      <div style="font-family: Arial; max-width: 400px; margin: auto; padding: 20px;">
        <h2 style="color: #4F46E5;">PANNE 👋</h2>
        <p>Votre code de vérification est :</p>
        <h1 style="
          letter-spacing: 8px; 
          color: #4F46E5;
          font-size: 36px;
          text-align: center;
          padding: 20px;
          background: #F3F4F6;
          border-radius: 8px;
        ">${otp}</h1>
        <p>Ce code expire dans <strong>10 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">
          Si vous n'avez pas demandé ce code, ignorez cet email.
        </p>
      </div>
    `
  })
}