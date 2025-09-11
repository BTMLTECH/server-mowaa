

import { Request, Response } from "express";
import axios from "axios";
import Payment from "../model/Payment";
import { sendEmail } from "../util/emailUtil";
import crypto from "crypto";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL;
const PAYSTACK_SECRET_KEY = (process.env.PAYSTACK_SECRET_KEY || "").trim();


export const exchangeRate = async (req: Request, res: Response) => {
  try {
    const rate = Number(process.env.EXCHANGE_RATE);

    if (!rate || isNaN(rate)) {
      throw new Error("Invalid exchange rate in environment variables");
    }

    res.json({ rate });
  } catch (error: any) {

    res.status(500).json({ message: "Failed to fetch exchange rate" });
  }
};



export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { formData, cartItems, totalAmount, currency } = req.body;

    if (!formData?.personalInfo?.email || !formData?.personalInfo?.name) {
      return res.status(400).json({ error: "Customer email and name are required" });
    }

    let paystackAmount: number;

    if (currency === "USD") {
      paystackAmount = Math.round(totalAmount * 100); 
    } else {
      paystackAmount = Math.round(totalAmount * 100); 
    }

    const email = formData.personalInfo.email;
    const name = formData.personalInfo.name;

    // 🔹 Initialize Paystack transaction
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: paystackAmount,
        currency: currency || "NGN",
        metadata: { name },
        callback_url: `${process.env.BACKEND_URL}/api/payment/callback`,
        // callback_url: 'http://localhost:5000/api/payment/callback',
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { authorization_url, reference } = response.data.data;

  
    await Payment.create({
      reference,
      formData,
      cartItems,
      totalAmount, 
      currency: currency || "NGN",
      status: "pending",
    });


    res.json({ url: authorization_url, reference });
  } catch (error: any) {
    res.status(500).json({ error: "Payment initialization failed" });
  }
};


export const paymentCallback = async (req: Request, res: Response) => {

  try {
    let reference = req.query.reference || req.query.trxref;

    if (Array.isArray(reference)) reference = reference[0];
    if (!reference || typeof reference !== "string") {
      return res.redirect(`${FRONTEND_URL}/payment/failed`);
    }


    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    );

    const data = response.data.data;
    const payment = await Payment.findOne({ reference });

    if (!payment) {
      return res.redirect(`${FRONTEND_URL}/payment/failed`);
    }

    if (data.status === "success") {
      payment.status = "success";
      await payment.save();

        const { formData, cartItems, totalAmount, currency } = payment;

 
      await sendEmail(
        `${process.env.ADMIN_EMAIL}`,
        "New Form Submission - MOWAA",
        "formSubmission.ejs",
        { formData, cartItems, totalAmount, currency  }
      );

    
      await sendEmail(
        formData.personalInfo.email,
        "Your MOWAA Booking Confirmation",
        "userConfirmation.ejs",
        { formData, cartItems, totalAmount, currency}
      );

      return res.redirect(
        `${FRONTEND_URL}/payment/success?reference=${reference}`
        // `http://localhost:8080/payment/success?reference=${reference}`
      );
    }

    payment.status = "failed";
    await payment.save();

    return res.redirect(
      `${FRONTEND_URL}/payment/failed?reference=${reference}`
    );
  } catch (error: any) {
    return res.redirect(`${FRONTEND_URL}/payment/failed`);
  }
};


export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { reference } = req.query;
    if (!reference || typeof reference !== "string") {
      return res.status(400).json({ error: "Reference is required" });
    }

    const payment = await Payment.findOne({ reference });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }


    if (payment.status === "pending") {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        }
      );

      const data = response.data.data;
      if (data.status === "success") {
        payment.status = "success";
      } else if (data.status === "failed") {
        payment.status = "failed";
      }
      await payment.save();
    }

    res.json({ success: true, payment });
  } catch (error: any) {
    res.status(500).json({ error: "Payment verification failed" });
  }
};

// controllers/formController.ts


export const paystackWebhook = async (req: Request, res: Response) => {
  try {
    // ✅ Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.sendStatus(401); // Invalid request
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const reference = event.data.reference;

      const payment = await Payment.findOne({ reference });
      if (payment) {
        payment.status = "success";
        await payment.save();

        const { formData, cartItems, totalAmount, currency } = payment;

        // Send emails
        await sendEmail(
          process.env.ADMIN_EMAIL!,
          "New Form Submission - MOWAA",
          "formSubmission.ejs",
          { formData, cartItems, totalAmount, currency }
        );

        await sendEmail(
          formData.personalInfo.email,
          "Your MOWAA Booking Confirmation",
          "userConfirmation.ejs",
          { formData, cartItems, totalAmount, currency }
        );
      }
    }

    if (event.event === "charge.failed") {
      const reference = event.data.reference;
      const payment = await Payment.findOne({ reference });
      if (payment) {
        payment.status = "failed";
        await payment.save();
      }
    }

    res.sendStatus(200); // ✅ Always return 200 to Paystack
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(500);
  }
};


// export const verifyPayment = async (req: Request, res: Response) => {
//   try {
//     const { reference } = req.query;
//     if (!reference || typeof reference !== "string") {
//       return res.status(400).json({ error: "Reference is required" });
//     }

//     // Find payment record
//     const payment = await Payment.findOne({ reference });
//     if (!payment) {
//       return res.status(404).json({ error: "Payment not found" });
//     }

//     // Only verify if still pending
//     if (payment.status === "pending") {
//       const response = await axios.get(
//         `https://api.paystack.co/transaction/verify/${reference}`,
//         {
//           headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
//         }
//       );

//       const data = response.data.data;

//       if (data.status === "success") {
//         payment.status = "success";
//         await payment.save();

//         const { formData, cartItems, totalAmount, currency } = payment;

//         // ✅ Send email to Admin
//         await sendEmail(
//           process.env.ADMIN_EMAIL!,
//           "New Form Submission - MOWAA",
//           "formSubmission.ejs",
//           { formData, cartItems, totalAmount, currency }
//         );

//         // ✅ Send confirmation to Customer
//         await sendEmail(
//           formData.personalInfo.email,
//           "Your MOWAA Booking Confirmation",
//           "userConfirmation.ejs",
//           { formData, cartItems, totalAmount, currency }
//         );

//         return res.json({ success: true, status: "success", payment });
//       } else {
//         payment.status = "failed";
//         await payment.save();
//         return res.json({ success: false, status: "failed", payment });
//       }
//     }

//     // Already processed (success/failed), just return current status
//     res.json({ success: true, status: payment.status, payment });
//   } catch (error) {
//     console.error("Verify Payment Error:", error);
//     res.status(500).json({ error: "Payment verification failed" });
//   }
// };
