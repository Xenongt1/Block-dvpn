import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/init';
import { nodeRoutes } from './routes/nodes';
import { metricsRoutes } from './routes/metrics';
import nodeMetricsRoutes from './routes/node-metrics';
import { ProductionMetricsCollector } from './services/ProductionMetricsCollector';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Initialize metrics collector
export const metricsCollector = new ProductionMetricsCollector();

// API routes
app.use('/api/nodes', nodeRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/node', nodeMetricsRoutes); // Routes for node metrics collection

const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 