import { Request, Response } from "express";
import axios from "axios";
import Payment from "../model/Payment";
import { sendEmail } from "../util/emailUtil";
import { uploadToCloudinary } from "../util/cloudinary";

const FRONTEND_URL = process.env.FRONTEND_URL;
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
    const parsedData = JSON.parse(req.body.data);
    const { formData, cartItems, totalAmount, currency } = parsedData;

    if (!formData?.personalInfo?.email || !formData?.personalInfo?.name) {
      return res
        .status(400)
        .json({ error: "Customer email and name are required" });
    }

    const uploadedFiles: Record<string, string> = {};
    if (req.files && typeof req.files === "object") {
      for (const [fieldName, fileArray] of Object.entries(req.files)) {
        const file = (fileArray as Express.Multer.File[])[0];
        if (file) {
          const ext = file.originalname.split(".").pop()?.toLowerCase();

          const uploadResult = await uploadToCloudinary(
            file.buffer,
            `visa/${formData.personalInfo.name}`,
            file.mimetype.startsWith("image") ? "image" : "raw",
            `${fieldName}_${formData.personalInfo.name}_${Date.now()}`,
            ext
          );

          uploadedFiles[fieldName] = uploadResult.secure_url;
        }
      }
    }

    formData.entryIntoNigeria = {
      ...formData.entryIntoNigeria,
      ...uploadedFiles,
    };

    // 4️⃣ Calculate Paystack amount
    const paystackAmount = Math.round(totalAmount * 100);

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: formData.personalInfo.email,
        amount: paystackAmount,
        currency: currency || "NGN",
        metadata: { name: formData.personalInfo.name },
        callback_url: `${process.env.BACKEND_URL}/api/payment/callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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

      const { formData, cartItems, totalAmount, currency } = payment.toObject();

      // ✅ send admin email
      const adminEmailResult = await sendEmail(
        process.env.ADMIN_EMAIL!,
        "New Form Submission - MOWAA",
        "formSubmission.ejs",
        { formData, cartItems, totalAmount, currency }
      );

      if (!adminEmailResult) {
        console.error("⚠️ Failed to send admin notification email.");
      }

      // ✅ send user confirmation email
      const userEmailResult = await sendEmail(
        formData.personalInfo.email,
        "Your MOWAA Booking Confirmation",
        "userConfirmation.ejs",
        { formData, cartItems, totalAmount, currency }
      );

      if (!userEmailResult) {
        console.error(
          `⚠️ Failed to send confirmation email to ${formData.personalInfo.email}`
        );
      }

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
    console.error("❌ Payment callback error:", error);
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
