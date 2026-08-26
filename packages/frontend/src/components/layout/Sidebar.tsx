'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useLayoutStore } from '@/stores/layout.store';
import { useAuthStore } from '@/stores/auth.store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: ('KASIR' | 'OWNER' | 'ADMIN')[];
  submenu?: NavItem[];
}

/**
 * Sidebar Component
 * Displays navigation menu with collapse functionality
 * Mobile-responsive with hamburger integration
 */
export const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, setSidebarOpen } = useLayoutStore();
  const { role } = useAuthStore();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  // Navigation items based on user role
  const navItems: NavItem[] = [
    ...(role === 'KASIR'
      ? [
          {
            label: 'Dashboard',
            href: '/kasir/dashboard',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9M9 21h6a2 2 0 002-2V9m-9 0l7-4 7 4"
                />
              </svg>
            ),
          },
          {
            label: 'Point of Sale',
            href: '/kasir/pos',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            ),
          },
          {
            label: 'History',
            href: '/kasir/history',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            label: 'Members',
            href: '/kasir/members',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ),
          },
        ]
      : []),
    ...(role === 'OWNER'
      ? [
          {
            label: 'Dashboard',
            href: '/owner/dashboard',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9M9 21h6a2 2 0 002-2V9m-9 0l7-4 7 4"
                />
              </svg>
            ),
          },
          {
            label: 'Management',
            href: '#',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            ),
            submenu: [
              {
                label: 'Stores',
                href: '/owner/stores',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
              {
                label: 'Inventory',
                href: '/owner/inventory',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
              {
                label: 'Stock Opname',
                href: '/owner/stock-opname',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
              {
                label: 'Members',
                href: '/owner/members',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
            ],
          },
          {
            label: 'Supply Chain',
            href: '#',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            ),
            submenu: [
              {
                label: 'Suppliers',
                href: '/owner/suppliers',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
              {
                label: 'Purchase Orders',
                href: '/owner/purchase-orders',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
              {
                label: 'Payables',
                href: '/owner/payables',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
            ],
          },
          {
            label: 'Financials',
            href: '#',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
            submenu: [
              {
                label: 'Reports',
                href: '/owner/reports',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
              {
                label: 'Capital Reports',
                href: '/owner/capital-reports',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
              {
                label: 'BOP Management',
                href: '/owner/bop',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
              {
                label: 'Piutang',
                href: '/owner/piutang',
                icon: <span className="w-1 h-1 bg-current rounded-full" />,
              },
            ],
          },
          {
            label: 'Attendance',
            href: '/owner/attendance',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            ),
          },
        ]
      : []),
  ];

  const isActive = (href: string): boolean => {
    if (href === '#') return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Close sidebar on mobile when navigating
  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-all duration-300 ease-in-out z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed && 'lg:w-20'}`}
      >
        <nav className="px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.submenu ? (
                // Submenu Item
                <button
                  onClick={() => toggleSubmenu(item.label)}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors duration-200 ${
                    expandedMenus.has(item.label)
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expandedMenus.has(item.label) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  )}
                </button>
              ) : (
                // Simple Link Item
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={item.label}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              )}

              {/* Submenu Items */}
              {item.submenu && expandedMenus.has(item.label) && !sidebarCollapsed && (
                <div className="ml-4 space-y-1 mt-1">
                  {item.submenu.map((subitem) => (
                    <Link
                      key={subitem.label}
                      href={subitem.href}
                      onClick={handleNavClick}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors duration-200 ${
                        isActive(subitem.href)
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={subitem.label}
                    >
                      {subitem.icon}
                      <span>{subitem.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
