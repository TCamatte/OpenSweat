import { FTMSService } from './ftms-service';
import { FTMSData, EquipmentProfile, EquipmentType } from '@/types';
import { storageManager } from '@/core/storage/local-storage-manager';

export class DeviceManager {
  private ftmsService: FTMSService;
  private currentEquipment: EquipmentProfile | null = null;
  private onDataCallback: ((data: FTMSData) => void) | null = null;
  private onConnectionChangeCallback: ((connected: boolean) => void) | null = null;

  constructor() {
    this.ftmsService = new FTMSService();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ftmsService.onData((data: FTMSData) => {
      if (this.onDataCallback) {
        this.onDataCallback(data);
      }
    });

    this.ftmsService.onDisconnect(() => {
      console.log('Device disconnected');
      this.currentEquipment = null;
      if (this.onConnectionChangeCallback) {
        this.onConnectionChangeCallback(false);
      }
    });
  }

  async connectToEquipment(equipmentType: EquipmentType): Promise<EquipmentProfile> {
    try {
      const device = await this.ftmsService.connect(equipmentType);

      // Create equipment profile
      const equipmentProfile: EquipmentProfile = {
        id: device.id,
        name: device.name || 'Unknown Device',
        type: equipmentType,
        bluetoothId: device.id,
        characteristics: {
          serviceUUID: '1826',
          dataCharacteristic: equipmentType === 'bike' ? '2AD2' : '2ACD',
          controlCharacteristic: '2AD9'
        },
        capabilities: {
          canControlResistance: equipmentType === 'bike',
          canControlSpeed: equipmentType === 'treadmill',
          hasHeartRateMonitor: true
        },
        createdAt: Date.now(),
        lastConnected: Date.now()
      };

      // Save equipment profile
      await storageManager.saveEquipment(equipmentProfile);
      this.currentEquipment = equipmentProfile;

      if (this.onConnectionChangeCallback) {
        this.onConnectionChangeCallback(true);
      }

      console.log('Connected to equipment:', equipmentProfile.name);
      return equipmentProfile;

    } catch (error) {
      console.error('Failed to connect to equipment:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.ftmsService.disconnect();
      this.currentEquipment = null;

      if (this.onConnectionChangeCallback) {
        this.onConnectionChangeCallback(false);
      }

      console.log('Disconnected from equipment');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.ftmsService.isConnected();
  }

  getCurrentEquipment(): EquipmentProfile | null {
    return this.currentEquipment;
  }

  getDeviceInfo(): { name?: string; id?: string } {
    return {
      name: this.ftmsService.getDeviceName(),
      id: this.ftmsService.getDeviceId()
    };
  }

  // Control methods
  async setResistance(level: number): Promise<void> {
    if (!this.currentEquipment?.capabilities.canControlResistance) {
      throw new Error('Current equipment does not support resistance control');
    }

    if (level < 0 || level > 100) {
      throw new Error('Resistance level must be between 0 and 100');
    }

    return this.ftmsService.setResistanceLevel(level);
  }

  async setTargetPower(watts: number): Promise<void> {
    if (watts < 0) {
      throw new Error('Target power must be positive');
    }

    return this.ftmsService.setTargetPower(watts);
  }

  async startWorkout(): Promise<void> {
    return this.ftmsService.startWorkout();
  }

  async stopWorkout(): Promise<void> {
    return this.ftmsService.stopWorkout();
  }

  async resetWorkout(): Promise<void> {
    return this.ftmsService.resetWorkout();
  }

  // Event handlers
  onData(callback: (data: FTMSData) => void): void {
    this.onDataCallback = callback;
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionChangeCallback = callback;
  }

  // Equipment management
  async getStoredEquipment(): Promise<EquipmentProfile[]> {
    return storageManager.getEquipment();
  }

  async removeEquipment(id: string): Promise<void> {
    return storageManager.deleteEquipment(id);
  }

  async updateLastConnected(equipmentId: string): Promise<void> {
    return storageManager.updateLastConnected(equipmentId);
  }

  async getLastConnectedEquipment(): Promise<EquipmentProfile | null> {
    try {
      const equipment = await storageManager.getEquipment();
      // Return the most recently connected equipment
      return equipment.length > 0 ? equipment[0] : null; // Already sorted by lastConnected DESC
    } catch (error) {
      console.error('Failed to get last connected equipment:', error);
      return null;
    }
  }

  async attemptAutoReconnect(): Promise<boolean> {
    try {
      console.log('Attempting auto-reconnect to last connected equipment...');
      const lastEquipment = await this.getLastConnectedEquipment();

      if (!lastEquipment) {
        console.log('No previously connected equipment found');
        return false;
      }

      console.log(`Attempting to reconnect to ${lastEquipment.name} (${lastEquipment.type})`);

      // Try to reconnect using the stored equipment type
      const reconnectedEquipment = await this.connectToEquipment(lastEquipment.type);

      // Update the lastConnected timestamp for the reconnected equipment
      await this.updateLastConnected(reconnectedEquipment.id);

      // Check if we connected to the same device (by ID)
      if (reconnectedEquipment.id === lastEquipment.id) {
        console.log(`Successfully reconnected to ${lastEquipment.name}`);
        return true;
      } else {
        console.log(`Connected to a different device: ${reconnectedEquipment.name}`);
        return true; // Still a successful connection, just not the same device
      }

    } catch (error) {
      console.log('Auto-reconnect failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const deviceManager = new DeviceManager();