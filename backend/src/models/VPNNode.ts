import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NodeMetrics } from './NodeMetrics';

@Entity()
export class VPNNode {
  @PrimaryColumn()
  address: string;

  @Column()
  ipAddress: string;

  @Column()
  owner: string;

  @Column()
  isActive: boolean;

  @Column()
  isRegistered: boolean;

  @Column('decimal')
  totalScore: number;

  @OneToMany(() => NodeMetrics, metrics => metrics.node)
  metrics: NodeMetrics[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 