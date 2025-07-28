export interface VPNNode {
  address: string;
  ipAddress: string;
  owner: string;
  totalScore: number;
  isRegistered: boolean;
  isActive: boolean;
  latency: number;
  bandwidth?: number; // Optional since not in contract
  uptime?: number; // Optional since not in contract
  reliability?: number; // Optional since not in contract
} 