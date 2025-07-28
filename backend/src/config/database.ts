import { DataSource } from 'typeorm';
import { VPNNode } from '../models/VPNNode';
import { NodeMetrics } from '../models/NodeMetrics';
import { Subscription } from '../models/Subscription';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'dvpn_db',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [VPNNode, NodeMetrics, Subscription],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
}); 