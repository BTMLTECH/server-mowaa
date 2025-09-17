// sendEmail.ts
import ejs from "ejs";
import path from "path";
import sendMailToUser from "./emailSender";

export const sendEmail = async (
  email: string,
  subject: string,
  template: string,
  data: object,
  maxRetries: number = 3, // number of attempts
  delayMs: number = 2000 // wait 2 seconds between retries
): Promise<boolean> => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Compile template for logging/debugging (optional)
      const templatePath = path.join(__dirname, `../mail/${template}`);
      console.log("Template path:", templatePath);

      const emailContent = await ejs.renderFile(templatePath, data);
      console.log(
        `Rendered email content length: ${emailContent.length} (Attempt ${
          attempt + 1
        }/${maxRetries})`
      );

      // Send email
      const emailResponse = await sendMailToUser({
        email,
        subject,
        template,
        data,
      });

      if (emailResponse.accepted.length > 0) {
        console.log("✅ Email successfully sent");
        return true;
      } else {
        throw new Error("Email rejected by server.");
      }
    } catch (error) {
      console.error(
        `⚠️ Attempt ${attempt + 1} failed:`,
        (error as Error).message
      );
      attempt++;

      if (attempt < maxRetries) {
        console.log(`🔄 Retrying in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error("❌ All email attempts failed.");
        return false;
      }
    }
  }

  return false;
};
