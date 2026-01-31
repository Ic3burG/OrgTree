import React, { useState, useEffect, useRef } from 'react';
import { Menu, LucideIcon } from 'lucide-react';

interface FloatingActionButtonProps {
  visible: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  position?: 'bottom-left' | 'bottom-right';
  autoHide?: boolean;
  autoHideDelay?: number;
  className?: string;
}

export default function FloatingActionButton({
  visible,
  onClick,
  icon: Icon = Menu,
  position = 'bottom-left',
  autoHide = true,
  autoHideDelay = 3000,
  className = '',
}: FloatingActionButtonProps): React.JSX.Element | null {
  const [isFaded, setIsFaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || !autoHide) {
      setIsFaded(false);
      return;
    }

    const resetTimer = () => {
      setIsFaded(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsFaded(true);
      }, autoHideDelay);
    };

    resetTimer();

    const handleMouseMove = () => resetTimer();
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, autoHide, autoHideDelay]);

  if (!visible) return null;

  const positionClasses = position === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4';

  return (
    <button
      onClick={onClick}
      className={`fixed ${positionClasses} z-50 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-300 ${
        isFaded ? 'opacity-30 hover:opacity-100' : 'opacity-100'
      } ${className}`}
      aria-label="Open sidebar"
      title="Open sidebar"
    >
      <Icon size={24} />
    </button>
  );
}
