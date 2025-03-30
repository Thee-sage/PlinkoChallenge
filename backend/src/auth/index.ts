// auth/index.ts (main auth router file)
import express from 'express';
import regularAuthRoutes from './regularAuth';  // your current auth.ts
import googleAuthRoutes from './google';        // your current google.ts
import contact from './contact';
const router = express.Router();

// Mount both auth routes under appropriate paths
router.use('/', regularAuthRoutes);          // handles /api/auth/login, /api/auth/signup etc.
router.use('/google', googleAuthRoutes);     // handles /api/auth/google/callback etc.
router.use('/contact',contact)               // handles /api/auth/contact etc.
export default router;