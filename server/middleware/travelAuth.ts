import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { executeQuery } from '../config/database';

export interface TravelAuthRequest extends AuthRequest {
  travelRole?: 'employee' | 'manager' | 'office_coordinator' | 'finance_admin' | 'admin';
}

/**
 * Loads the user's travel_role onto req.travelRole.
 * Run AFTER authenticateToken.
 */
export const loadTravelRole = async (req: TravelAuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const rows = await executeQuery('SELECT travel_role FROM users WHERE id = ?', [req.user.id]);
    const tr = rows?.[0]?.travel_role || 'employee';
    req.travelRole = tr;
    next();
  } catch (e) {
    console.error('loadTravelRole error', e);
    req.travelRole = 'employee';
    next();
  }
};

export const requireTravelRole = (roles: Array<TravelAuthRequest['travelRole']>) => {
  return (req: TravelAuthRequest, res: Response, next: NextFunction) => {
    if (!req.travelRole || !roles.includes(req.travelRole)) {
      // Admin always allowed
      if (req.travelRole === 'admin') return next();
      return res.status(403).json({ success: false, message: 'Insufficient travel permissions' });
    }
    next();
  };
};
