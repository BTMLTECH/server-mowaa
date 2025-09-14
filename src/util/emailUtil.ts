// import ejs from 'ejs';
// import path from 'path';
// import sendMailToUser from './emailSender';


// export const sendEmail = async (
//   email: string,
//   subject: string,
//   template: string,
//   data: object
// ): Promise<boolean> => { 
//   try {
//     const emailContent = await ejs.renderFile(
//       path.join(__dirname, `../mail/${template}`), 
//       data
//     );

//     const emailResponse = await sendMailToUser({
//       email,
//       subject,
//       template, 
//       data, 
//     })
//     if (emailResponse.accepted.length > 0) {

//       return true;  
//     } else {
//       return false; 
//     }
//   } catch (error) {
//     return false; 
//   }
// };



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
    // Optional: render the template for logging/debug
    const templatePath = path.join(__dirname, "../mail", template);
    const emailContent = await ejs.renderFile(templatePath, data);

    const response = await sendMailToUser({ email, subject, template, data });

    if (response.accepted.length > 0) {
      console.log("Email successfully accepted by SMTP server:", response.accepted);
      return true;
    } else {
      console.warn("Email rejected:", response.rejected);
      return false;
    }
  } catch (error) {
    console.error("Error in sendEmail wrapper:", error);
    return false;
  }
};

