// Travel & Expense email notifications
// Reuses the same SMTP transport pattern as the leave email service.
import nodemailer from 'nodemailer';
import { executeQuery } from '../config/database';

const FROM_EMAIL = process.env.SMTP_USER || 'noreply@company.com';
const ADMIN_EMAIL = 'chaisahr@clintonhealthaccess.org';

const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 15000,
  pool: false,
  maxConnections: 1,
  maxMessages: 1,
  requireTLS: true,
  tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
} as any);

const send = async (to: string, subject: string, text: string, cc?: string) => {
  if (!process.env.SMTP_USER) {
    console.warn('[travel-email] SMTP not configured, skipping send to', to);
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"CHAI Travel" <${FROM_EMAIL}>`,
      to, cc, subject, text,
    });
    console.log('[travel-email] sent', { to, subject });
    return true;
  } catch (e: any) {
    console.error('[travel-email] failed', e.message);
    return false;
  }
};

const logNotification = async (
  recipient_email: string,
  subject: string,
  message: string,
  type: string,
  travel_request_id: number | null = null,
  expense_claim_id: number | null = null
) => {
  try {
    await executeQuery(
      `INSERT INTO travel_notifications (recipient_email, subject, message, notification_type, travel_request_id, expense_claim_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recipient_email, subject, message, type, travel_request_id, expense_claim_id]
    );
  } catch (e) { /* notifications log table may not exist yet */ }
};

const APP_URL = process.env.FRONTEND_URL || 'https://leave-smart-track.lovable.app';

export const travelEmailService = {
  // Travel: notify manager of new request
  async notifyManagerOfTravelRequest(req: any, managerEmail: string) {
    const subject = `New Travel Request: ${req.requester_name} → ${req.place_to_be_visited}`;
    const message = [
      `Hello,`,
      ``,
      `${req.requester_name} has submitted a new travel request requiring your approval.`,
      ``,
      `Destination: ${req.place_to_be_visited}`,
      `Purpose: ${req.purpose_of_travel}`,
      `Total advance requested: R ${Number(req.total_zar || 0).toFixed(2)}`,
      `Date amount required: ${req.date_amount_required || 'Not specified'}`,
      ``,
      `Review and decide here: ${APP_URL}`,
      ``,
      `— CHAI Travel & Expense System`,
    ].join('\n');
    await send(managerEmail, subject, message, ADMIN_EMAIL);
    await logNotification(managerEmail, subject, message, 'travel_submitted', req.id);
  },

  // Travel: notify employee of decision
  async notifyEmployeeOfTravelDecision(req: any, decision: 'approve'|'reject', comment?: string) {
    const action = decision === 'approve' ? 'APPROVED' : 'REJECTED';
    const subject = `Travel Request ${action}: ${req.place_to_be_visited}`;
    const message = [
      `Hello ${req.requester_name},`,
      ``,
      `Your travel request to ${req.place_to_be_visited} has been ${action}.`,
      comment ? `\nManager comment: ${comment}` : '',
      ``,
      `View details: ${APP_URL}`,
      ``,
      `— CHAI Travel & Expense System`,
    ].join('\n');
    await send(req.requester_email, subject, message);
    await logNotification(req.requester_email, subject, message, `travel_${decision}d`, req.id);

    // Notify coordinators on approval so they can start booking
    if (decision === 'approve') {
      try {
        const coords = await executeQuery(
          `SELECT email FROM users WHERE travel_role IN ('office_coordinator','admin') AND is_active = TRUE`
        );
        for (const c of coords) {
          await send(c.email, `Travel Approved — Booking Required: ${req.requester_name}`,
            `${req.requester_name}'s travel to ${req.place_to_be_visited} has been approved by their manager.\n\nPlease process bookings.\n\n${APP_URL}`);
        }
      } catch (e) { /* skip */ }
    }
  },

  // Travel: notify finance once coordinator marks as booked
  async notifyFinanceOfBookedTravel(req: any) {
    const subject = `Travel Booked — Per Diem Required: ${req.requester_name}`;
    const message = [
      `Bookings have been completed for ${req.requester_name}'s travel to ${req.place_to_be_visited}.`,
      ``,
      `Per diem to release: R ${Number(req.total_zar || 0).toFixed(2)}`,
      `Required by: ${req.date_amount_required || 'ASAP'}`,
      ``,
      `Process at: ${APP_URL}`,
    ].join('\n');
    try {
      const finance = await executeQuery(
        `SELECT email FROM users WHERE travel_role IN ('finance_admin','admin') AND is_active = TRUE`
      );
      for (const f of finance) {
        await send(f.email, subject, message);
        await logNotification(f.email, subject, message, 'travel_booked', req.id);
      }
    } catch (e) { /* skip */ }
  },

  // Expense: notify manager
  async notifyManagerOfExpenseClaim(claim: any, managerEmail: string) {
    const subject = `New Expense Claim: ${claim.requester_name} (R ${Number(claim.total_amount || 0).toFixed(2)})`;
    const message = [
      `Hello,`,
      ``,
      `${claim.requester_name} has submitted an expense claim for your approval.`,
      ``,
      `Type: ${(claim.purpose || '').replace('_', ' ')}`,
      `Amount: R ${Number(claim.total_amount || 0).toFixed(2)}`,
      ``,
      `Review here: ${APP_URL}`,
    ].join('\n');
    await send(managerEmail, subject, message, ADMIN_EMAIL);
    await logNotification(managerEmail, subject, message, 'expense_submitted', null, claim.id);
  },

  // Expense: notify employee of decision
  async notifyEmployeeOfExpenseDecision(claim: any, decision: 'approve'|'reject', comment?: string) {
    const action = decision === 'approve' ? 'APPROVED' : 'REJECTED';
    const subject = `Expense Claim ${action}: R ${Number(claim.total_amount || 0).toFixed(2)}`;
    const message = [
      `Hello ${claim.requester_name},`,
      ``,
      `Your expense claim has been ${action}.`,
      comment ? `\nManager comment: ${comment}` : '',
      ``,
      `${APP_URL}`,
    ].join('\n');
    await send(claim.requester_email, subject, message);
    await logNotification(claim.requester_email, subject, message, `expense_${decision}d`, null, claim.id);

    // Notify finance when approved
    if (decision === 'approve') {
      try {
        const finance = await executeQuery(
          `SELECT email FROM users WHERE travel_role IN ('finance_admin','admin') AND is_active = TRUE`
        );
        for (const f of finance) {
          await send(f.email, `Expense Approved — Payment Required: ${claim.requester_name}`,
            `An expense claim for R ${Number(claim.total_amount || 0).toFixed(2)} from ${claim.requester_name} has been approved.\n\n${APP_URL}`);
        }
      } catch (e) { /* skip */ }
    }
  },

  // Expense: notify employee paid
  async notifyEmployeeExpensePaid(claim: any) {
    const subject = `Expense Claim Paid: R ${Number(claim.total_amount || 0).toFixed(2)}`;
    const message = `Hello ${claim.requester_name},\n\nYour expense claim has been processed for payment.\n\nAmount: R ${Number(claim.total_amount || 0).toFixed(2)}\n\n${APP_URL}`;
    await send(claim.requester_email, subject, message);
    await logNotification(claim.requester_email, subject, message, 'expense_paid', null, claim.id);
  },
};
