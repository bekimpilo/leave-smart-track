import express from 'express';
import multer from 'multer';
import { executeQuery } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { loadTravelRole, requireTravelRole, TravelAuthRequest } from '../middleware/travelAuth';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All routes require auth + travel role load
router.use(authenticateToken, loadTravelRole);

// ============= PER DIEM RATES =============
router.get('/per-diem-rates', async (req, res) => {
  try {
    const rows = await executeQuery('SELECT * FROM per_diem_rates WHERE is_active = 1 ORDER BY region, meal_type');
    res.json({ success: true, rates: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/per-diem-rates', requireTravelRole(['admin']), async (req: TravelAuthRequest, res) => {
  try {
    const { region, meal_type, amount, currency } = req.body;
    if (!region || !meal_type || amount == null) {
      return res.status(400).json({ success: false, message: 'region, meal_type and amount required' });
    }
    await executeQuery(
      `INSERT INTO per_diem_rates (region, meal_type, amount, currency)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), currency = VALUES(currency), is_active = 1`,
      [region, meal_type, amount, currency || 'ZAR']
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/per-diem-rates/:id', requireTravelRole(['admin']), async (req, res) => {
  try {
    await executeQuery('UPDATE per_diem_rates SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// CSV upload helper — expects multipart/form-data with field "file"
router.post('/per-diem-rates/upload', requireTravelRole(['admin']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const csv = req.file.buffer.toString('utf-8').trim();
    const lines = csv.split(/\r?\n/);
    const header = lines.shift()?.toLowerCase().split(',').map(h => h.trim()) || [];
    const idx = (n: string) => header.indexOf(n);
    let inserted = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = line.split(',').map(c => c.trim());
      const region = cols[idx('region')];
      const meal_type = cols[idx('meal_type')] || cols[idx('meal type')];
      const amount = parseFloat(cols[idx('amount')]);
      const currency = cols[idx('currency')] || 'ZAR';
      if (!region || !meal_type || isNaN(amount)) continue;
      await executeQuery(
        `INSERT INTO per_diem_rates (region, meal_type, amount, currency)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount), currency = VALUES(currency), is_active = 1`,
        [region, meal_type, amount, currency]
      );
      inserted++;
    }
    res.json({ success: true, inserted });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============= PROJECT IDs =============
router.get('/project-ids', async (_req, res) => {
  try {
    const rows = await executeQuery('SELECT * FROM project_ids WHERE is_active = 1 ORDER BY project_code');
    res.json({ success: true, projects: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/project-ids', requireTravelRole(['admin']), async (req, res) => {
  try {
    const { project_code, description } = req.body;
    if (!project_code) return res.status(400).json({ success: false, message: 'project_code required' });
    await executeQuery(
      `INSERT INTO project_ids (project_code, description) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), is_active = 1`,
      [project_code, description || null]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/project-ids/:id', requireTravelRole(['admin']), async (req, res) => {
  try {
    await executeQuery('UPDATE project_ids SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/project-ids/upload', requireTravelRole(['admin']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const csv = req.file.buffer.toString('utf-8').trim();
    const lines = csv.split(/\r?\n/);
    const header = lines.shift()?.toLowerCase().split(',').map(h => h.trim()) || [];
    const idx = (n: string) => header.indexOf(n);
    let inserted = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = line.split(',').map(c => c.trim());
      const project_code = cols[idx('project_code')] || cols[idx('code')] || cols[0];
      const description = cols[idx('description')] || cols[1] || null;
      if (!project_code) continue;
      await executeQuery(
        `INSERT INTO project_ids (project_code, description) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description), is_active = 1`,
        [project_code, description]
      );
      inserted++;
    }
    res.json({ success: true, inserted });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============= EXPENSE CATEGORIES =============
router.get('/expense-categories', async (_req, res) => {
  try {
    const rows = await executeQuery('SELECT * FROM expense_categories WHERE is_active = 1 ORDER BY name');
    res.json({ success: true, categories: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/expense-categories', requireTravelRole(['admin']), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    await executeQuery(
      `INSERT INTO expense_categories (name, description) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), is_active = 1`,
      [name, description || null]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/expense-categories/:id', requireTravelRole(['admin']), async (req, res) => {
  try {
    await executeQuery('UPDATE expense_categories SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/expense-categories/upload', requireTravelRole(['admin']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const csv = req.file.buffer.toString('utf-8').trim();
    const lines = csv.split(/\r?\n/);
    const header = lines.shift()?.toLowerCase().split(',').map(h => h.trim()) || [];
    const idx = (n: string) => header.indexOf(n);
    let inserted = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = line.split(',').map(c => c.trim());
      const name = cols[idx('name')] || cols[0];
      const description = cols[idx('description')] || cols[1] || null;
      if (!name) continue;
      await executeQuery(
        `INSERT INTO expense_categories (name, description) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description), is_active = 1`,
        [name, description]
      );
      inserted++;
    }
    res.json({ success: true, inserted });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============= TRAVEL ROLE MANAGEMENT =============
router.get('/users-travel-roles', requireTravelRole(['admin']), async (_req, res) => {
  try {
    const rows = await executeQuery(
      'SELECT id, email, name, department, role AS leave_role, travel_role FROM users WHERE is_active = 1 ORDER BY name'
    );
    res.json({ success: true, users: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/users-travel-roles/:id', requireTravelRole(['admin']), async (req, res) => {
  try {
    const { travel_role } = req.body;
    const valid = ['employee', 'manager', 'office_coordinator', 'finance_admin', 'admin'];
    if (!valid.includes(travel_role)) {
      return res.status(400).json({ success: false, message: 'Invalid travel_role' });
    }
    await executeQuery('UPDATE users SET travel_role = ? WHERE id = ?', [travel_role, req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Get current user's travel role
router.get('/me', async (req: TravelAuthRequest, res) => {
  res.json({ success: true, travel_role: req.travelRole });
});

export default router;
