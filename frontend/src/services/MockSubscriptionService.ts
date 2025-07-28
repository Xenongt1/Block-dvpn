// Mock subscription service for development mode
export class MockSubscriptionService {
  private static subscriptions: Map<string, number> = new Map(); // address -> end time
  private static readonly SUBSCRIPTION_FEE = "0.01"; // Mock fee in ETH
  private static readonly SUBSCRIPTION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
  
  // Admin management
  private static superAdmin: string | null = null;
  private static admins: Set<string> = new Set();

  constructor() {
    // Initialize super admin if not already set
    if (!MockSubscriptionService.superAdmin) {
      // Use a default dev address or get from localStorage
      const devAddress = localStorage.getItem('userAddress') || 'dev-super-admin';
      MockSubscriptionService.superAdmin = devAddress;
      MockSubscriptionService.admins.add(devAddress);
    }
  }

  async initialize(): Promise<void> {
    // No initialization needed for mock service
    return;
  }

  async subscribe(): Promise<boolean> {
    const userAddress = localStorage.getItem('userAddress') || 'dev-user-address';
    
    // Admins don't need to subscribe
    const isAdminUser = await this.isAdmin(userAddress);
    if (isAdminUser) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = currentTime + MockSubscriptionService.SUBSCRIPTION_DURATION;
    
    MockSubscriptionService.subscriptions.set(userAddress, endTime);
    return true;
  }

  async checkSubscription(address: string): Promise<boolean> {
    // Admins always have access
    const isAdminUser = await this.isAdmin(address);
    if (isAdminUser) {
      return true;
    }

    const endTime = MockSubscriptionService.subscriptions.get(address);
    if (!endTime) return false;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return endTime > currentTime;
  }

  async getRemainingTime(address: string): Promise<number> {
    // Admins have unlimited time
    const isAdminUser = await this.isAdmin(address);
    if (isAdminUser) {
      return Number.MAX_SAFE_INTEGER; // Simulating unlimited time
    }

    const endTime = MockSubscriptionService.subscriptions.get(address);
    if (!endTime) return 0;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, endTime - currentTime);
  }

  async cancelSubscription(): Promise<boolean> {
    const userAddress = localStorage.getItem('userAddress') || 'dev-user-address';
    
    // Admins can't cancel (they don't have subscriptions)
    const isAdminUser = await this.isAdmin(userAddress);
    if (isAdminUser) {
      throw new Error("Admins don't have subscriptions to cancel");
    }
    
    MockSubscriptionService.subscriptions.delete(userAddress);
    return true;
  }

  async getSubscriptionFee(): Promise<string> {
    return MockSubscriptionService.SUBSCRIPTION_FEE;
  }

  // Admin management methods
  async addAdmin(address: string): Promise<boolean> {
    const callerAddress = localStorage.getItem('userAddress') || 'dev-user-address';
    
    // Only super admin can add admins
    if (callerAddress !== MockSubscriptionService.superAdmin) {
      throw new Error('Only super admin can add admins');
    }

    if (MockSubscriptionService.admins.has(address)) {
      throw new Error('Address is already an admin');
    }

    MockSubscriptionService.admins.add(address);
    return true;
  }

  async removeAdmin(address: string): Promise<boolean> {
    const callerAddress = localStorage.getItem('userAddress') || 'dev-user-address';
    
    // Only super admin can remove admins
    if (callerAddress !== MockSubscriptionService.superAdmin) {
      throw new Error('Only super admin can remove admins');
    }

    if (address === MockSubscriptionService.superAdmin) {
      throw new Error('Cannot remove super admin');
    }

    if (!MockSubscriptionService.admins.has(address)) {
      throw new Error('Address is not an admin');
    }

    MockSubscriptionService.admins.delete(address);
    return true;
  }

  async isAdmin(address: string): Promise<boolean> {
    return address === MockSubscriptionService.superAdmin || MockSubscriptionService.admins.has(address);
  }

  async isSuperAdmin(address: string): Promise<boolean> {
    return address === MockSubscriptionService.superAdmin;
  }

  async transferSuperAdmin(newSuperAdmin: string): Promise<boolean> {
    const callerAddress = localStorage.getItem('userAddress') || 'dev-user-address';
    
    // Only current super admin can transfer the role
    if (callerAddress !== MockSubscriptionService.superAdmin) {
      throw new Error('Only super admin can transfer super admin role');
    }

    if (newSuperAdmin === MockSubscriptionService.superAdmin) {
      throw new Error('Address is already super admin');
    }

    MockSubscriptionService.superAdmin = newSuperAdmin;
    MockSubscriptionService.admins.add(newSuperAdmin);
    return true;
  }

  // Development helper methods
  static clearAllSubscriptions(): void {
    MockSubscriptionService.subscriptions.clear();
  }

  static setMockSubscription(address: string, durationInDays: number): void {
    // Don't set subscriptions for admins
    if (MockSubscriptionService.admins.has(address) || address === MockSubscriptionService.superAdmin) {
      return;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = currentTime + (durationInDays * 24 * 60 * 60);
    MockSubscriptionService.subscriptions.set(address, endTime);
  }

  // Development helper methods for admin management
  static clearAllAdmins(): void {
    const superAdmin = MockSubscriptionService.superAdmin;
    MockSubscriptionService.admins.clear();
    if (superAdmin) {
      MockSubscriptionService.admins.add(superAdmin);
    }
  }

  static setMockSuperAdmin(address: string): void {
    MockSubscriptionService.superAdmin = address;
    MockSubscriptionService.admins.add(address);
  }

  static addMockAdmin(address: string): void {
    MockSubscriptionService.admins.add(address);
  }
} 