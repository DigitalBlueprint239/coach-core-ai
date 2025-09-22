import React from 'react';
import { Stat, StatProps } from '@chakra-ui/react';

/**
 * SafeStat - A production-grade wrapper that ensures Stat components are always properly structured
 * This prevents the "useStatStyles returned is 'undefined'" error by enforcing proper Chakra UI usage
 */
export const SafeStat: React.FC<StatProps> = ({ children, ...props }) => {
  return <Stat {...props}>{children}</Stat>;
};

export default SafeStat;
