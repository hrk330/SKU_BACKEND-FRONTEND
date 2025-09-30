'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  HomeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  BellIcon,
  UserIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isRetailer = user?.role === 'retailer';
  const isFarmer = user?.role === 'farmer';
  const isAdmin = user?.role === 'gov_admin';

  const retailerNavItems = [
    { name: 'Dashboard', href: '/dashboard/retailer', icon: HomeIcon },
    { name: 'Price Management', href: '/dashboard/retailer/prices', icon: CurrencyDollarIcon },
    { name: 'Product Catalog', href: '/dashboard/retailer/catalog', icon: ShoppingBagIcon },
    { name: 'Compliance Reports', href: '/dashboard/retailer/compliance', icon: ChartBarIcon },
    { name: 'Profile', href: '/dashboard/retailer/profile', icon: UserIcon },
  ];

  const farmerNavItems = [
    { name: 'Dashboard', href: '/dashboard/farmer', icon: HomeIcon },
    { name: 'Price Search', href: '/dashboard/farmer/search', icon: MagnifyingGlassIcon },
    { name: 'Price Comparison', href: '/dashboard/farmer/comparison', icon: ChartBarIcon },
    { name: 'Complaints', href: '/dashboard/farmer#complaints', icon: ExclamationTriangleIcon },
    { name: 'Favorites', href: '/dashboard/farmer/favorites', icon: HeartIcon },
    { name: 'Alerts', href: '/dashboard/farmer/alerts', icon: BellIcon },
    { name: 'Profile', href: '/dashboard/farmer/profile', icon: UserIcon },
  ];

  const adminNavItems = [
    { name: 'Dashboard', href: '/dashboard/admin', icon: HomeIcon },
    { name: 'Users', href: '/dashboard/admin/users', icon: UserIcon },
    { name: 'Reference Prices', href: '/dashboard/admin/prices', icon: CurrencyDollarIcon },
    { name: 'Compliance', href: '/dashboard/admin/compliance', icon: ChartBarIcon },
    { name: 'Settings', href: '/dashboard/admin/settings', icon: CogIcon },
  ];

  const getNavItems = () => {
    if (isRetailer) return retailerNavItems;
    if (isFarmer) return farmerNavItems;
    if (isAdmin) return adminNavItems;
    return [];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
            <h1 className="text-xl font-bold text-white">
              {isRetailer ? 'Retailer Portal' : isFarmer ? 'Farmer Portal' : 'Admin Portal'}
            </h1>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={onClose}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export { Sidebar };
