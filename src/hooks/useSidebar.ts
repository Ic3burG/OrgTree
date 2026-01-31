import { useState, useEffect, useCallback, useRef } from 'react';

export type SidebarState = 'expanded' | 'minimized' | 'hidden';

export interface UseSidebarOptions {
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  defaultState?: SidebarState;
  storageKey?: string;
  widthStorageKey?: string;
  pinnedStorageKey?: string;
}

export interface UseSidebarReturn {
  // State
  state: SidebarState;
  width: number;
  pinned: boolean;

  // Actions
  setState: (state: SidebarState) => void;
  setWidth: (width: number) => void;
  setPinned: (pinned: boolean) => void;
  cycleState: () => void; // expanded → minimized → hidden → expanded
  toggleExpanded: () => void; // expanded ↔ hidden (skip minimized)
  togglePinned: () => void;
  reset: () => void; // Reset to defaults

  // Computed
  isExpanded: boolean;
  isMinimized: boolean;
  isHidden: boolean;
  showFAB: boolean;
}

const DEFAULT_OPTIONS: Required<
  Omit<UseSidebarOptions, 'storageKey' | 'widthStorageKey' | 'pinnedStorageKey'>
> = {
  minWidth: 200,
  maxWidth: 400,
  defaultWidth: 256,
  defaultState: 'expanded',
};

export function useSidebar(options: UseSidebarOptions = {}): UseSidebarReturn {
  const {
    minWidth,
    maxWidth,
    defaultWidth,
    defaultState,
    storageKey = 'sidebarState',
    widthStorageKey = 'sidebarWidth',
    pinnedStorageKey = 'sidebarPinned',
  } = { ...DEFAULT_OPTIONS, ...options };

  // Initialize state from storage or defaults
  const [state, setInternalState] = useState<SidebarState>(() => {
    // Check for legacy key migration if new key doesn't exist
    const legacyCollapsed = localStorage.getItem('adminSidebarCollapsed');
    const storedState = localStorage.getItem(storageKey);

    if (!storedState && legacyCollapsed !== null) {
      // Migrate legacy state
      return legacyCollapsed === 'true' ? 'minimized' : 'expanded';
    }

    return (storedState as SidebarState) || defaultState;
  });

  const [width, setInternalWidth] = useState<number>(() => {
    const storedWidth = localStorage.getItem(widthStorageKey);
    return storedWidth ? parseInt(storedWidth, 10) : defaultWidth;
  });

  const [pinned, setInternalPinned] = useState<boolean>(() => {
    const storedPinned = localStorage.getItem(pinnedStorageKey);
    return storedPinned !== null ? storedPinned === 'true' : true;
  });

  // Refs to avoid stale closures in event listeners
  const stateRef = useRef(state);
  const pinnedRef = useRef(pinned);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  // Persist state changes
  const setState = useCallback(
    (newState: SidebarState) => {
      setInternalState(newState);
      localStorage.setItem(storageKey, newState);
    },
    [storageKey]
  );

  const setWidth = useCallback(
    (newWidth: number) => {
      // Clamp width
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setInternalWidth(clampedWidth);
      localStorage.setItem(widthStorageKey, clampedWidth.toString());
    },
    [minWidth, maxWidth, widthStorageKey]
  );

  const setPinned = useCallback(
    (newPinned: boolean) => {
      setInternalPinned(newPinned);
      localStorage.setItem(pinnedStorageKey, newPinned.toString());
    },
    [pinnedStorageKey]
  );

  const togglePinned = useCallback(() => {
    setPinned(!pinned);
  }, [pinned, setPinned]);

  // Actions
  const cycleState = useCallback(() => {
    if (state === 'expanded') setState('minimized');
    else if (state === 'minimized') setState('hidden');
    else setState('expanded');
  }, [state, setState]);

  const toggleExpanded = useCallback(() => {
    // Toggle between expanded and the last non-expanded state (or hidden if currently expanded)
    // For simplicity based on RFC: expanded ↔ hidden
    if (state === 'hidden') setState('expanded');
    else setState('hidden');
  }, [state, setState]);

  const reset = useCallback(() => {
    setState(defaultState);
    setWidth(defaultWidth);
    setPinned(true);
  }, [defaultState, defaultWidth, setState, setWidth, setPinned]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (e.shiftKey) {
          // Ctrl+Shift+B: Toggle expanded/hidden
          if (stateRef.current === 'hidden') {
            setState('expanded');
          } else {
            setState('hidden');
          }
        } else {
          // Ctrl+B: Cycle states
          if (stateRef.current === 'expanded') setState('minimized');
          else if (stateRef.current === 'minimized') setState('hidden');
          else setState('expanded');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setState]);

  return {
    state,
    width,
    pinned,
    setState,
    setWidth,
    setPinned,
    togglePinned,
    cycleState,
    toggleExpanded,
    reset,
    isExpanded: state === 'expanded',
    isMinimized: state === 'minimized',
    isHidden: state === 'hidden',
    showFAB: state === 'hidden',
  };
}
