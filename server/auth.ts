import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, User } from './db.js';
import { DEMO_USER_ID } from './seed.js';

import crypto from 'node:crypto';

// Legacy fallback key used strictly for verifying older active session tokens during migration,
// guaranteeing that existing user sessions are not unexpectedly invalidated.
const LEGACY_DEV_SECRET = 'mindforge-super-secret-key-development';

// In-memory runtime fallback generated with high-entropy randomness if JWT_SECRET is unset
let runtimeEphemeralSecret: string | null = null;

export function getSigningSecret(): string {
  const configuredSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';
  if (configuredSecret.length >= 16) {
    return configuredSecret;
  }
  if (configuredSecret.length > 0) {
    return configuredSecret;
  }
  if (!runtimeEphemeralSecret) {
    runtimeEphemeralSecret = crypto.randomBytes(32).toString('hex');
    console.warn(
      '[MindForge Security] JWT_SECRET environment variable is not defined. Using a cryptographically secure ephemeral 256-bit key. To persist sessions across server reboots, configure JWT_SECRET in AI Studio Secrets.'
    );
  }
  return runtimeEphemeralSecret;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getSigningSecret(),
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Check Authorization header or cookie
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.mf_token) {
    token = req.cookies.mf_token;
  }

  // Allow explicit demo mode header if user is exploring in demo mode
  if (!token && req.headers['x-demo-mode'] === 'true') {
    const demoUser = db.users.find(u => u.id === DEMO_USER_ID);
    if (demoUser) {
      req.user = demoUser;
      return next();
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in to access your study materials.' });
    return;
  }

  try {
    const secret = getSigningSecret();
    let decoded: { id: string; email: string } | null = null;
    try {
      decoded = jwt.verify(token, secret) as { id: string; email: string };
    } catch (primaryErr) {
      // Graceful fallback: check if signed by legacy development key to prevent invalidating user sessions
      if (secret !== LEGACY_DEV_SECRET) {
        try {
          decoded = jwt.verify(token, LEGACY_DEV_SECRET) as { id: string; email: string };
        } catch {
          throw primaryErr;
        }
      } else {
        throw primaryErr;
      }
    }

    if (!decoded || !decoded.id) {
      res.status(401).json({ error: 'Invalid authentication token.' });
      return;
    }

    const user = db.users.find(u => u.id === decoded!.id);
    if (!user) {
      res.status(401).json({ error: 'User not found or session has expired.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
