import express from 'express';
import { executeQuery } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { loadTravelRole, requireTravelRole, TravelAuthRequest } from '../middleware/travelAuth';
import { travelEmailService } from '../services/travelEmailService';

const router = express.Router();
router.use(authenticateToken, loadTravelRole);

// Helper: get the manager email for a user
const getManagerEmail = async (userEmail: string): Promise<string | null> => {
  const rows = await executeQuery('SELECT manager_email FROM users WHERE email = ?', [userEmail]);
  return rows?.[0]?.manager_email || null;
};

// ====== LIST (role-aware) ======
router.get('/', async (req: TravelAuthRequest, res) => {
  try {
    const role = req.travelRole;
    const email = req.user!.email;
    let where = '';
    let params: any[] = [];

    if (role === 'employee') {
      where = 'WHERE tr.requester_email = ?';
      params = [email];
    } else if (role === 'manager') {
      where = 'WHERE tr.manager_email = ? OR tr.alternative_manager_email = ? OR tr.requester_email = ?';
      params = [email, email, email];
    } else if (role === 'office_coordinator') {
      // sees approved+ records
      where = "WHERE tr.status IN ('approved','in_progress','booked','per_diem_paid','completed')";
    } else if (role === 'finance_admin') {
      where = "WHERE tr.status IN ('approved','in_progress','booked','per_diem_paid','completed')";
    }
    // admin sees everything

    const rows = await executeQuery(
      `SELECT tr.* FROM travel_requests tr ${where} ORDER BY tr.created_at DESC`,
      params
    );
    res.json({ success: true, requests: rows });
  } catch (e: any) {
    console.error('list travel requests', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ====== GET ONE (with all children) ======
router.get('/:id', async (req: TravelAuthRequest, res) => {
  try {
    const id = req.params.id;
    const [request] = await executeQuery('SELECT * FROM travel_requests WHERE id = ?', [id]);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    const flights = await executeQuery('SELECT * FROM travel_flights WHERE travel_request_id = ?', [id]);
    const [carRental] = await executeQuery('SELECT * FROM travel_car_rental WHERE travel_request_id = ?', [id]);
    const [accommodation] = await executeQuery('SELECT * FROM travel_accommodation WHERE travel_request_id = ?', [id]);
    const perDiem = await executeQuery('SELECT * FROM travel_per_diem_lines WHERE travel_request_id = ? ORDER BY line_date', [id]);
    res.json({
      success: true,
      request,
      flights,
      car_rental: carRental || null,
      accommodation: accommodation || null,
      per_diem: perDiem,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ====== CREATE ======
router.post('/', async (req: TravelAuthRequest, res) => {
  try {
    const u = req.user!;
    const b = req.body;
    const managerEmail = b.manager_email || (await getManagerEmail(u.email));

    // totals
    const lines: any[] = b.per_diem_lines || [];
    let local_zar = 0, other_zar = 0;
    for (const l of lines) {
      const azr = Number(l.amount_zar || 0);
      if ((l.region || '').toUpperCase() === 'SA') local_zar += azr;
      else other_zar += azr;
    }
    const advance = Number(b.business_advance_zar || 0);
    const total = local_zar + other_zar + advance;

    const result: any = await executeQuery(
      `INSERT INTO travel_requests
       (requester_email, requester_name, credential, id_passport, date_of_birth,
        project_id_1, project_id_2, email, cellphone, purpose_of_travel,
        place_to_be_visited, chai_role, manager_email, alternative_manager_email,
        approver_reason, status, per_diem_local_zar, per_diem_other_zar,
        business_advance_zar, total_zar, date_amount_required, disbursement_method,
        bank_name, branch_number, account_number, account_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.email, u.name, b.credential, b.id_passport, b.date_of_birth,
        b.project_id_1, b.project_id_2 || null, b.email || u.email, b.cellphone, b.purpose_of_travel,
        b.place_to_be_visited, b.chai_role, managerEmail, b.alternative_manager_email || null,
        b.approver_reason || null, local_zar, other_zar, advance, total,
        b.date_amount_required || null, b.disbursement_method || 'Bank Details',
        b.bank_name || null, b.branch_number || null, b.account_number || null, b.account_name || null,
      ]
    );
    const trId = result.insertId;

    // flights
    for (const f of (b.flights || [])) {
      await executeQuery(
        `INSERT INTO travel_flights (travel_request_id, from_location, to_location, flight_date, time_from, time_to, meal_request, frequent_flyer_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [trId, f.from_location, f.to_location, f.flight_date, f.time_from || null, f.time_to || null, f.meal_request || null, f.frequent_flyer_number || null]
      );
    }

    // car rental
    if (b.car_rental && b.car_rental.required) {
      const c = b.car_rental;
      await executeQuery(
        `INSERT INTO travel_car_rental (travel_request_id, required, preferred_mode, total_kilos_estimated, pickup_branch, dropoff_branch, pickup_date, dropoff_date, pickup_time, dropoff_time)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [trId, c.preferred_mode || 'Automatic', c.total_kilos_estimated || null, c.pickup_branch || null, c.dropoff_branch || null, c.pickup_date || null, c.dropoff_date || null, c.pickup_time || null, c.dropoff_time || null]
      );
    }

    // accommodation
    if (b.accommodation && b.accommodation.required) {
      const a = b.accommodation;
      await executeQuery(
        `INSERT INTO travel_accommodation (travel_request_id, required, venue, check_in_date, check_out_date, meal_first_day, meal_full_duration, specific_meal_request)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?)`,
        [trId, a.venue || null, a.check_in_date || null, a.check_out_date || null, a.meal_first_day ? 1 : 0, a.meal_full_duration ? 1 : 0, a.specific_meal_request || null]
      );
    }

    // per diem lines
    for (const l of lines) {
      await executeQuery(
        `INSERT INTO travel_per_diem_lines (travel_request_id, line_date, expense_category, amount, currency, fx_rate, amount_zar, region)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [trId, l.line_date, l.expense_category, l.amount, l.currency || 'ZAR', l.fx_rate || 1, l.amount_zar, l.region || null]
      );
    }

    // fire email to manager (non-blocking)
    if (managerEmail) {
      const [created] = await executeQuery('SELECT * FROM travel_requests WHERE id = ?', [trId]);
      travelEmailService.notifyManagerOfTravelRequest(created, managerEmail).catch(err => console.error('email error', err));
    }

    res.json({ success: true, id: trId });
  } catch (e: any) {
    console.error('create travel request', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ====== APPROVE / REJECT (manager) ======
router.post('/:id/decision', requireTravelRole(['manager', 'admin']), async (req: TravelAuthRequest, res) => {
  try {
    const { decision, comment } = req.body; // 'approve' | 'reject'
    const id = req.params.id;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be approve or reject' });
    }
    const newStatus = decision === 'approve' ? 'approved' : 'rejected';
    await executeQuery(
      `UPDATE travel_requests SET status = ?, manager_comment = ?, rejection_reason = ? WHERE id = ?`,
      [newStatus, comment || null, decision === 'reject' ? (comment || 'No reason given') : null, id]
    );
    // notify employee + cascade
    const [updated] = await executeQuery('SELECT * FROM travel_requests WHERE id = ?', [id]);
    if (updated) travelEmailService.notifyEmployeeOfTravelDecision(updated, decision, comment).catch(err => console.error('email error', err));
    res.json({ success: true, status: newStatus });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ====== CANCEL (employee, only if pending) ======
router.post('/:id/cancel', async (req: TravelAuthRequest, res) => {
  try {
    const id = req.params.id;
    const [tr] = await executeQuery('SELECT requester_email, status FROM travel_requests WHERE id = ?', [id]);
    if (!tr) return res.status(404).json({ success: false, message: 'Not found' });
    if (tr.requester_email !== req.user!.email && req.travelRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot cancel another user\'s request' });
    }
    await executeQuery('UPDATE travel_requests SET status = ? WHERE id = ?', ['cancelled', id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ====== COORDINATOR: mark in progress / completed ======
router.post('/:id/coordinator-status', requireTravelRole(['office_coordinator', 'admin']), async (req: TravelAuthRequest, res) => {
  try {
    const { status } = req.body; // 'in_progress' | 'booked'
    if (!['in_progress', 'booked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'invalid status' });
    }
    await executeQuery(
      `UPDATE travel_requests SET status = ?, coordinator_email = ?, coordinator_completed_at = ${status === 'booked' ? 'NOW()' : 'NULL'} WHERE id = ?`,
      [status, req.user!.email, req.params.id]
    );
    if (status === 'booked') {
      const [tr] = await executeQuery('SELECT * FROM travel_requests WHERE id = ?', [req.params.id]);
      if (tr) travelEmailService.notifyFinanceOfBookedTravel(tr).catch(err => console.error('email error', err));
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ====== FINANCE: mark per diem paid ======
router.post('/:id/finance-status', requireTravelRole(['finance_admin', 'admin']), async (req: TravelAuthRequest, res) => {
  try {
    const { status } = req.body; // 'per_diem_paid' | 'completed'
    if (!['per_diem_paid', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'invalid status' });
    }
    await executeQuery(
      `UPDATE travel_requests SET status = ?, finance_email = ?, finance_completed_at = NOW() WHERE id = ?`,
      [status, req.user!.email, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
