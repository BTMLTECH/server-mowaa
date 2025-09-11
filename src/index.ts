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
app.use(cors());
app.use(bodyParser.json());

// ✅ MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/btm_payjeje";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    process.exit(1); // stop server if DB not connected
  });

// ✅ API routes
app.get("/api/exchange-rate", exchangeRate);
app.post("/api/initiate-payment", initiatePayment);
app.get("/api/payment/callback", paymentCallback);
app.get("/api/verify-payment", verifyPayment);

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
