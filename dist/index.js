"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const formController_1 = require("./controllers/formController");
dotenv_1.default.config();
const app = (0, express_1.default)();
// ✅ CORS: allow only your frontend
const FRONTEND_URL = process.env.FRONTEND_URL || "https://mowaa.onrender.com";
app.use((0, cors_1.default)({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use(body_parser_1.default.json());
// ✅ MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/btm_payjeje";
mongoose_1.default.connect(MONGO_URI)
    .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // stop server if DB not connected
});
// ✅ API routes
app.get("/api/exchange-rate", formController_1.exchangeRate);
app.post("/api/initiate-payment", formController_1.initiatePayment);
app.get("/api/payment/callback", formController_1.paymentCallback);
app.get("/api/verify-payment", formController_1.verifyPayment);
// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, (err) => {
    if (err) {
        console.error("Server failed to start:", err);
        process.exit(1);
    }
});
