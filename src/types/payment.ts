import { Document } from "mongoose";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  details?: string;
}

export interface FormDatas {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
  };
  travelInfo: {
    arrivalDate: string;
    airline: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    departureDate: string;
    departureTimeFromLagos: string;
  };
  services: string[];
  hotel: string;
  roomType: string;
  numberOfNights: string;
  numberOfRooms: string;
  stayInBenin: string;
  beninDuration: string;
  comments: string;
}

export interface PaymentDocument extends Document {
  reference: string;
  formData: FormDatas;
  cartItems: CartItem[];
  totalAmount: number;
  currency: string;
  status: "pending" | "success" | "failed";
  createdAt: Date;
  updatedAt: Date;
}
