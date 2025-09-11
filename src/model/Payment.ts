import mongoose, { Schema } from "mongoose";
import { PaymentDocument } from "../types/payment";



const CartItemSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    details: { type: String },
  },
  { _id: false }
);

const FormDataSchema = new Schema(
  {
    personalInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    travelInfo: {
      arrivalDate: String,
      airline: String,
      flightNumber: String,
      departureTime: String,
      arrivalTime: String,
      departureDate: String,
      departureTimeFromLagos: String,
    },
    services: [String],
    hotel: String,
    roomType: String,
    numberOfNights: String,
    numberOfRooms: String,
    stayInBenin: String,
    beninDuration: String,
    comments: String,
  },
  { _id: false }
);

const PaymentSchema = new Schema<PaymentDocument>(
  {
    reference: { type: String, required: true, unique: true },
    formData: { type: FormDataSchema, required: true },
    cartItems: { type: [CartItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model<PaymentDocument>("Payment", PaymentSchema);
