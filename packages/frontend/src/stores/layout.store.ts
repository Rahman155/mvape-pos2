/**
 * Layout store using Zustand
 * Manages global layout state including sidebar visibility and collapse state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutStore {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
}

/**
 * Global layout store
 * Uses sessionStorage for sidebar state persistence (resets on new session)
 */
export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      toggleSidebarCollapse: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
    }),
    {
      name: 'layout-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

/**
 * Get current layout state (non-reactive)
 * Useful for non-component code
 */
export function getLayoutState() {
  return useLayoutStore.getState();
}
