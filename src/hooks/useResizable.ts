import React, { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizableOptions {
  minWidth: number;
  maxWidth: number;
  initialWidth: number;
  onResize?: (width: number) => void;
  onResizeEnd?: (width: number) => void;
}

interface UseResizableReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: React.MouseEventHandler;
  setWidth: (width: number) => void;
}

export function useResizable({
  minWidth,
  maxWidth,
  initialWidth,
  onResize,
  onResizeEnd,
}: UseResizableOptions): UseResizableReturn {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  // Refs to store transient values during drag to avoid re-renders
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Sync internal width if initialWidth prop changes (optional, depending on use case)
  // For sidebar, we usually want internal state to be truth, but if we reset from outside:
  useEffect(() => {
    setWidth(initialWidth);
  }, [initialWidth]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + deltaX));

      setWidth(newWidth);
      if (onResize) {
        onResize(newWidth);
      }
    },
    [isResizing, minWidth, maxWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (onResizeEnd) {
        onResizeEnd(width);
      }
    }
  }, [isResizing, width, onResizeEnd]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width]
  );

  return {
    width,
    isResizing,
    handleMouseDown,
    setWidth,
  };
}
