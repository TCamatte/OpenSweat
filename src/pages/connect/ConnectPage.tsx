import { useState } from 'react';
import { useAppStore, useEquipmentStore } from '@/core/storage/app-store';
import { deviceManager } from '@/core/bluetooth/device-manager';
import { EquipmentType } from '@/types';

export default function ConnectPage() {
  const { bluetooth, connectedEquipment, setBluetoothState, setConnectedEquipment } = useAppStore();
  const { isScanning, connectionError, setScanning, setConnectionError } = useEquipmentStore();
  const [selectedDeviceType, setSelectedDeviceType] = useState<EquipmentType>('bike');

  const handleConnect = async () => {
    if (!('bluetooth' in navigator)) {
      setConnectionError('Bluetooth is not supported in this browser');
      return;
    }

    setScanning(true);
    setConnectionError(undefined);

    try {
      const equipmentProfile = await deviceManager.connectToEquipment(selectedDeviceType);

      // Update app state
      setConnectedEquipment(equipmentProfile);
      setBluetoothState({
        isConnected: true,
        deviceId: equipmentProfile.id,
        deviceName: equipmentProfile.name,
        lastConnected: Date.now()
      });

      console.log('Connected to device:', equipmentProfile.name);

    } catch (error) {
      console.error('Connection failed:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setScanning(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await deviceManager.disconnect();
      setConnectedEquipment(undefined);
      setBluetoothState({
        isConnected: false,
        deviceId: undefined,
        deviceName: undefined
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const deviceTypes = [
    {
      id: 'bike' as const,
      name: 'Indoor Bike',
      icon: '🚴',
      description: 'Training Bike 900, Challenge Bike'
    },
    {
      id: 'treadmill' as const,
      name: 'Treadmill',
      icon: '🏃',
      description: 'Run100E, W900, T900D'
    },
    {
      id: 'rower' as const,
      name: 'Rowing Machine',
      icon: '🚣',
      description: 'WoodRower, Training Rower 900'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Equipment
        </h2>
        <p className="text-gray-600">
          Connect your Domyos equipment via Bluetooth
        </p>
      </div>

      {/* Connection Status */}
      {bluetooth.isConnected && connectedEquipment ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-900">
                ✅ Connected
              </h3>
              <p className="text-green-700 mt-1">
                {connectedEquipment.name}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {connectedEquipment.type.charAt(0).toUpperCase() + connectedEquipment.type.slice(1)}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Device Type Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Equipment Type
            </h3>
            <div className="space-y-3">
              {deviceTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedDeviceType(type.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
                    selectedDeviceType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {type.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Connect Button */}
          <div>
            <button
              onClick={handleConnect}
              disabled={isScanning}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isScanning ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Scanning for devices...</span>
                </div>
              ) : (
                `Connect ${selectedDeviceType.charAt(0).toUpperCase() + selectedDeviceType.slice(1)}`
              )}
            </button>
          </div>
        </>
      )}

      {/* Error Display */}
      {connectionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-900 mb-2">
            Connection Error
          </h3>
          <p className="text-red-700 text-sm">
            {connectionError}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          Connection Instructions
        </h3>
        <ol className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <span>Make sure your Domyos equipment is powered on</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <span>Enable Bluetooth on your device</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <span>Select the correct equipment type above</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
            <span>Tap "Connect" and select your device</span>
          </li>
        </ol>
      </div>

      {/* Supported Equipment */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          Supported Equipment
        </h3>
        <div className="text-sm text-gray-700 space-y-1">
          <p><strong>Bikes:</strong> Training Bike 900, Challenge Bike</p>
          <p><strong>Treadmills:</strong> Run100E, W900, T900D, RUN500</p>
          <p><strong>Rowers:</strong> WoodRower, Training Rower 900</p>
          <p><strong>Ellipticals:</strong> EL520, EL540</p>
        </div>
      </div>
    </div>
  );
}