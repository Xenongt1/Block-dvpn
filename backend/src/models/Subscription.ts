import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Subscription {
  @PrimaryColumn()
  tokenId: string;

  @Column()
  userAddress: string;

  @Column()
  expiryTimestamp: Date;

  @Column()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 