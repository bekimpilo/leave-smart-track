// PDF download for travel requests
import express from 'express';
import { executeQuery } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { loadTravelRole, TravelAuthRequest } from '../middleware/travelAuth';
import { buildTravelPdf } from '../services/travelPdfService';

const router = express.Router();
router.use(authenticateToken, loadTravelRole);

router.get('/travel/:id', async (req: TravelAuthRequest, res) => {
  try {
    const id = req.params.id;
    const [request] = await executeQuery('SELECT * FROM travel_requests WHERE id = ?', [id]);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    const flights = await executeQuery('SELECT * FROM travel_flights WHERE travel_request_id = ?', [id]);
    const [car_rental] = await executeQuery('SELECT * FROM travel_car_rental WHERE travel_request_id = ?', [id]);
    const [accommodation] = await executeQuery('SELECT * FROM travel_accommodation WHERE travel_request_id = ?', [id]);
    const per_diem = await executeQuery('SELECT * FROM travel_per_diem_lines WHERE travel_request_id = ? ORDER BY line_date', [id]);

    const buf = await buildTravelPdf({ request, flights, car_rental: car_rental || null, accommodation: accommodation || null, per_diem });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="travel-request-${id}.pdf"`);
    res.send(buf);
  } catch (e: any) {
    console.error('travel pdf', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
