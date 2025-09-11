import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { 
  exchangeRate, 
  initiatePayment, 
  paymentCallback, 
  verifyPayment 
} from "./controllers/formController";

dotenv.config();

const app = express();

// ✅ CORS: allow only your frontend
const FRONTEND_URL = process.env.FRONTEND_URL || "https://mowaa.onrender.com";
app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

app.use(bodyParser.json());

// ✅ MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/btm_payjeje";

mongoose.connect(MONGO_URI)
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // stop server if DB not connected
  });

// ✅ API routes
app.get("/api/exchange-rate", exchangeRate);
app.post("/api/initiate-payment", initiatePayment);
// app.get("/api/payment/callback", paymentCallback);
app.get("/api/verify-payment", verifyPayment);

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, (err?: any) => {
  if (err) {
    console.error("Server failed to start:", err);
    process.exit(1);
  }
});
