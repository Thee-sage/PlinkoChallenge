import express, { Request, Response } from "express";
import { outcomes } from "./outcomes";
import { GameSettings } from "./models/GameSettings";

const demoRouter = express.Router();
const TOTAL_DROPS = 16;

const MULTIPLIERS: { [key: number]: number } = {
    0: 16, 1: 9, 2: 2, 3: 1.4, 4: 1.4, 5: 1.2, 6: 1.1, 7: 1,
    8: 0.5, 9: 1, 10: 1.1, 11: 1.2, 12: 1.4, 13: 1.4, 14: 2, 15: 9, 16: 16
};

interface UserBallDrops {
    socketId: string | null;
    balance: number;
}

const userBallDrops: { [userId: string]: UserBallDrops } = {};

// Helper function to get game settings
const getGameSettings = async () => {
    const settings = await GameSettings.findOne();
    if (!settings) {
        return {
            demoInitialBalance: 100,
            maxBallPrice: 20
        };
    }
    
    const demoBalance = settings.getDemoBalance();
    
    return {
        demoInitialBalance: demoBalance,
        maxBallPrice: settings.maxBallPrice
    };
};

// Update socket ID and initialize user data
const updateUserSocket = async (userId: string, socketId: string) => {
    const settings = await getGameSettings();
    
    if (userBallDrops[userId]) {
        // If socket ID changed, reset everything (user opened in new browser/session)
        if (userBallDrops[userId].socketId !== socketId) {
            userBallDrops[userId] = {
                socketId,
                balance: settings.demoInitialBalance
            };
        }
    } else {
        // New user
        userBallDrops[userId] = {
            socketId,
            balance: settings.demoInitialBalance
        };
    }
};
// Base demo route check
demoRouter.get("/", (req: Request, res: Response) => {
    res.send("Demo API is up and running!");
});
// Main demo game simulation route
demoRouter.post("/demo-game", async (req: Request, res: Response) => {
    const { userId, ballPrice, socketId } = req.body;

    if (!userId) {
        return res.status(400).send({ error: "User ID is required." });
    }

    try {
        const settings = await getGameSettings();
        
        // Update socket ID and handle session reset
        await updateUserSocket(userId, socketId);

        // Validate ball price
        const price = ballPrice || settings.maxBallPrice;
        if (price > settings.maxBallPrice) {
            return res.status(400).send({ 
                error: `Ball price cannot exceed ${settings.maxBallPrice} Zixos.`
            });
        }

        // Check if user has enough balance
        if (userBallDrops[userId].balance < price) {
            return res.status(400).send({ 
                error: "Not enough Zixos for this ball price.",
                currentBalance: userBallDrops[userId].balance
            });
        }

        // Game logic
        userBallDrops[userId].balance -= price;

        let outcome = 0;
        const pattern = [];
        for (let i = 0; i < TOTAL_DROPS; i++) {
            if (Math.random() > 0.5) {
                pattern.push("R");
                outcome++;
            } else {
                pattern.push("L");
            }
        }

        const multiplier = MULTIPLIERS[outcome];
        const possibleOutcomes = outcomes[outcome];
        const points = possibleOutcomes[Math.floor(Math.random() * possibleOutcomes.length)];
        
        const winnings = price * multiplier;
        userBallDrops[userId].balance += winnings;

        const responseData = {
            point: points,
            pattern,
            multiplier,
            currentBalance: userBallDrops[userId].balance,
            ballPrice: price,
            winnings
        };

        // Emit game result if socket.io is available
        if (req.io) {
            req.io.to(socketId).emit("demo_game_result", responseData);
        }

        res.send(responseData);

    } catch (error) {
        console.error('Error in demo game:', error);
        res.status(500).send({ error: "Server error" });
    }
});

// Get user's demo wallet balance
demoRouter.get("/demo-status/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { socketId } = req.query;

    try {
        const settings = await getGameSettings();
        
        if (socketId) {
            await updateUserSocket(userId, socketId as string);
        }

        if (!userBallDrops[userId]) {
            res.send({ 
                currentBalance: settings.demoInitialBalance,
                maxBallPrice: settings.maxBallPrice
            });
        } else {
            res.send({
                currentBalance: userBallDrops[userId].balance,
                maxBallPrice: settings.maxBallPrice
            });
        }
    } catch (error) {
        console.error('Error fetching demo status:', error);
        res.status(500).send({ error: "Server error" });
    }
});

export const handleSocketDisconnect = (socketId: string) => {
    Object.entries(userBallDrops).forEach(([userId, data]) => {
        if (data.socketId === socketId) {
            data.socketId = null;
        }
    });
};

export default demoRouter;