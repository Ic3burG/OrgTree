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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={24}
                  className={isActive ? 'stroke-[2.5]' : 'stroke-2'}
                />
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
