"use strict";
// import nodemailer, { Transporter } from "nodemailer";
// import ejs from "ejs";
// import path from "path";
// require("dotenv").config();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMailToUser = void 0;
// interface EmailOptions {
//   email: string;
//   subject: string;
//   template: string;
//   data: { [key: string]: any };
// }
// export const sendMailToUser = async (options: EmailOptions): Promise<{ accepted: string[], rejected: string[] }> => {
//   const transporter: Transporter = nodemailer.createTransport({
//     host: process.env.SMPT_HOST,
//     port: parseInt(process.env.SMPT_PORT || "587"),
//     secure: false,
//     service: process.env.SMPT_SERVICE,
//     auth: {
//       user: process.env.SMPT_MAIL,
//       pass: process.env.SMPT_PASSWORD,
//     },
//     tls: {
//       rejectUnauthorized: false,
//     },
//      logger: true,
//      debug: true
//   });
//   const { data, email, subject, template } = options;
//   const templatePath = path.join(__dirname, "../mail", template);
//   const html = await ejs.renderFile(templatePath, data);
//   const fromEmail = process.env.SMPT_MAIL; 
//   const displayName = data?.companyName; 
//   const mailOptions = {
//     from: `"${displayName}" <${fromEmail}>`,  
//     to: email,
//     subject,
//     html,
//   };
//   try {
//     const info = await transporter.sendMail(mailOptions);
//     return {
//       accepted: info.accepted || [],
//       rejected: info.rejected || [],
//     };
//   } catch (error) {
//   return {
//     accepted: [],
//     rejected: [email],
//   };
// }
// };
// export default sendMailToUser;
const nodemailer_1 = __importDefault(require("nodemailer"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
require("dotenv").config();
const sendMailToUser = async (options) => {
    const { data, email, subject, template } = options;
    try {
        // Build transporter
        const transporter = nodemailer_1.default.createTransport({
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
        const templatePath = path_1.default.join(__dirname, "../mail", template);
        const html = await ejs_1.default.renderFile(templatePath, data);
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
    }
    catch (error) {
        return {
            accepted: [],
            rejected: [email],
        };
    }
};
exports.sendMailToUser = sendMailToUser;
exports.default = exports.sendMailToUser;
