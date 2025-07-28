import { ethers } from 'ethers';

interface NodeMetrics {
  latency: number;
  bandwidth: number;
  uptime: number;
  reliability: number;
}

interface NodeHealth {
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  score: number;
  recommendations: string[];
}

class MetricsService {
  private nodeHistory: Map<string, NodeMetrics[]> = new Map();
  private readonly HISTORY_LENGTH = 10; // Keep last 10 measurements
  private readonly WEIGHTS = {
    latency: 0.3,      // 30% weight - lower is better
    bandwidth: 0.25,   // 25% weight - higher is better
    uptime: 0.25,      // 25% weight - higher is better
    reliability: 0.2   // 20% weight - higher is better
  };

  // Add new metrics for a node
  public addMetrics(nodeAddress: string, metrics: NodeMetrics): void {
    const history = this.nodeHistory.get(nodeAddress) || [];
    
    history.push(metrics);

    // Keep only the last HISTORY_LENGTH entries
    if (history.length > this.HISTORY_LENGTH) {
      history.shift();
    }

    this.nodeHistory.set(nodeAddress, history);
  }

  // Calculate the total score for a node
  public calculateScore(metrics: NodeMetrics): number {
    // Normalize metrics to a 0-100 scale
    const normalizedLatency = Math.max(0, 100 - (metrics.latency / 2)); // 200ms -> 0, 0ms -> 100
    const normalizedBandwidth = Math.min(100, (metrics.bandwidth / 10)); // 1000Mbps -> 100
    const normalizedUptime = metrics.uptime; // Already 0-100
    const normalizedReliability = metrics.reliability; // Already 0-100

    // Calculate weighted score
    const score = 
      (normalizedLatency * this.WEIGHTS.latency) +
      (normalizedBandwidth * this.WEIGHTS.bandwidth) +
      (normalizedUptime * this.WEIGHTS.uptime) +
      (normalizedReliability * this.WEIGHTS.reliability);

    return Math.round(score);
  }

  // Predict future metrics using simple trend analysis
  public predictMetrics(nodeAddress: string): NodeMetrics | null {
    const history = this.nodeHistory.get(nodeAddress);
    if (!history || history.length < 2) return null;

    const metrics = history;

    // Calculate trends for each metric
    const trends = {
      latency: this.calculateTrend(history.map(m => Date.now()), history.map(m => m.latency)),
      bandwidth: this.calculateTrend(history.map(m => Date.now()), history.map(m => m.bandwidth)),
      uptime: this.calculateTrend(history.map(m => Date.now()), history.map(m => m.uptime)),
      reliability: this.calculateTrend(history.map(m => Date.now()), history.map(m => m.reliability))
    };

    // Get the most recent metrics
    const latest = metrics[metrics.length - 1];

    // Predict next values (with bounds)
    return {
      latency: Math.max(0, Math.round(latest.latency + trends.latency)),
      bandwidth: Math.max(0, Math.round(latest.bandwidth + trends.bandwidth)),
      uptime: Math.min(100, Math.max(0, Math.round(latest.uptime + trends.uptime))),
      reliability: Math.min(100, Math.max(0, Math.round(latest.reliability + trends.reliability)))
    };
  }

  // Calculate recommendation score based on user preferences
  public calculateRecommendationScore(
    metrics: NodeMetrics,
    preferences: {
      latencyPriority: number;  // 1-5
      bandwidthPriority: number;  // 1-5
      reliabilityPriority: number;  // 1-5
    }
  ): number {
    // Normalize preferences to weights that sum to 1
    const total = preferences.latencyPriority + preferences.bandwidthPriority + preferences.reliabilityPriority;
    const weights = {
      latency: preferences.latencyPriority / total,
      bandwidth: preferences.bandwidthPriority / total,
      reliability: (preferences.reliabilityPriority / total) + this.WEIGHTS.uptime // Combine reliability and uptime
    };

    // Normalize metrics
    const normalizedLatency = Math.max(0, 100 - (metrics.latency / 2));
    const normalizedBandwidth = Math.min(100, (metrics.bandwidth / 10));
    const reliabilityScore = (metrics.reliability + metrics.uptime) / 2;

    // Calculate personalized score
    const score = 
      (normalizedLatency * weights.latency) +
      (normalizedBandwidth * weights.bandwidth) +
      (reliabilityScore * weights.reliability);

    return Math.round(score);
  }

  // Helper function to calculate trend
  private calculateTrend(timestamps: number[], values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = values.length;

    for (let i = 0; i < n; i++) {
      const x = timestamps[i];
      const y = values[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope * (timestamps[1] - timestamps[0]); // Expected change per interval
  }

  // Get health status and recommendations
  public getNodeHealth(nodeAddress: string): NodeHealth {
    const history = this.nodeHistory.get(nodeAddress) || [];
    if (history.length === 0) {
      return {
        status: 'Fair',
        score: 0,
        recommendations: ['Insufficient data to make recommendations']
      };
    }

    // Calculate averages
    const avgLatency = history.reduce((sum, record) => sum + record.latency, 0) / history.length;
    const avgBandwidth = history.reduce((sum, record) => sum + record.bandwidth, 0) / history.length;
    const avgUptime = history.reduce((sum, record) => sum + record.uptime, 0) / history.length;

    const recommendations: string[] = [];

    if (avgLatency > 100) recommendations.push('High latency detected. Consider switching to a closer node.');
    if (avgBandwidth < 50) recommendations.push('Low bandwidth. Network might be congested.');
    if (avgUptime < 95) recommendations.push('Poor uptime. Node might be unstable.');

    const score = this.calculateScore({
      latency: avgLatency,
      bandwidth: avgBandwidth,
      uptime: avgUptime,
      reliability: history[history.length - 1].reliability
    });

    let status: NodeHealth['status'];
    if (score >= 90) status = 'Excellent';
    else if (score >= 75) status = 'Good';
    else if (score >= 60) status = 'Fair';
    else status = 'Poor';

    return {
      status,
      score,
      recommendations
    };
  }
}

export const metricsService = new MetricsService(); 