import { EventEmitter } from 'events';
import fetch from 'node-fetch';
import { getRepository } from '../database/init';
import { NodeMetrics } from '../models/NodeMetrics';
import { VPNNode } from '../models/VPNNode';

interface MetricsResult {
  nodeAddress: string;
  timestamp: number;
  latency: number;
  bandwidth: number;
  uptime: number;
  reliability: number;
}

interface PingHistory {
  timestamp: number;
  success: boolean;
  latency: number;
}

export class ProductionMetricsCollector extends EventEmitter {
  private metricsHistory: Map<string, MetricsResult[]> = new Map();
  private pingHistory: Map<string, PingHistory[]> = new Map();
  private collectionInterval: NodeJS.Timer | null = null;
  private readonly HISTORY_LENGTH = 24; // Keep 24 hours of history
  private readonly PING_SAMPLES = 5; // Number of ping samples to take
  private readonly TEST_FILE_SIZE = 1024 * 1024; // 1MB test file for bandwidth

  constructor() {
    super();
  }

  async startCollecting(nodeAddress: string): Promise<void> {
    if (!this.metricsHistory.has(nodeAddress)) {
      this.metricsHistory.set(nodeAddress, []);
    }

    if (!this.pingHistory.has(nodeAddress)) {
      this.pingHistory.set(nodeAddress, []);
    }

    // Collect metrics every hour
    this.collectionInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics(nodeAddress);
        await this.saveMetrics(nodeAddress, metrics);
        this.emit('metrics:collected', {
          nodeAddress,
          timestamp: Date.now(),
          metrics
        });
      } catch (error) {
        console.error(`Error collecting metrics for node ${nodeAddress}:`, error);
        this.emit('error', error);
      }
    }, 3600000); // 1 hour interval

    // Initial collection
    const metrics = await this.collectMetrics(nodeAddress);
    await this.saveMetrics(nodeAddress, metrics);
  }

  private async measureLatency(nodeAddress: string): Promise<number> {
    const results: number[] = [];

    for (let i = 0; i < this.PING_SAMPLES; i++) {
      const startTime = performance.now();
      try {
        const response = await fetch(`http://${nodeAddress}/ping`, {
          timeout: 5000 // 5 second timeout
        });
        
        if (response.ok) {
          const endTime = performance.now();
          results.push(endTime - startTime);
        } else {
          results.push(1000); // Penalty for failed ping
        }
      } catch (error) {
        results.push(1000); // Penalty for failed ping
        console.error(`Ping failed for node ${nodeAddress}:`, error);
      }

      // Wait 100ms between pings
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Remove highest and lowest values
    results.sort((a, b) => a - b);
    const filteredResults = results.slice(1, -1);

    // Calculate average latency
    const avgLatency = filteredResults.reduce((sum, val) => sum + val, 0) / filteredResults.length;
    
    // Store ping result in history
    const pingHistory = this.pingHistory.get(nodeAddress) || [];
    pingHistory.push({
      timestamp: Date.now(),
      success: avgLatency < 1000,
      latency: avgLatency
    });

    // Keep only last 24 hours of ping history
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.pingHistory.set(
      nodeAddress,
      pingHistory.filter(ping => ping.timestamp > oneDayAgo)
    );

    return avgLatency;
  }

  private async measureBandwidth(nodeAddress: string): Promise<number> {
    try {
      const startTime = performance.now();
      const response = await fetch(`http://${nodeAddress}/speedtest`);
      
      if (!response.ok) {
        throw new Error('Speed test failed');
      }

      const data = await response.blob();
      const endTime = performance.now();

      const duration = (endTime - startTime) / 1000; // Convert to seconds
      const speedMbps = (this.TEST_FILE_SIZE / duration) / (1024 * 1024); // Convert to Mbps

      return Math.min(speedMbps, 1000); // Cap at 1000 Mbps
    } catch (error) {
      console.error(`Bandwidth test failed for node ${nodeAddress}:`, error);
      return 0;
    }
  }

  private async calculateUptime(nodeAddress: string): Promise<number> {
    const pingHistory = this.pingHistory.get(nodeAddress) || [];
    
    if (pingHistory.length === 0) {
      return 100; // Default to 100% if no history
    }

    const successfulPings = pingHistory.filter(ping => ping.success).length;
    return (successfulPings / pingHistory.length) * 100;
  }

  private async calculateReliability(nodeAddress: string): Promise<number> {
    const pingHistory = this.pingHistory.get(nodeAddress) || [];
    const metrics = this.metricsHistory.get(nodeAddress) || [];

    if (pingHistory.length === 0 || metrics.length === 0) {
      return 100; // Default to 100% if no history
    }

    // Calculate connection success rate
    const successRate = (pingHistory.filter(ping => ping.success).length / pingHistory.length) * 100;

    // Calculate latency stability (lower variance is better)
    const latencies = metrics.map(m => m.latency);
    const latencyVariance = this.calculateVariance(latencies);
    const latencyStability = Math.max(0, 100 - latencyVariance);

    // Calculate bandwidth stability
    const bandwidths = metrics.map(m => m.bandwidth);
    const bandwidthVariance = this.calculateVariance(bandwidths);
    const bandwidthStability = Math.max(0, 100 - bandwidthVariance);

    // Weighted reliability score
    return (
      (successRate * 0.4) +
      (latencyStability * 0.3) +
      (bandwidthStability * 0.3)
    );
  }

  private calculateVariance(values: number[]): number {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(value => {
      const diff = value - avg;
      return diff * diff;
    });
    return Math.sqrt(squareDiffs.reduce((sum, val) => sum + val, 0) / values.length);
  }

  private async collectMetrics(nodeAddress: string): Promise<MetricsResult> {
    const [latency, bandwidth, uptime, reliability] = await Promise.all([
      this.measureLatency(nodeAddress),
      this.measureBandwidth(nodeAddress),
      this.calculateUptime(nodeAddress),
      this.calculateReliability(nodeAddress)
    ]);

    return {
      nodeAddress,
      timestamp: Date.now(),
      latency,
      bandwidth,
      uptime,
      reliability
    };
  }

  private async saveMetrics(nodeAddress: string, metrics: MetricsResult): Promise<void> {
    try {
      // Save to database
      const nodeRepository = getRepository<VPNNode>(VPNNode);
      const metricsRepository = getRepository<NodeMetrics>(NodeMetrics);

      const node = await nodeRepository.findOne({
        where: { address: nodeAddress }
      });

      if (!node) {
        throw new Error(`Node ${nodeAddress} not found`);
      }

      const newMetrics = metricsRepository.create({
        node,
        latency: metrics.latency,
        bandwidth: metrics.bandwidth,
        uptime: metrics.uptime,
        reliability: metrics.reliability
      });

      await metricsRepository.save(newMetrics);

      // Update in-memory history
      const history = this.metricsHistory.get(nodeAddress) || [];
      history.push(metrics);

      // Keep only last HISTORY_LENGTH entries
      const recentHistory = history.slice(-this.HISTORY_LENGTH);
      this.metricsHistory.set(nodeAddress, recentHistory);

    } catch (error) {
      console.error(`Failed to save metrics for node ${nodeAddress}:`, error);
      throw error;
    }
  }

  public getLatestMetrics(nodeAddress: string): MetricsResult | undefined {
    const history = this.metricsHistory.get(nodeAddress);
    return history?.[history.length - 1];
  }

  public getAllMetrics(nodeAddress: string): MetricsResult[] {
    return this.metricsHistory.get(nodeAddress) || [];
  }

  public stopCollecting(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }
} 