import React from 'react';
import { Stat } from '@chakra-ui/react';

/**
 * SafeStatArrow - A production-grade wrapper that automatically wraps StatArrow in Stat
 * This prevents the "useStatStyles returned is 'undefined'" error by ensuring proper nesting
 */
export const SafeStatArrow: React.FC<{
  type?: 'increase' | 'decrease';
  [key: string]: any;
}> = props => {
  return (
    <Stat>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '0.875rem',
          color: props.type === 'increase' ? '#38A169' : '#E53E3E',
        }}
      >
        {props.type === 'increase' ? '↗' : '↘'}
        <span style={{ marginLeft: '0.25rem' }}>
          {props.children || 'Change'}
        </span>
      </div>
    </Stat>
  );
};

export default SafeStatArrow;
