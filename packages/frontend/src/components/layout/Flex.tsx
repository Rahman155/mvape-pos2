'use client';

import React, { ReactNode, CSSProperties } from 'react';

interface FlexProps {
  children: ReactNode;
  direction?: 'row' | 'col';
  justify?: 'start' | 'center' | 'between' | 'around' | 'end';
  items?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  wrap?: boolean;
  className?: string;
  style?: CSSProperties;
}

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
  end: 'justify-end',
};

const itemsMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const gapMap = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

/**
 * Responsive Flex Component
 * Flexbox utility component for flexible layouts
 *
 * @example
 * <Flex justify="between" items="center" gap="md">
 *   <span>Left</span>
 *   <span>Right</span>
 * </Flex>
 */
export const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  justify = 'start',
  items = 'start',
  gap = 'md',
  wrap = false,
  className = '',
  style,
}) => {
  const directionClass = direction === 'row' ? 'flex-row' : 'flex-col';
  const justifyClass = justifyMap[justify];
  const itemsClass = itemsMap[items];
  const gapClass = gapMap[gap];
  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';

  return (
    <div
      className={`flex ${directionClass} ${justifyClass} ${itemsClass} ${gapClass} ${wrapClass} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default Flex;
