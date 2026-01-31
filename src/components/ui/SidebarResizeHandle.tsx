import React from 'react';
import { GripVertical } from 'lucide-react';

interface SidebarResizeHandleProps {
  onMouseDown: React.MouseEventHandler;
  isResizing: boolean;
  className?: string;
}

export default function SidebarResizeHandle({
  onMouseDown,
  isResizing,
  className = '',
}: SidebarResizeHandleProps): React.JSX.Element {
  return (
    <div
      className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 z-50 group transition-colors ${
        isResizing ? 'bg-blue-600' : 'bg-transparent'
      } ${className}`}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize sidebar"
    >
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 
        opacity-0 group-hover:opacity-100 ${isResizing ? 'opacity-100' : ''} 
        transition-opacity duration-200 pointer-events-none`}
      >
        <div className="bg-white dark:bg-slate-700 shadow-md border border-gray-200 dark:border-slate-600 rounded-full p-0.5">
          <GripVertical size={12} className="text-gray-400 dark:text-slate-400" />
        </div>
      </div>
    </div>
  );
}
