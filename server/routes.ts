import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// In-memory store for verification codes (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; timestamp: number; attempts: number }>();

export async function registerRoutes(app: Express): Promise<Server> {
  // SMS Verification API
  app.post('/api/send-sms', async (req, res) => {
    try {
      const { phoneNumber, message, code } = req.body;

      if (!phoneNumber || !message || !code) {
        return res.status(400).json({ 
          success: false, 
          message: 'Phone number, message, and code are required' 
        });
      }

      // Validate Philippine phone number format
      const phoneRegex = /^(\+63|0)9\d{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Philippine phone number format'
        });
      }

      // Store verification code with timestamp (expires in 10 minutes)
      const normalizedPhone = phoneNumber.replace(/^\+63/, '0').replace(/^63/, '0');
      verificationCodes.set(normalizedPhone, {
        code,
        timestamp: Date.now(),
        attempts: 0
      });

      // In production, integrate with SMS providers like:
      // - Semaphore (Philippines-based)
      // - ITEXMO (Philippines-based)
      // - Twilio (Global)
      // - engageSPARK (Philippines-focused)

      console.log(`SMS sent to ${phoneNumber}: ${message}`);
      console.log(`Verification code stored: ${code}`);

      res.json({
        success: true,
        message: 'SMS verification code sent successfully'
      });

    } catch (error) {
      console.error('SMS sending error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send SMS verification code'
      });
    }
  });

  // Verify SMS Code API
  app.post('/api/verify-sms', async (req, res) => {
    try {
      const { phoneNumber, code } = req.body;

      if (!phoneNumber || !code) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and verification code are required'
        });
      }

      const normalizedPhone = phoneNumber.replace(/^\+63/, '0').replace(/^63/, '0');
      const storedData = verificationCodes.get(normalizedPhone);

      if (!storedData) {
        return res.status(400).json({
          success: false,
          message: 'No verification code found for this number'
        });
      }

      // Check if code has expired (10 minutes)
      const isExpired = Date.now() - storedData.timestamp > 10 * 60 * 1000;
      if (isExpired) {
        verificationCodes.delete(normalizedPhone);
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired'
        });
      }

      // Check attempts limit
      if (storedData.attempts >= 3) {
        verificationCodes.delete(normalizedPhone);
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. Please request a new code'
        });
      }

      // Verify code
      if (storedData.code !== code) {
        storedData.attempts++;
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      // Code is valid - remove from storage
      verificationCodes.delete(normalizedPhone);

      res.json({
        success: true,
        message: 'Phone number verified successfully'
      });

    } catch (error) {
      console.error('SMS verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify SMS code'
      });
    }
  });

  // ID Verification API
  app.post('/api/verify-id', async (req, res) => {
    try {
      const { idType, idNumber, files } = req.body;

      if (!idType || !idNumber) {
        return res.status(400).json({
          success: false,
          message: 'ID type and number are required'
        });
      }

      // Basic ID number validation patterns for Philippines
      const idValidations = {
        drivers_license: /^[A-Z]\d{2}-\d{2}-\d{6}$/, // Format: A01-02-123456
        national_id: /^\d{4}-\d{7}-\d$/, // Format: 1234-1234567-1
        passport: /^[A-Z]{2}\d{7}$/, // Format: XX1234567
        voters_id: /^\d{4}-\d{4}-\d{4}-\d{4}$/ // Format: 1234-5678-9012-3456
      };

      const pattern = idValidations[idType as keyof typeof idValidations];
      if (pattern && !pattern.test(idNumber)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${idType.replace('_', ' ')} format`
        });
      }

      // In production, integrate with:
      // - National ID eVerify API (everify.gov.ph) - Official Philippine Government
      // - ID Analyzer API for document verification
      // - OCR services for document text extraction
      // - Face matching services for biometric verification

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For demo purposes, we'll accept the ID as valid
      // In production, this would involve real verification against government databases
      const verificationResult = {
        idType,
        idNumber,
        status: 'pending_review',
        submittedAt: new Date().toISOString(),
        estimatedReviewTime: '24-48 hours',
        files: files || []
      };

      console.log('ID verification submitted:', verificationResult);

      res.json({
        success: true,
        message: 'ID verification submitted successfully. Review will be completed within 24-48 hours.',
        data: verificationResult
      });

    } catch (error) {
      console.error('ID verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process ID verification'
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
