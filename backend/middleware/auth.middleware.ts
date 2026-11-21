import type { NextFunction, Request, Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'gameoover1289@gmail.com';

interface FirebaseConfigFile {
  projectId?: string;
}

function loadFirebaseProjectId(): string | null {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(cfgPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as FirebaseConfigFile;
    if (!parsed.projectId || parsed.projectId === 'remixed-project-id') return null;
    return parsed.projectId;
  } catch {
    return null;
  }
}

function getFirebaseAdminAuth() {
  const projectId = loadFirebaseProjectId();
  if (!projectId) {
    throw new Error('Firebase project is not provisioned.');
  }
  const app = getApps().length ? getApp() : initializeApp({ projectId });
  return getAuth(app);
}

export interface FirebaseAuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  firebaseUser?: FirebaseAuthUser;
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    if (!decoded.email_verified) {
      res.status(403).json({ error: 'Verified email required' });
      return;
    }
    const email = (decoded.email || '').toLowerCase();
    req.firebaseUser = {
      uid: decoded.uid,
      email,
      emailVerified: Boolean(decoded.email_verified),
      isAdmin: email === BOOTSTRAPPED_ADMIN_EMAIL,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase ID token' });
  }
}

export async function requireFirebaseAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireFirebaseAuth(req, res, () => {
    if (!req.firebaseUser?.isAdmin) {
      res.status(403).json({ error: 'Administrator privileges required' });
      return;
    }
    next();
  });
}
