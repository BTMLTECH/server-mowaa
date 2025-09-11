

import { Request, Response } from "express";
import axios from "axios";
import Payment from "../model/Payment";
import { sendEmail } from "../util/emailUtil";

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
        callback_url: 'https://server-mowaa.onrender.com/api/payment/callback'
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
