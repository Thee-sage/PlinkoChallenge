import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { User, Wallet } from '../models';
import mongoose from 'mongoose';

const router = express.Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const JWT_SECRET = process.env.JWT_SECRET as string;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper function to create a JWT
function createJwtToken(uid: string, email: string) {
    return jwt.sign(
        { uid, email },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

function generateDatabaseUid() {
    return new mongoose.Types.ObjectId().toString();
}



// Google OAuth route with verification check
router.post('/callback', async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        console.log('Google login attempt failed: No token provided');
        return res.status(400).json({ error: 'No token provided' });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload() as TokenPayload;
        if (!payload || !payload.email) {
            console.log('Google login attempt failed: Invalid payload');
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        const { email, given_name: firstName, family_name: lastName } = payload;
        let user = await User.findOne({ email }).select('+verified');

        if (!user) {
            // For new Google users, create account with verified true
            user = new User({
                email,
                firstName: firstName || '',
                lastName: lastName || '',
                uid: generateDatabaseUid(),
                verified: true, // Google accounts are pre-verified
                role: "customer",
                authProvider: 'google'
            });
            await user.save();
        } else {
            // For existing users, check verification status
            if (user.verified === false) {
                console.log('Google login blocked: Unverified user', { email });
                return res.status(403).json({ 
                    error: 'Please verify your email before logging in',
                    needsVerification: true
                });
            }
        }

        let wallet = await Wallet.findOne({ uid: user.uid });
        if (!wallet) {
            wallet = new Wallet({ uid: user.uid, email: user.email });
            await wallet.save();
        }

        const jwtToken = createJwtToken(user.uid, user.email);

        console.log('Google login successful', { email, verified: user.verified });
        res.status(200).json({
            token: jwtToken,
            uid: user.uid,
            email: user.email,
            balance: wallet.balance || 20,
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });
    } catch (error: any) {
        console.error("Error during Google login:", error);
        
        if (error && typeof error === 'object' && 'message' in error) {
            if (error.message.includes('audience mismatch')) {
                return res.status(401).json({ 
                    error: 'Invalid client ID configuration',
                    details: 'Please check your Google OAuth client ID configuration'
                });
            }
        }
        
        res.status(401).json({ error: 'Authentication failed' });
    }
});

export default router;