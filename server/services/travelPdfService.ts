// Generate PDF for a travel request authorisation form (CHAI branded).
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const LOGO_PATHS = [
  path.join(process.cwd(), 'public', 'logo', 'chailogo.png'),
  path.join(process.cwd(), '..', 'public', 'logo', 'chailogo.png'),
  path.join(__dirname, '..', '..', 'public', 'logo', 'chailogo.png'),
];

const findLogo = (): string | null => {
  for (const p of LOGO_PATHS) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
};

const fmt = (n: any) => (n == null || n === '' ? '—' : n);
const money = (n: any) => `R ${Number(n || 0).toFixed(2)}`;
const date = (d: any) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

export const buildTravelPdf = (data: {
  request: any;
  flights: any[];
  car_rental: any | null;
  accommodation: any | null;
  per_diem: any[];
}): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const r = data.request;
      const logo = findLogo();

      // Header
      if (logo) doc.image(logo, 40, 35, { width: 50 });
      doc.fillColor('#0f766e').fontSize(18).font('Helvetica-Bold')
        .text('TRAVEL & BUSINESS ADVANCE AUTHORISATION', 100, 45);
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
        .text('Clinton Health Access Initiative', 100, 67);
      doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#10b981').lineWidth(1.5).stroke();

      doc.fillColor('#0f172a').fontSize(8).text(`Request #${r.id}`, 40, 100, { align: 'right' });
      let y = 115;

      const section = (title: string) => {
        doc.fillColor('#fff').rect(40, y, 515, 18).fill('#0f766e');
        doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold').text(title, 46, y + 4);
        doc.fillColor('#0f172a').font('Helvetica');
        y += 24;
      };

      const row = (pairs: [string, string][]) => {
        const colW = 515 / pairs.length;
        pairs.forEach(([label, val], i) => {
          const x = 40 + i * colW;
          doc.fontSize(7.5).fillColor('#64748b').text(label.toUpperCase(), x, y);
          doc.fontSize(9).fillColor('#0f172a').text(val || '—', x, y + 9, { width: colW - 8 });
        });
        y += 28;
      };

      // Personal
      section('Personal Information');
      row([['Requester', fmt(r.requester_name)], ['Credential', fmt(r.credential)], ['ID/Passport', fmt(r.id_passport)]]);
      row([['Date of Birth', date(r.date_of_birth)], ['Cellphone', fmt(r.cellphone)], ['Email', fmt(r.email)]]);
      row([['Project ID 1', fmt(r.project_id_1)], ['Project ID 2', fmt(r.project_id_2)], ['CHAI Role', fmt(r.chai_role)]]);
      row([['Place to be Visited', fmt(r.place_to_be_visited)], ['Date Required', date(r.date_amount_required)], ['Status', String(r.status || '').toUpperCase()]]);
      doc.fontSize(7.5).fillColor('#64748b').text('PURPOSE OF TRAVEL', 40, y);
      doc.fontSize(9).fillColor('#0f172a').text(fmt(r.purpose_of_travel), 40, y + 9, { width: 515 });
      y += 40;

      // Flights
      if (data.flights?.length) {
        section('Flight Details');
        const headers = ['From', 'To', 'Date', 'Time From', 'Time To', 'FF#'];
        const widths = [90, 90, 70, 60, 60, 145];
        let x = 40;
        headers.forEach((h, i) => { doc.fontSize(8).fillColor('#64748b').text(h.toUpperCase(), x, y); x += widths[i]; });
        y += 12;
        doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        y += 4;
        for (const f of data.flights) {
          x = 40;
          const cells = [fmt(f.from_location), fmt(f.to_location), date(f.flight_date), fmt(f.time_from), fmt(f.time_to), fmt(f.frequent_flyer_number)];
          cells.forEach((c, i) => { doc.fontSize(8.5).fillColor('#0f172a').text(c, x, y, { width: widths[i] - 4 }); x += widths[i]; });
          y += 16;
        }
        y += 8;
      }

      // Car rental
      if (data.car_rental?.required) {
        section('Car Rental / Shuttle');
        const c = data.car_rental;
        row([['Mode', fmt(c.preferred_mode)], ['Pickup Branch', fmt(c.pickup_branch)], ['Drop-off Branch', fmt(c.dropoff_branch)]]);
        row([['Pickup', `${date(c.pickup_date)} ${fmt(c.pickup_time)}`], ['Drop-off', `${date(c.dropoff_date)} ${fmt(c.dropoff_time)}`], ['Est. Kilos', fmt(c.total_kilos_estimated)]]);
      }

      // Accommodation
      if (data.accommodation?.required) {
        section('Accommodation');
        const a = data.accommodation;
        row([['Venue', fmt(a.venue)], ['Check-in', date(a.check_in_date)], ['Check-out', date(a.check_out_date)]]);
        row([['Meal first day', a.meal_first_day ? 'Yes' : 'No'], ['Full duration meals', a.meal_full_duration ? 'Yes' : 'No'], ['Special meal', fmt(a.specific_meal_request)]]);
      }

      // Per diem
      if (y > 700) { doc.addPage(); y = 50; }
      if (data.per_diem?.length) {
        section('Per Diem Lines');
        const headers = ['Date', 'Category', 'Amount', 'Cur', 'FX', 'ZAR'];
        const widths = [70, 180, 70, 50, 60, 85];
        let x = 40;
        headers.forEach((h, i) => { doc.fontSize(8).fillColor('#64748b').text(h.toUpperCase(), x, y); x += widths[i]; });
        y += 12;
        doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        y += 4;
        for (const l of data.per_diem) {
          if (y > 770) { doc.addPage(); y = 50; }
          x = 40;
          const cells = [date(l.line_date), fmt(l.expense_category), Number(l.amount || 0).toFixed(2), fmt(l.currency), Number(l.fx_rate || 1).toFixed(4), Number(l.amount_zar || 0).toFixed(2)];
          cells.forEach((c, i) => { doc.fontSize(8.5).fillColor('#0f172a').text(c, x, y, { width: widths[i] - 4 }); x += widths[i]; });
          y += 16;
        }
        y += 8;
      }

      // Totals
      if (y > 720) { doc.addPage(); y = 50; }
      section('Totals & Disbursement');
      row([['Local (SA) ZAR', money(r.per_diem_local_zar)], ['Other Per Diem ZAR', money(r.per_diem_other_zar)], ['Business Advance', money(r.business_advance_zar)]]);
      doc.fillColor('#0f766e').rect(40, y, 515, 22).fill();
      doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold')
        .text(`TOTAL ADVANCE: ${money(r.total_zar)}`, 46, y + 6);
      y += 30;
      row([['Disbursement', fmt(r.disbursement_method)], ['Bank', fmt(r.bank_name)], ['Branch', fmt(r.branch_number)]]);
      row([['Account #', fmt(r.account_number)], ['Account Name', fmt(r.account_name)], ['Date Required', date(r.date_amount_required)]]);

      // Approval block
      if (y > 680) { doc.addPage(); y = 50; }
      section('Approval');
      row([['Manager', fmt(r.manager_email)], ['Status', String(r.status || '').toUpperCase()], ['Decision Comment', fmt(r.manager_comment)]]);
      if (r.rejection_reason) row([['Rejection Reason', r.rejection_reason], ['', ''], ['', '']]);

      // Footer
      doc.fontSize(7).fillColor('#94a3b8').text(
        `Generated ${new Date().toLocaleString('en-GB')} • CHAI Travel & Expense System`,
        40, 800, { align: 'center', width: 515 }
      );

      doc.end();
    } catch (e) { reject(e); }
  });
};
