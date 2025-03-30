// models/OtpToken.ts
import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the OtpToken document
interface IOtpToken extends Document {
    uid: string;
    otp: string;
    expiresAt: Date;
}

// Define the schema with type annotations
const otpTokenSchema = new Schema<IOtpToken>({
    uid: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
});

// Export the model with the IOtpToken interface
export default mongoose.model<IOtpToken>('OtpToken', otpTokenSchema);
