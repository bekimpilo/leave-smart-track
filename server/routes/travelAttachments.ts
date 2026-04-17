// Attachment routes for travel requests & expense claims (uses LONGBLOB tables already in migration)
import express from 'express';
import multer from 'multer';
import { executeQuery } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { loadTravelRole, TravelAuthRequest } from '../middleware/travelAuth';

const router = express.Router();
router.use(authenticateToken, loadTravelRole);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ========= Travel attachments =========
router.post('/travel/:id', upload.single('file'), async (req: TravelAuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    const { id } = req.params;
    const f = req.file;
    const fileName = `${Date.now()}_${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const result: any = await executeQuery(
      `INSERT INTO travel_attachments (travel_request_id, filename, original_name, file_data, file_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, fileName, f.originalname, f.buffer, f.mimetype, f.size]
    );
    res.json({ success: true, id: result.insertId, filename: f.originalname });
  } catch (e: any) {
    console.error('travel attachment upload', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/travel/:id', async (req, res) => {
  try {
    const rows = await executeQuery(
      `SELECT id, filename, original_name, file_type, file_size, uploaded_at
       FROM travel_attachments WHERE travel_request_id = ? ORDER BY uploaded_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, attachments: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/travel/file/:attachmentId', async (req, res) => {
  try {
    const [att] = await executeQuery(
      `SELECT original_name, file_data, file_type FROM travel_attachments WHERE id = ?`,
      [req.params.attachmentId]
    );
    if (!att) return res.status(404).json({ success: false, message: 'Not found' });
    res.setHeader('Content-Type', att.file_type);
    res.setHeader('Content-Disposition', `inline; filename="${att.original_name}"`);
    res.send(att.file_data);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/travel/file/:attachmentId', async (req: TravelAuthRequest, res) => {
  try {
    await executeQuery(`DELETE FROM travel_attachments WHERE id = ?`, [req.params.attachmentId]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ========= Expense attachments =========
router.post('/expense/:id', upload.single('file'), async (req: TravelAuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    const { id } = req.params;
    const lineId = req.body.line_id ? Number(req.body.line_id) : null;
    const f = req.file;
    const fileName = `${Date.now()}_${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const result: any = await executeQuery(
      `INSERT INTO expense_attachments (expense_claim_id, expense_line_id, filename, original_name, file_data, file_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, lineId, fileName, f.originalname, f.buffer, f.mimetype, f.size]
    );
    res.json({ success: true, id: result.insertId, filename: f.originalname });
  } catch (e: any) {
    console.error('expense attachment upload', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/expense/:id', async (req, res) => {
  try {
    const rows = await executeQuery(
      `SELECT id, expense_line_id, filename, original_name, file_type, file_size, uploaded_at
       FROM expense_attachments WHERE expense_claim_id = ? ORDER BY uploaded_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, attachments: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/expense/file/:attachmentId', async (req, res) => {
  try {
    const [att] = await executeQuery(
      `SELECT original_name, file_data, file_type FROM expense_attachments WHERE id = ?`,
      [req.params.attachmentId]
    );
    if (!att) return res.status(404).json({ success: false, message: 'Not found' });
    res.setHeader('Content-Type', att.file_type);
    res.setHeader('Content-Disposition', `inline; filename="${att.original_name}"`);
    res.send(att.file_data);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/expense/file/:attachmentId', async (req: TravelAuthRequest, res) => {
  try {
    await executeQuery(`DELETE FROM expense_attachments WHERE id = ?`, [req.params.attachmentId]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
