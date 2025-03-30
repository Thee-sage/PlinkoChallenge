import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { User, Wallet } from './models';
import OtpToken from './models/OtpToken';
import authMiddleware from './middlewares/authMiddleware';

dotenv.config();

const router = express.Router();

declare global {
    namespace Express {
        export interface Request {
            user?: {
                uid: string;
                role: string;
            };
        }
    }
}

// Nodemailer transporter configuration using env variables
const transporter = nodemailer.createTransport({
    host: process.env.CPANELEMAIL_HOST,
    port: parseInt(process.env.CPANELEMAIL_PORTOUT || '465'),  // Change to PORTOUT
    secure: true,  // Change to false for 587
    auth: {
        user: process.env.CPANELEMAIL_USER,
        pass: process.env.CPANELEMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'
    }
});

// Verify email configuration on startup
transporter.verify(function (error, success) {
    if (error) {
        console.log('SMTP server connection error:', error);
    } else {
        console.log('SMTP server connection successful');
    }
});

router.get('/user/:uid', authMiddleware, async (req: Request, res: Response) => {
    const { uid } = req.params;
    const currentUserId = req.user?.uid;
    const currentUserRole = req.user?.role;

    console.log(`Received UID in request: ${uid}`);
    console.log(`Current User ID: ${currentUserId}, Role: ${currentUserRole}`);

    if (!currentUserId || (currentUserId !== uid && currentUserRole !== 'admin')) {
        console.log('Access denied: User not authorized');
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const user = await User.findOne({ uid }, { firstName: 1, lastName: 1, email: 1, role: 1, uid: 1 });
        console.log(`User found in database:`, user);

        if (!user) {
            console.log('No user found with the provided UID');
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Initiate account deletion process with OTP
router.post('/delete-account-initiate', async (req: Request, res: Response) => {
    const { uid, password } = req.body;

    try {
        const user = await User.findOne({ uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'customer') {
            return res.status(403).json({ message: 'Admin accounts cannot be deleted' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpToken = new OtpToken({
            uid,
            otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        });
        await otpToken.save();

        // Send OTP via email
        await transporter.sendMail({
            from: process.env.CPANELEMAIL_USER,
            to: user.email,
            subject: 'Account Deletion OTP',
            html: `<p>Your OTP for account deletion is: <b>${otp}</b>. It expires in 10 minutes.</p>`,
        });

        res.status(200).json({ message: 'OTP sent to your email for verification.' });
    } catch (err) {
        console.error('Error during delete initiation process:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Confirm account deletion with OTP
router.post('/verify-delete', async (req: Request, res: Response) => {
    const { uid, otp } = req.body;

    try {
        const otpToken = await OtpToken.findOne({ uid, otp });
        if (!otpToken || otpToken.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        await User.findOneAndDelete({ uid });
        await Wallet.findOneAndDelete({ uid });
        await OtpToken.deleteOne({ uid, otp });

        res.status(200).json({ message: 'User and associated wallet deleted successfully' });
    } catch (err) {
        console.error('Error during delete confirmation process:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Request password reset with OTP
router.post('/password-reset-request', async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpToken = new OtpToken({
            uid: user.uid,
            otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        });
        await otpToken.save();

        await transporter.sendMail({
            from: process.env.CPANELEMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            html: `<p>Your OTP for password reset is: <b>${otp}</b>. It expires in 10 minutes.</p>`,
        });

        res.status(200).json({ message: 'OTP sent to your email for password reset.' });
    } catch (err) {
        console.error('Error during password reset request:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Confirm password reset and update password
router.post('/password-reset-confirm', async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otpToken = await OtpToken.findOne({ uid: user.uid, otp });
        if (!otpToken || otpToken.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        await OtpToken.deleteOne({ uid: user.uid, otp });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Error during password reset confirmation:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;