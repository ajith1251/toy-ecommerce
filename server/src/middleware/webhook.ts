import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware to verify Razorpay webhook signatures.
 * This must come before body parsing to get the raw body.
 */
export function razorpayWebhookVerification(webhookSecret: string) {
  return async function (req: Request, res: Response, next: NextFunction) {
    // Get the raw body
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', () => {
      // Get the signature from headers
      const receivedSignature = req.headers['x-razorpay-signature'] as string | undefined;
      
      if (!receivedSignature) {
        return res.status(400).json({ 
          error: { 
            code: 'missing_signature', 
            message: 'Missing Razorpay signature header' 
          } 
        });
      }

      // Verify the signature
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(rawBody);
      const generatedSignature = hmac.digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'utf8'),
        Buffer.from(receivedSignature, 'utf8')
      );

      if (!isValid) {
        return res.status(400).json({ 
          error: { 
            code: 'invalid_signature', 
            message: 'Invalid Razorpay signature' 
          } 
        });
      }

      // Attach the raw body to the request for later use
      (req as any).rawBody = rawBody;
      next();
    });

    req.on('error', (err) => {
      next(err);
    });
  };
}