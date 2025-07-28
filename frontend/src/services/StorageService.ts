import { VPNNode } from '../types/VPNNode';

const STORAGE_KEYS = {
  RECENT_CONNECTIONS: 'dvpn_recent_connections',
  FAVORITE_NODES: 'dvpn_favorite_nodes',
  PERFORMANCE_HISTORY: 'dvpn_performance_history',
  USER_PREFERENCES: 'dvpn_user_preferences'
};

interface PerformanceRecord {
  nodeAddress: string;
  timestamp: number;
  latency: number;
  bandwidth: number;
  uptime: number;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  autoConnect: boolean;
  preferredNodes: string[];
}

export const StorageService = {
  // Recent Connections
  saveRecentConnection(nodeAddress: string) {
    try {
      const recent = this.getRecentConnections();
      const updated = [nodeAddress, ...recent.filter(addr => addr !== nodeAddress)].slice(0, 5);
      localStorage.setItem(STORAGE_KEYS.RECENT_CONNECTIONS, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent connection:', error);
    }
  },

  getRecentConnections(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_CONNECTIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting recent connections:', error);
      return [];
    }
  },

  // Favorite Nodes
  toggleFavoriteNode(nodeAddress: string) {
    try {
      const favorites = this.getFavoriteNodes();
      const updated = favorites.includes(nodeAddress)
        ? favorites.filter(addr => addr !== nodeAddress)
        : [...favorites, nodeAddress];
      localStorage.setItem(STORAGE_KEYS.FAVORITE_NODES, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Error toggling favorite node:', error);
      return [];
    }
  },

  getFavoriteNodes(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVORITE_NODES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting favorite nodes:', error);
      return [];
    }
  },

  // Performance History
  savePerformanceRecord(record: PerformanceRecord) {
    try {
      const history = this.getPerformanceHistory();
      const updated = [...history, record].slice(-100); // Keep last 100 records
      localStorage.setItem(STORAGE_KEYS.PERFORMANCE_HISTORY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving performance record:', error);
    }
  },

  getPerformanceHistory(): PerformanceRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERFORMANCE_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting performance history:', error);
      return [];
    }
  },

  // User Preferences
  saveUserPreferences(preferences: Partial<UserPreferences>) {
    try {
      const current = this.getUserPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  },

  getUserPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return stored ? JSON.parse(stored) : {
        theme: 'dark',
        autoConnect: false,
        preferredNodes: []
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {
        theme: 'dark',
        autoConnect: false,
        preferredNodes: []
      };
    }
  },

  // Clear all stored data
  clearAllData() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}; 