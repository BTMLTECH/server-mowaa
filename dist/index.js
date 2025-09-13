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
const visaUpload_1 = __importDefault(require("./util/visaUpload"));
dotenv_1.default.config();
const numCPUs = os_1.default.cpus().length;
if (cluster_1.default.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
        cluster_1.default.fork();
    }
    cluster_1.default.on("exit", (worker, code, signal) => {
        cluster_1.default.fork();
    });
}
else {
    const app = (0, express_1.default)();
    const allowedOrigins = [
        process.env.FRONTEND_URL,
    ];
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error("Not allowed by CORS"), false);
            }
        },
        credentials: true,
    }));
    const MONGO_URI = process.env.MONGO_URI || "";
    mongoose_1.default.connect(MONGO_URI)
        .then(() => { })
        .catch(err => {
        process.exit(1);
    });
    // ✅ API routes
    app.get("/api/exchange-rate", formController_1.exchangeRate);
    app.post("/api/initiate-payment", visaUpload_1.default.fields([
        { name: "passportScan", maxCount: 1 },
        { name: "passportPhoto", maxCount: 1 },
        { name: "flightProof", maxCount: 1 },
    ]), formController_1.initiatePayment);
    app.use("/api/payment", body_parser_1.default.json());
    app.get("/api/payment/callback", formController_1.paymentCallback);
    app.get("/api/verify-payment", formController_1.verifyPayment);
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        { }
        ;
    });
}
