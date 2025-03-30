import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || '';

interface JwtPayload {
  uid: string;
  email: string;
  role: string;
}

// Extend Express Request type to include admin property
declare global {
  namespace Express {
    interface Request {
      admin?: {
        uid: string;
        email: string;
        role: string;
      };
    }
  }
}

export const verifyAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      
      const user = await User.findOne({ uid: decoded.uid });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      // Attach admin info to request object
      req.admin = {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role
      };
      
      next();
    } catch (jwtError) {
      const error = jwtError as jwt.JsonWebTokenError;
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }

  } catch (err) {
    console.error('Error in admin middleware:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
export default verifyAdminAuth;
