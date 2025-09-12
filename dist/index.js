"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cluster_1 = __importDefault(require("cluster"));
const os_1 = __importDefault(require("os"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const formController_1 = require("./controllers/formController");
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use(express_1.default.json());
const numCPUs = os_1.default.cpus().length;
if (cluster_1.default.isMaster) {
    console.log(`Master ${process.pid} is running`);
    // Fork workers for each CPU core
    for (let i = 0; i < numCPUs; i++) {
        cluster_1.default.fork();
    }
    cluster_1.default.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster_1.default.fork();
    });
}
else {
    const app = (0, express_1.default)();
    // ✅ Allowed CORS origins
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        "http://localhost:8080",
    ];
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            }
            else {
                callback(new Error("Not allowed by CORS"), false);
            }
        },
        credentials: true,
    }));
    app.use(body_parser_1.default.json());
    // ✅ MongoDB connection
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/btm_payjeje";
    mongoose_1.default.connect(MONGO_URI)
        .then(() => console.log("MongoDB connected"))
        .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });
    // ✅ API routes
    app.get("/api/exchange-rate", formController_1.exchangeRate);
    app.post("/api/initiate-payment", formController_1.initiatePayment);
    app.get("/api/payment/callback", formController_1.paymentCallback);
    app.get("/api/verify-payment", formController_1.verifyPayment);
    // ✅ Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} started, listening on port ${PORT}`);
    });
}
