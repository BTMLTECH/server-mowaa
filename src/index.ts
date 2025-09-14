import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { exchangeRate, initiatePayment, paymentCallback, verifyPayment } from "./controllers/formController";
import visaUpload from "./util/visaUpload";

dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
  })
);

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "";
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Routes
app.get("/api/exchange-rate", exchangeRate);

app.post(
  "/api/initiate-payment",
  visaUpload.fields([
    { name: "passportScan", maxCount: 1 },
    { name: "passportPhoto", maxCount: 1 },
    { name: "flightProof", maxCount: 1 },
  ]),
  initiatePayment
);

app.use("/api/payment", bodyParser.json());
app.get("/api/payment/callback", paymentCallback);
app.get("/api/verify-payment", verifyPayment);

// ✅ PORT binding
const PORT = parseInt(process.env.PORT || "5000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
