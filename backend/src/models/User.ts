import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    firstName: string;          // Add first name
    lastName: string;           // Add last name
    email: string;
    password?: string;          // Optional if not using password for all users
    verified: boolean;
    verificationToken?: string; // Added verificationToken here
    role: string;
    uid: string;
}

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verificationToken: { type: String },
    uid: { type: String, required: true },
    role: { type: String, default: 'customer' },
    createdAt: { type: Date, default: Date.now },
});

// Use this pattern to avoid the OverwriteModelError
export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
