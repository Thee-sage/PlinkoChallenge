import express from 'express';
import adRoutes from './adsads';
import casinoRoutes from './Casino';

const router = express.Router();

// This means /ads/ads/... which might be redundant
// router.use('/', adRoutes);  

// Better approach:
router.use('/ad', adRoutes);        // Will handle /ads/ad/...
router.use('/casino', casinoRoutes); // Will handle /ads/casino/...

export default router;