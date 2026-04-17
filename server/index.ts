
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import leaveRoutes from './routes/leave';
import balanceRoutes from './routes/balance';
import holidayRoutes from './routes/holiday';
import rolloverRoutes from './routes/rollover';
import departmentRoutes from './routes/departments';
import externalRoutes from './routes/external';
import auditRoutes from './routes/audit';
import systemRoutes from './routes/system';
import travelConfigRoutes from './routes/travelConfig';
import travelRequestRoutes from './routes/travelRequest';
import expenseClaimRoutes from './routes/expenseClaim';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/holiday', holidayRoutes);
app.use('/api/rollover', rolloverRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/external', externalRoutes); // External API endpoints
app.use('/api/audit', auditRoutes); // Audit trail endpoints
app.use('/api/system', systemRoutes); // System settings endpoints
app.use('/api/travel-config', travelConfigRoutes); // Per diem, PIDs, expense categories
app.use('/api/travel', travelRequestRoutes); // Travel requests
app.use('/api/expense-claims', expenseClaimRoutes); // Expense claims

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Leave Management API is running' });
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Leave Management API', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
const startServer = async () => {
  try {
    console.log('Starting server...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Port:', PORT);
    console.log('Frontend URL:', process.env.FRONTEND_URL);
    
    await connectDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check available at: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
