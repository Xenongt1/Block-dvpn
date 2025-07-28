import { EventEmitter } from 'events';

interface NodeMetrics {
  nodeAddress: string;
  timestamp: number;
  // Only store aggregated performance metrics
  latency: number;
  bandwidth: number;
  uptime: number;
  reliability: number;
}

interface AggregateMetrics {
  dailyAverage: NodeMetrics;
  weeklyAverage: NodeMetrics;
  monthlyAverage: NodeMetrics;
  totalConnections: number;
  lastUpdated: number;
}

export class MetricsCollector extends EventEmitter {
  private metricsHistory: Map<string, NodeMetrics[]> = new Map();
  private aggregateMetrics: Map<string, AggregateMetrics> = new Map();
  private collectionInterval: NodeJS.Timer | null = null;
  private readonly HISTORY_LENGTH = 24; // Keep only 24 hours of detailed metrics

  constructor() {
    super();
  }

  startCollecting(nodeAddress: string): void {
    if (!this.metricsHistory.has(nodeAddress)) {
      this.metricsHistory.set(nodeAddress, []);
    }

    // Collect metrics every hour instead of every 30 seconds
    // This reduces data collection frequency while still maintaining useful insights
    this.collectionInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics(nodeAddress);
        this.addMetrics(nodeAddress, metrics);
        this.updateAggregateMetrics(nodeAddress);
        this.emit('metrics:collected', {
          nodeAddress,
          timestamp: Date.now(),
          aggregateMetrics: this.aggregateMetrics.get(nodeAddress)
        });
      } catch (error) {
        this.emit('error', error);
      }
    }, 3600000); // 1 hour interval
  }

  private async updateAggregateMetrics(nodeAddress: string): Promise<void> {
    const history = this.metricsHistory.get(nodeAddress) || [];
    if (history.length === 0) return;

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const aggregate: AggregateMetrics = {
      dailyAverage: this.calculateAverage(history.filter(m => m.timestamp > oneDayAgo)),
      weeklyAverage: this.calculateAverage(history.filter(m => m.timestamp > oneWeekAgo)),
      monthlyAverage: this.calculateAverage(history.filter(m => m.timestamp > oneMonthAgo)),
      totalConnections: history.length,
      lastUpdated: now
    };

    this.aggregateMetrics.set(nodeAddress, aggregate);
  }

  private calculateAverage(metrics: NodeMetrics[]): NodeMetrics {
    if (metrics.length === 0) {
      return {
        nodeAddress: '',
        timestamp: Date.now(),
        latency: 0,
        bandwidth: 0,
        uptime: 0,
        reliability: 0
      };
    }

    const sum = metrics.reduce((acc, curr) => ({
      nodeAddress: curr.nodeAddress,
      timestamp: Date.now(),
      latency: acc.latency + curr.latency,
      bandwidth: acc.bandwidth + curr.bandwidth,
      uptime: acc.uptime + curr.uptime,
      reliability: acc.reliability + curr.reliability
    }));

    return {
      nodeAddress: sum.nodeAddress,
      timestamp: Date.now(),
      latency: sum.latency / metrics.length,
      bandwidth: sum.bandwidth / metrics.length,
      uptime: sum.uptime / metrics.length,
      reliability: sum.reliability / metrics.length
    };
  }

  private async collectMetrics(nodeAddress: string): Promise<NodeMetrics> {
    // Only collect performance metrics, no user or connection data
    return {
      nodeAddress,
      timestamp: Date.now(),
      latency: Math.random() * 100,
      bandwidth: 100 + Math.random() * 900,
      uptime: 95 + Math.random() * 5,
      reliability: 95 + Math.random() * 5
    };
  }

  private addMetrics(nodeAddress: string, metrics: NodeMetrics): void {
    const history = this.metricsHistory.get(nodeAddress) || [];
    history.push(metrics);

    // Keep only last 24 hours of metrics
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filteredHistory = history.filter(m => m.timestamp > oneDayAgo);
    
    this.metricsHistory.set(nodeAddress, filteredHistory);
  }

  // Public methods only return aggregated data
  getNodeStats(nodeAddress: string): AggregateMetrics | undefined {
    return this.aggregateMetrics.get(nodeAddress);
  }

  getAllNodesStats(): Map<string, AggregateMetrics> {
    return new Map(this.aggregateMetrics);
  }

  getPerformanceScore(nodeAddress: string): number {
    const stats = this.aggregateMetrics.get(nodeAddress);
    if (!stats) return 0;

    const daily = stats.dailyAverage;
    // Calculate score based on recent performance only
    return (
      (100 - daily.latency) * 0.3 +
      (daily.bandwidth / 10) * 0.25 +
      daily.uptime * 0.25 +
      daily.reliability * 0.2
    );
  }
} 