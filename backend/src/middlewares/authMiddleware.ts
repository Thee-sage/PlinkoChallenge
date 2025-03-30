import jwt, { JwtPayload } from 'jsonwebtoken'; // Import JwtPayload
import { Request, Response, NextFunction } from 'express'; // Import necessary types
import { User } from '../models'; // Import your User model

interface CustomJwtPayload extends JwtPayload {
    uid: string; // Define the shape of your token payload
}

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]; // Assuming 'Bearer <token>' format

    if (!token) {
        return res.status(401).json({ message: 'Authentication token is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as CustomJwtPayload; // Cast to CustomJwtPayload

        // Now you can safely access `uid`
        const user = await User.findOne({ uid: decoded.uid });
        if (!user) {
            return res.status(401).json({ message: 'Invalid token or user not found' });
        }

        req.user = {
            uid: user.uid,
            role: user.role,
        };

        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        console.error('Authentication error:', err);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export default authMiddleware;
