"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.paymentCallback = exports.initiatePayment = exports.exchangeRate = void 0;
const axios_1 = __importDefault(require("axios"));
const Payment_1 = __importDefault(require("../model/Payment"));
const emailUtil_1 = require("../util/emailUtil");
const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL;
const PAYSTACK_SECRET_KEY = (process.env.PAYSTACK_SECRET_KEY || "").trim();
const exchangeRate = async (req, res) => {
    try {
        const rate = Number(process.env.EXCHANGE_RATE);
        if (!rate || isNaN(rate)) {
            throw new Error("Invalid exchange rate in environment variables");
        }
        res.json({ rate });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch exchange rate" });
    }
};
exports.exchangeRate = exchangeRate;
const initiatePayment = async (req, res) => {
    try {
        const { formData, cartItems, totalAmount, currency } = req.body;
        if (!formData?.personalInfo?.email || !formData?.personalInfo?.name) {
            return res.status(400).json({ error: "Customer email and name are required" });
        }
        let paystackAmount;
        if (currency === "USD") {
            paystackAmount = Math.round(totalAmount * 100);
        }
        else {
            paystackAmount = Math.round(totalAmount * 100);
        }
        const email = formData.personalInfo.email;
        const name = formData.personalInfo.name;
        // 🔹 Initialize Paystack transaction
        const response = await axios_1.default.post("https://api.paystack.co/transaction/initialize", {
            email,
            amount: paystackAmount,
            currency: currency || "NGN",
            metadata: { name },
            callback_url: `${BACKEND_URL}/api/payment/callback`,
        }, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });
        console.log("respons", response);
        const { authorization_url, reference } = response.data.data;
        await Payment_1.default.create({
            reference,
            formData,
            cartItems,
            totalAmount,
            currency: currency || "NGN",
            status: "pending",
        });
        res.json({ url: authorization_url, reference });
    }
    catch (error) {
        res.status(500).json({ error: "Payment initialization failed" });
    }
};
exports.initiatePayment = initiatePayment;
const paymentCallback = async (req, res) => {
    try {
        let reference = req.query.reference || req.query.trxref;
        if (Array.isArray(reference))
            reference = reference[0];
        if (!reference || typeof reference !== "string") {
            return res.redirect(`${FRONTEND_URL}/payment/failed`);
        }
        const response = await axios_1.default.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        });
        const data = response.data.data;
        const payment = await Payment_1.default.findOne({ reference });
        if (!payment) {
            return res.redirect(`${FRONTEND_URL}/payment/failed`);
        }
        if (data.status === "success") {
            payment.status = "success";
            await payment.save();
            const { formData, cartItems, totalAmount, currency } = payment;
            await (0, emailUtil_1.sendEmail)(`${process.env.ADMIN_EMAIL}`, "New Form Submission - MOWAA", "formSubmission.ejs", { formData, cartItems, totalAmount, currency });
            await (0, emailUtil_1.sendEmail)(formData.personalInfo.email, "Your MOWAA Booking Confirmation", "userConfirmation.ejs", { formData, cartItems, totalAmount, currency });
            return res.redirect(`${FRONTEND_URL}/payment/success?reference=${reference}`
            // `http://localhost:8080/payment/success?reference=${reference}`
            );
        }
        payment.status = "failed";
        await payment.save();
        return res.redirect(`${FRONTEND_URL}/payment/failed?reference=${reference}`);
    }
    catch (error) {
        return res.redirect(`${FRONTEND_URL}/payment/failed`);
    }
};
exports.paymentCallback = paymentCallback;
const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.query;
        if (!reference || typeof reference !== "string") {
            return res.status(400).json({ error: "Reference is required" });
        }
        const payment = await Payment_1.default.findOne({ reference });
        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }
        if (payment.status === "pending") {
            const response = await axios_1.default.get(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
            });
            const data = response.data.data;
            if (data.status === "success") {
                payment.status = "success";
            }
            else if (data.status === "failed") {
                payment.status = "failed";
            }
            await payment.save();
        }
        res.json({ success: true, payment });
    }
    catch (error) {
        res.status(500).json({ error: "Payment verification failed" });
    }
};
exports.verifyPayment = verifyPayment;
