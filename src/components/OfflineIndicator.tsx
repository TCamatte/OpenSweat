import { useAppStore } from '@/core/storage/app-store';

export default function OfflineIndicator() {
  const { isOnline } = useAppStore();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2">
      <div className="max-w-md mx-auto flex items-center justify-center space-x-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">You're offline</span>
        <span className="text-xs opacity-75">- App continues to work</span>
      </div>
    </div>
  );
}