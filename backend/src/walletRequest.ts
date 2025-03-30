import express, { Request, Response } from 'express';
import { User } from './models/User'; // Adjust the import path to where your User model is defined
import { Wallet } from './models/Wallet'; // Adjust the import path to where your Wallet model is defined
import { WalletRequest } from './models/WalletRequest'; // Import the WalletRequest model

const router = express.Router();

// POST /wallet/request: Request more money
router.post("/request", async (req: Request, res: Response) => {
    const { uid, requestedAmount }: { uid: string, requestedAmount: number } = req.body;

    if (!uid || !requestedAmount || requestedAmount <= 0) {
        return res.status(400).send({ error: "Invalid request data." });
    }

    try {
        const user = await User.findOne({ uid });
        if (!user) {
            return res.status(404).send({ error: "User not found." });
        }

        const walletRequest = new WalletRequest({
            uid,
            email: user.email,
            requestedAmount
        });

        await walletRequest.save();

        res.status(201).send({ message: "Request submitted successfully." });
    } catch (error) {
        console.error('Error submitting wallet request:', error);
        res.status(500).send({ error: "Server error" });
    }
});

// GET /wallet/requests: Fetch all wallet requests
router.get("/requests", async (req: Request, res: Response) => {
    try {
        const requests = await WalletRequest.find();
        res.status(200).send(requests);
    } catch (error) {
        console.error('Error fetching wallet requests:', error);
        res.status(500).send({ error: "Server error" });
    }
});

// PATCH /wallet/request/:id/approve: Approve wallet request
router.patch("/request/:id/approve", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { adminEmail } = req.body;  // Add this to get admin's email
    const io = (req as any).io;

    if (!adminEmail) {
        return res.status(400).send({ error: "Admin email is required." });
    }

    try {
        const request = await WalletRequest.findById(id);
        if (!request) {
            return res.status(404).send({ error: "Request not found." });
        }
        if (request.status !== 'pending') {
            return res.status(400).send({ error: "Request has already been processed." });
        }

        // Update request status and signedBy
        request.status = 'approved';
        request.signedBy = adminEmail;
        request.updatedAt = new Date();
        await request.save();

        // Update wallet balance
        const wallet = await Wallet.findOne({ uid: request.uid });
        if (!wallet) {
            return res.status(404).send({ error: "Wallet not found." });
        }
        wallet.balance += request.requestedAmount;
        await wallet.save();

        // Emit event to notify frontend
        io.emit("walletRequestApproved", { 
            uid: request.uid, 
            newBalance: wallet.balance,
            signedBy: adminEmail 
        });

        res.send({ 
            message: "Request approved and wallet updated.", 
            newBalance: wallet.balance,
            signedBy: adminEmail
        });
    } catch (error) {
        console.error('Error approving wallet request:', error);
        res.status(500).send({ error: "Server error" });
    }
});

// PATCH /wallet/request/:id/reject: Reject wallet request
router.patch("/request/:id/reject", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { adminEmail } = req.body;  // Add this to get admin's email
    const io = (req as any).io;

    if (!adminEmail) {
        return res.status(400).send({ error: "Admin email is required." });
    }

    try {
        const request = await WalletRequest.findById(id);
        if (!request) {
            return res.status(404).send({ error: "Request not found." });
        }
        if (request.status !== 'pending') {
            return res.status(400).send({ error: "Request has already been processed." });
        }

        // Update request status and signedBy
        request.status = 'rejected';
        request.signedBy = adminEmail;
        request.updatedAt = new Date();
        await request.save();

        // Emit event to notify frontend
        io.emit("walletRequestRejected", { 
            uid: request.uid,
            signedBy: adminEmail 
        });

        res.send({ 
            message: "Request rejected.",
            signedBy: adminEmail
        });
    } catch (error) {
        console.error('Error rejecting wallet request:', error);
        res.status(500).send({ error: "Server error" });
    }
});

export default router;
