import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

interface RealtimeNotificationEvent extends CustomEvent {
  detail: {
    message: string;
    type?: ToastType;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000): void => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    },
    []
  );

  const removeToast = useCallback((id: number): void => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Listen for realtime notification events from Socket.IO hook
  useEffect(() => {
    const handleRealtimeNotification = (event: Event): void => {
      const customEvent = event as RealtimeNotificationEvent;
      const { message, type } = customEvent.detail;
      addToast(message, type || 'info');
    };

    window.addEventListener('realtime-notification', handleRealtimeNotification);
    return () => {
      window.removeEventListener('realtime-notification', handleRealtimeNotification);
    };
  }, [addToast]);

  const toast: ToastContextValue = useMemo(
    () => ({
      success: (message: string) => addToast(message, 'success'),
      error: (message: string) => addToast(message, 'error'),
      info: (message: string) => addToast(message, 'info'),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 lg:bottom-4 lg:left-auto lg:right-4 z-50 space-y-2">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: ToastItemProps): React.JSX.Element {
  const icons: Record<ToastType, React.JSX.Element> = {
    success: <CheckCircle className="text-green-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    info: <AlertCircle className="text-blue-500" size={20} />,
  };

  const backgrounds: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${backgrounds[toast.type]} animate-slide-in-right w-full lg:min-w-[300px] lg:w-auto`}
    >
      {icons[toast.type]}
      <span className="text-slate-700 flex-1">{toast.message}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2">
        <X size={16} />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
