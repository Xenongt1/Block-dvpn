import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface AuthenticatedRequest extends Request {
  auth?: {
    sessionId: string;
    isAdmin: boolean;
  };
}

// Store nonces in memory with expiration
const nonceStore = new Map<string, { nonce: string; expiry: number }>();

// Clean up expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [address, data] of nonceStore.entries()) {
    if (data.expiry < now) {
      nonceStore.delete(address);
    }
  }
}, 15 * 60 * 1000); // Clean every 15 minutes

export const generateNonce = (address: string): string => {
  const nonce = crypto.randomBytes(32).toString('hex');
  nonceStore.set(address, {
    nonce,
    expiry: Date.now() + 5 * 60 * 1000 // 5 minutes expiry
  });
  return nonce;
};

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
      sessionId: string;
      isAdmin: boolean;
    };

    // Only store minimal session information
    req.auth = {
      sessionId: decoded.sessionId,
      isAdmin: decoded.isAdmin
    };

    next();
  } catch (error) {
    // Don't log the error details, just return a generic message
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.auth?.isAdmin) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }
  next();
};

// Helper function to create JWT without storing sensitive data
export const createSessionToken = (
  sessionId: string,
  isAdmin: boolean = false
): string => {
  return jwt.sign(
    {
      sessionId,
      isAdmin
    },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '24h' }
  );
}; 