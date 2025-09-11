import cluster from "cluster";
import os from "os";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { exchangeRate, initiatePayment, paymentCallback, paystackWebhook, verifyPayment } from "./controllers/formController";
const app = express();


dotenv.config();
app.use(express.json());
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = express();

  // ✅ Allowed CORS origins
  const allowedOrigins = [
      process.env.FRONTEND_URL
    // "http://localhost:8080",
    // "http://localhost:8082"
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"), false);
        }
      },
      credentials: true,
    })
  );

  app.use(bodyParser.json());

  // ✅ MongoDB connection
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/btm_payjeje";
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => {
      console.error("MongoDB connection error:", err);
      process.exit(1);
    });

  // ✅ API routes
  app.get("/api/exchange-rate", exchangeRate);
  app.post("/api/initiate-payment", initiatePayment);
  app.post("/api/payment/webhook", express.json(), paystackWebhook);
  app.get("/api/payment/callback", paymentCallback);
  app.get("/api/verify-payment", verifyPayment);

  // ✅ Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} started, listening on port ${PORT}`);
  });
}
