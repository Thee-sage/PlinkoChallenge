import mongoose, { Document } from 'mongoose';

// Define the interface for WalletRequest
export interface IWalletRequest extends Document {
    uid: string;
    email: string;
    requestedAmount: number;
    status: string;
    signedBy: string | null;  // Admin's email who processed the request
    createdAt: Date;
    updatedAt: Date;
}

// Create the WalletRequest schema
const walletRequestSchema = new mongoose.Schema<IWalletRequest>({
    uid: { type: String, required: true },
    email: { type: String, required: true },
    requestedAmount: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    signedBy: { type: String, default: null },  // Will store admin's email
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Create and export the WalletRequest model
export const WalletRequest = mongoose.model<IWalletRequest>('WalletRequest', walletRequestSchema);