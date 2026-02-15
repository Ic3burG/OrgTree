/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

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
