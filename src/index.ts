
import cluster from "cluster";
import os from "os";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { exchangeRate, initiatePayment, paymentCallback, verifyPayment } from "./controllers/formController";
import visaUpload from "./util/visaUpload";

dotenv.config();

const numCPUs = os.cpus().length;

if (cluster.isMaster) {

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    cluster.fork();
  });
} else {
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


  const MONGO_URI = process.env.MONGO_URI || "";
  mongoose.connect(MONGO_URI)
    .then(() => {})
    .catch(err => {
      process.exit(1);
    });

  // ✅ API routes
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

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
       console.log(`Worker ${process.pid} listening on port ${PORT}`);
  });
}
