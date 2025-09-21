import { FTMSData } from '@/types';

export class FTMSService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private dataCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private controlCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onDataCallback: ((data: FTMSData) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  // FTMS Service UUID
  private static readonly FTMS_SERVICE_UUID = 0x1826;

  // FTMS Characteristic UUIDs
  private static readonly INDOOR_BIKE_DATA_UUID = 0x2AD2;
  private static readonly TREADMILL_DATA_UUID = 0x2ACD;
  private static readonly FITNESS_MACHINE_CONTROL_POINT_UUID = 0x2AD9;
  private static readonly FITNESS_MACHINE_STATUS_UUID = 0x2ADA;
  private static readonly SUPPORTED_RESISTANCE_LEVEL_RANGE = 0x2AD6;

  async connect(equipmentType: 'bike' | 'treadmill' | 'rower' = 'bike'): Promise<BluetoothDevice> {
    if (!('bluetooth' in navigator)) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }

    try {
      // Request device with FTMS service
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{
          services: [FTMSService.FTMS_SERVICE_UUID]
        }],
        optionalServices: ['heart_rate']
      });

      // Set up disconnect handler
      this.device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected');
        this.cleanup();
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
      });

      // Connect to GATT server
      this.server = await this.device.gatt!.connect();
      console.log('Connected to GATT server');

      // Get FTMS service
      this.service = await this.server.getPrimaryService(FTMSService.FTMS_SERVICE_UUID);
      console.log('Got FTMS service');

      // Get data characteristic based on equipment type
      const dataUUID = equipmentType === 'bike'
        ? FTMSService.INDOOR_BIKE_DATA_UUID
        : FTMSService.TREADMILL_DATA_UUID;

      this.dataCharacteristic = await this.service.getCharacteristic(dataUUID);
      console.log('Got data characteristic');

      // Try to get control characteristic (optional)
      try {
        this.controlCharacteristic = await this.service.getCharacteristic(
          FTMSService.FITNESS_MACHINE_CONTROL_POINT_UUID
        );
        console.log('Got control characteristic');
      } catch (error) {
        console.warn('Control characteristic not available:', error);
      }

      try{
        var resLevels = await this.service.getCharacteristic(FTMSService.SUPPORTED_RESISTANCE_LEVEL_RANGE);
        console.log("Got Res levels:")
        console.log(resLevels);
      }catch (error) {
        console.warn('Resistance characteristics not available:', error);
      }

      // Start notifications for data
      await this.dataCharacteristic.startNotifications();
      this.dataCharacteristic.addEventListener('characteristicvaluechanged',
        this.handleDataNotification.bind(this));

      console.log('FTMS connection established successfully');
      return this.device;

    } catch (error) {
      console.error('Failed to connect to FTMS device:', error);
      this.cleanup();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.device = null;
    this.server = null;
    this.service = null;
    this.dataCharacteristic = null;
    this.controlCharacteristic = null;
  }

  isConnected(): boolean {
    return this.device?.gatt?.connected ?? false;
  }

  getDeviceName(): string | undefined {
    return this.device?.name;
  }

  getDeviceId(): string | undefined {
    return this.device?.id;
  }

  onData(callback: (data: FTMSData) => void): void {
    this.onDataCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  private handleDataNotification(event: Event): void {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value!;

    try {
      const data = this.parseIndoorBikeData(value);
      if (this.onDataCallback) {
        this.onDataCallback(data);
      }
    } catch (error) {
      console.error('Failed to parse FTMS data:', error);
    }
  }

  private parseIndoorBikeData(value: DataView): FTMSData {
    const data: FTMSData = {
      timestamp: Date.now()
    };

    // Parse flags (first 2 bytes)
    const flags = value.getUint16(0, true); // little endian
    let position = 4; // Skip flags (2 bytes) and instantaneous speed (2 bytes)

    // Instantaneous Speed (always present) - resolution 0.01 km/h
    data.speed = value.getUint16(2, true) * 0.01;

    // Average Speed flag (bit 1)
    if (flags & (1 << 1)) {
      position += 2;
    }

    // Instantaneous Cadence flag (bit 2)
    if (flags & (1 << 2)) {
      data.cadence = value.getUint16(position, true) * 0.5;
      position += 2;
    }

    // Average Cadence flag (bit 3)
    if (flags & (1 << 3)) {
      position += 2;
    }

    // Total Distance flag (bit 4)
    if (flags & (1 << 4)) {
      // Total distance is 3 bytes
      const distanceLow = value.getUint16(position, true);
      const distanceHigh = value.getUint8(position + 2);
      data.distance = (distanceHigh << 16 | distanceLow) * 0.1; // resolution 0.1 m
      position += 3;
    }

    // Resistance Level flag (bit 5)
    if (flags & (1 << 5)) {
      data.resistance = value.getInt16(position, true);
      position += 2;
    }

    // Instantaneous Power flag (bit 6)
    if (flags & (1 << 6)) {
      data.power = value.getInt16(position, true);
      position += 2;
    }

    // Average Power flag (bit 7)
    if (flags & (1 << 7)) {
      position += 2;
    }

    // Expended Energy flag (bit 8)
    if (flags & (1 << 8)) {
      data.calories = value.getUint16(position, true);
      position += 5; // Total energy (2) + Energy per hour (2) + Energy per minute (1)
    }

    // Heart Rate flag (bit 9)
    if (flags & (1 << 9)) {
      data.heartRate = value.getUint8(position);
      position += 1;
    }

    // Skip remaining fields for now (Metabolic Equivalent, Elapsed Time, Remaining Time)

    return data;
  }

  // Control functions for bike
  async setResistanceLevel(level: number): Promise<void> {
    if (!this.controlCharacteristic) {
      throw new Error('Control characteristic not available');
    }

    // FTMS Control Point - Set Target Resistance Level
    // OpCode: 0x04, Parameter: resistance level (0.1 increments)
    const command = new Uint8Array(2);
    command[0] = 0x04; // Set Target Resistance Level

    // Convert percentage to FTMS resistance units (0.1 increments)
    const resistanceValue = Math.round(level);
    command[1] = resistanceValue & 0xFF;

    try {
      var result = await this.controlCharacteristic.writeValue(command);
      console.log(`Set resistance level to ${level}%. Response: ${result}`);
    } catch (error) {
      console.error('Failed to set resistance level:', error);
      throw error;
    }
  }

  async setTargetPower(watts: number): Promise<void> {
    if (!this.controlCharacteristic) {
      throw new Error('Control characteristic not available');
    }

    // FTMS Control Point - Set Target Power
    // OpCode: 0x05, Parameter: power in watts
    const command = new Uint8Array(3);
    command[0] = 0x05; // Set Target Power
    command[1] = watts & 0xFF;
    command[2] = (watts >> 8) & 0xFF;

    try {
      //await this.controlCharacteristic.writeValue(command);
      console.log(`Set target power to ${watts}W`);
    } catch (error) {
      console.error('Failed to set target power:', error);
      throw error;
    }
  }

  async startWorkout(): Promise<void> {
    if (!this.controlCharacteristic) {
      throw new Error('Control characteristic not available');
    }

    // FTMS Control Point - Request Control
    const command = new Uint8Array(1);
    command[0] = 0x00; // Request Control

    try {
      await this.controlCharacteristic.writeValue(command);
      console.log('Started workout control');
    } catch (error) {
      console.error('Failed to start workout:', error);
      throw error;
    }
  }

  async stopWorkout(): Promise<void> {
    if (!this.controlCharacteristic) {
      throw new Error('Control characteristic not available');
    }

    // FTMS Control Point - Stop
    const command = new Uint8Array(1);
    command[0] = 0x02; // Stop or Pause

    try {
      await this.controlCharacteristic.writeValue(command);
      console.log('Stopped workout');
    } catch (error) {
      console.error('Failed to stop workout:', error);
      throw error;
    }
  }

  async resetWorkout(): Promise<void> {
    if (!this.controlCharacteristic) {
      throw new Error('Control characteristic not available');
    }

    // FTMS Control Point - Reset
    const command = new Uint8Array(1);
    command[0] = 0x01; // Reset

    try {
      await this.controlCharacteristic.writeValue(command);
      console.log('Reset workout');
    } catch (error) {
      console.error('Failed to reset workout:', error);
      throw error;
    }
  }
}