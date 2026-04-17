import express from 'express';
import { executeQuery } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { loadTravelRole, requireTravelRole, TravelAuthRequest } from '../middleware/travelAuth';
import { travelEmailService } from '../services/travelEmailService';

const router = express.Router();
router.use(authenticateToken, loadTravelRole);

const getManagerEmail = async (email: string): Promise<string | null> => {
  const rows = await executeQuery('SELECT manager_email FROM users WHERE email = ?', [email]);
  return rows?.[0]?.manager_email || null;
};

// LIST
router.get('/', async (req: TravelAuthRequest, res) => {
  try {
    const role = req.travelRole;
    const email = req.user!.email;
    let where = ''; let params: any[] = [];

    if (role === 'employee') { where = 'WHERE requester_email = ?'; params = [email]; }
    else if (role === 'manager') { where = 'WHERE manager_email = ? OR requester_email = ?'; params = [email, email]; }
    else if (role === 'finance_admin') { where = "WHERE status IN ('approved','paid')"; }

    const rows = await executeQuery(`SELECT * FROM expense_claims ${where} ORDER BY created_at DESC`, params);
    res.json({ success: true, claims: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET ONE with lines + mileage
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [claim] = await executeQuery('SELECT * FROM expense_claims WHERE id = ?', [id]);
    if (!claim) return res.status(404).json({ success: false, message: 'Not found' });
    const lines = await executeQuery('SELECT * FROM expense_claim_lines WHERE expense_claim_id = ? ORDER BY line_no', [id]);
    const mileage = await executeQuery('SELECT * FROM expense_mileage_log WHERE expense_claim_id = ?', [id]);
    res.json({ success: true, claim, lines, mileage });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// CREATE
router.post('/', async (req: TravelAuthRequest, res) => {
  try {
    const u = req.user!;
    const b = req.body;
    const managerEmail = b.manager_email || (await getManagerEmail(u.email));
    const lines: any[] = b.lines || [];
    const mileage: any[] = b.mileage || [];
    const total = lines.reduce((s, l) => s + Number(l.receipt_amount || 0), 0);

    const result: any = await executeQuery(
      `INSERT INTO expense_claims (requester_email, requester_name, purpose, related_travel_id, manager_email, status, total_amount)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [u.email, u.name, b.purpose, b.related_travel_id || null, managerEmail, total]
    );
    const claimId = result.insertId;

    let lineNo = 1;
    for (const l of lines) {
      await executeQuery(
        `INSERT INTO expense_claim_lines
         (expense_claim_id, line_no, expense_date, location, project_id, expense_category, receipt_amount, description,
          manual_receipt_vendor, manual_receipt_purpose, manual_receipt_signature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [claimId, lineNo++, l.expense_date, l.location || null, l.project_id || null, l.expense_category || null,
         l.receipt_amount, l.description || null, l.manual_receipt_vendor || null, l.manual_receipt_purpose || null, l.manual_receipt_signature || null]
      );
    }

    for (const m of mileage) {
      await executeQuery(
        `INSERT INTO expense_mileage_log
         (expense_claim_id, travel_date_from, travel_date_to, opening_km, closing_km, total_km, private_km, business_km, business_details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [claimId, m.travel_date_from, m.travel_date_to, m.opening_km, m.closing_km, m.total_km, m.private_km || 0, m.business_km, m.business_details || null]
      );
    }

    if (managerEmail) {
      const [created] = await executeQuery('SELECT * FROM expense_claims WHERE id = ?', [claimId]);
      travelEmailService.notifyManagerOfExpenseClaim(created, managerEmail).catch(err => console.error('email error', err));
    }
    res.json({ success: true, id: claimId });
  } catch (e: any) {
    console.error('create expense claim', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// MANAGER decision
router.post('/:id/decision', requireTravelRole(['manager', 'admin']), async (req, res) => {
  try {
    const { decision, comment } = req.body;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'invalid' });
    }
    const newStatus = decision === 'approve' ? 'approved' : 'rejected';
    await executeQuery(
      `UPDATE expense_claims SET status = ?, manager_comment = ?, rejection_reason = ? WHERE id = ?`,
      [newStatus, comment || null, decision === 'reject' ? (comment || '') : null, req.params.id]
    );
    const [updated] = await executeQuery('SELECT * FROM expense_claims WHERE id = ?', [req.params.id]);
    if (updated) travelEmailService.notifyEmployeeOfExpenseDecision(updated, decision, comment).catch(err => console.error('email error', err));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// FINANCE: mark paid
router.post('/:id/mark-paid', requireTravelRole(['finance_admin', 'admin']), async (req: TravelAuthRequest, res) => {
  try {
    await executeQuery(
      `UPDATE expense_claims SET status = 'paid', finance_email = ?, finance_completed_at = NOW() WHERE id = ?`,
      [req.user!.email, req.params.id]
    );
    const [updated] = await executeQuery('SELECT * FROM expense_claims WHERE id = ?', [req.params.id]);
    if (updated) travelEmailService.notifyEmployeeExpensePaid(updated).catch(err => console.error('email error', err));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// CANCEL
router.post('/:id/cancel', async (req: TravelAuthRequest, res) => {
  try {
    const [c] = await executeQuery('SELECT requester_email FROM expense_claims WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ success: false, message: 'Not found' });
    if (c.requester_email !== req.user!.email && req.travelRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await executeQuery('UPDATE expense_claims SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
