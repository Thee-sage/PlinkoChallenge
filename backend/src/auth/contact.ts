import express from 'express';
import nodemailer from 'nodemailer';
import { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Rate limiting to prevent spam
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 requests per hour
    message: 'Too many contact requests, please try again later.'
});

// Configure nodemailer with cPanel settings
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

// Contact form submission endpoint
router.post('/send', contactLimiter, async (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !subject || !message) {
        return res.status(400).json({
            message: 'Please fill in all fields'
        });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'Please provide a valid email address'
        });
    }

    try {
        // Send email to support
        await transporter.sendMail({
            from: process.env.CPANELEMAIL_USER, // Use authorized email as sender
            replyTo: email, // Set reply-to as the contact form submitter's email
            to: process.env.CPANELEMAIL_USER,
            subject: `Contact Form: ${subject}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>From:</strong> ${name} (${email})</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <h3>Message:</h3>
                <p>${message.replace(/\n/g, '<br/>')}</p>
            `
        });

        console.log('Contact form submission processed successfully', { name, email, subject });
        res.status(200).json({
            message: 'Message sent successfully! We\'ll get back to you soon.'
        });
    } catch (err) {
        console.error('Error processing contact form submission:', err);
        res.status(500).json({
            message: 'Failed to send message. Please try again later.'
        });
    }
});

export default router;