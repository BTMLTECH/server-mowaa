

import nodemailer, { Transporter } from "nodemailer";
import ejs from "ejs";
import path from "path";
require("dotenv").config();

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

export const sendMailToUser = async (
  options: EmailOptions
): Promise<{ accepted: string[]; rejected: string[] }> => {
  const { data, email, subject, template } = options;

  try {
    // Build transporterz
    const transporter: Transporter = nodemailer.createTransport({
      host: process.env.SMPT_HOST,
      port: parseInt(process.env.SMPT_PORT || "587"),
      secure: false,
      service: process.env.SMPT_SERVICE,
      auth: {
        user: process.env.SMPT_MAIL,
        pass: process.env.SMPT_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: true,
      debug: true,
    });


    // Render template
    const templatePath = path.join(__dirname, "../mail", template);

    const html = await ejs.renderFile(templatePath, data);

    const fromEmail = process.env.SMPT_MAIL;
    const displayName = data?.companyName || "MOWAA";

    const mailOptions = {
      from: `"${displayName}" <${fromEmail}>`,
      to: email,
      cc: data?.cc || undefined, 
      subject,
      html,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    return {
      accepted: info.accepted || [],
      rejected: info.rejected || [],
    };
  } catch (error) {
    return {
      accepted: [],
      rejected: [email],
    };
  }
};

export default sendMailToUser;


