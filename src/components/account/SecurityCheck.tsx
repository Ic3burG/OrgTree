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

import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight, X, Smartphone, Fingerprint } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { api } from '../../api/client';

export default function SecurityCheck(): React.JSX.Element | null {
  const [show, setShow] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(true); // Default true to avoid flash
  const [hasPasskeys, setHasPasskeys] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't show if user dismissed it in this session
    const dismissed = sessionStorage.getItem('security_prompt_dismissed');
    if (dismissed) {
      setLoading(false);
      return;
    }

    const checkSecurity = async () => {
      try {
        const [status, keys] = await Promise.all([api.get2FAStatus(), api.listPasskeys()]);

        const is2FAEnabled = status.enabled;
        const keysCount = keys.length;

        setTotpEnabled(is2FAEnabled);
        setHasPasskeys(keysCount > 0);

        // Show prompt if either 2FA or Passkeys are missing
        if (!is2FAEnabled || keysCount === 0) {
          setShow(true);
        }
      } catch (err) {
        console.error('Security check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSecurity();
  }, []);

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('security_prompt_dismissed', 'true');
  };

  if (loading || !show) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden mb-8">
      {/* Decorative background icon */}
      <Shield className="absolute -right-8 -bottom-8 text-white/10" size={160} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-blue-200" size={24} />
            <h3 className="text-xl font-bold">Strengthen Your Account</h3>
          </div>
          <p className="text-blue-100 max-w-xl">
            Adding an extra layer of security helps protect your data. We recommend enabling
            {!totpEnabled && !hasPasskeys
              ? ' Two-Factor Authentication and Passkeys.'
              : !totpEnabled
                ? ' Two-Factor Authentication.'
                : ' Passkeys.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-4">
            {!totpEnabled && (
              <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                <Smartphone size={16} />
                <span>2FA recommended</span>
              </div>
            )}
            {!hasPasskeys && (
              <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                <Fingerprint size={16} />
                <span>Passkeys recommended</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/settings/security"
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            Go to Security Settings
            <ArrowRight size={18} />
          </NavLink>
          <button
            onClick={handleDismiss}
            className="p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
