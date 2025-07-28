import { AppDataSource } from '../config/database';
import { VPNNode } from '../models/VPNNode';
import { NodeMetrics } from '../models/NodeMetrics';

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    // Create tables if they don't exist
    await AppDataSource.synchronize();
    console.log('Database schema synchronized');

    return AppDataSource;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const getRepository = <T>(entity: any) => {
  return AppDataSource.getRepository<T>(entity);
}; 