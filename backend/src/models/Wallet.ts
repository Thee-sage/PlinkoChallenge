import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
    uid: string; // UID linked to the user
    email: string; // Email linked to the user
    balance: number; // Default pulled from game settings
}

const walletSchema: Schema<IWallet> = new Schema({
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    balance: { type: Number, default: 200 },
});

export const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);
