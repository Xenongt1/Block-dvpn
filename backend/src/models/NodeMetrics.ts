import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { VPNNode } from './VPNNode';

@Entity()
export class NodeMetrics {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VPNNode, node => node.metrics)
  node: VPNNode;

  @Column('decimal')
  latency: number;

  @Column('decimal')
  bandwidth: number;

  @Column('decimal')
  uptime: number;

  @Column('decimal')
  reliability: number;

  @CreateDateColumn()
  timestamp: Date;
} 