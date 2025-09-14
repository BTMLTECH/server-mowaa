// sendEmail.ts
import ejs from "ejs";
import path from "path";
import sendMailToUser from "./emailSender";

export const sendEmail = async (
  email: string,
  subject: string,
  template: string,
  data: object
): Promise<boolean> => {
  try {
    // Compile template for logging/debugging (optional)
    const templatePath = path.join(__dirname, `../mail/${template}`);
    console.log("Template path:", templatePath);

    const emailContent = await ejs.renderFile(templatePath, data);
    console.log("Rendered email content length:", emailContent.length);

    // Send email
    const emailResponse = await sendMailToUser({
      email,
      subject,
      template,
      data,
    });

    return emailResponse.accepted.length > 0;
  } catch (error) {
    console.error("Error in sendEmail:", error);
    return false;
  }
};
