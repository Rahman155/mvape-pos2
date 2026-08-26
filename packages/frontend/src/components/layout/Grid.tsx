'use client';

import React, { ReactNode, CSSProperties } from 'react';

interface GridProps {
  children: ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: CSSProperties;
}

const gapMap = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

/**
 * Responsive Grid Component
 * Mobile-first grid layout that adapts to different screen sizes
 *
 * @example
 * <Grid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 */
export const Grid: React.FC<GridProps> = ({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className = '',
  style,
}) => {
  const mobileColsClass = `grid-cols-${cols.mobile || 1}`;
  const tabletColsClass = cols.tablet ? `md:grid-cols-${cols.tablet}` : '';
  const desktopColsClass = cols.desktop ? `lg:grid-cols-${cols.desktop}` : '';

  const colsClasses = [mobileColsClass, tabletColsClass, desktopColsClass]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`grid ${colsClasses} ${gapMap[gap]} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default Grid;
