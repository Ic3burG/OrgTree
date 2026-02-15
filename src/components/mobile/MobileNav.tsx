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

import { NavLink, useParams } from 'react-router-dom';
import { Home, Map, Building2, Users } from 'lucide-react';

/**
 * MobileNav - Bottom navigation bar for mobile devices
 * Provides quick access to main sections with thumb-friendly buttons
 */
export default function MobileNav() {
  const { orgId } = useParams();

  const navItems = [
    {
      to: `/org/${orgId}`,
      icon: Home,
      label: 'Home',
      end: true,
    },
    {
      to: `/org/${orgId}/map`,
      icon: Map,
      label: 'Map',
    },
    {
      to: `/org/${orgId}/departments`,
      icon: Building2,
      label: 'Depts',
    },
    {
      to: `/org/${orgId}/people`,
      icon: Users,
      label: 'People',
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 z-40 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={24} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
                <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
