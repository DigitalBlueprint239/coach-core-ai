import React from 'react';
import { Stat, StatArrow, StatArrowProps } from '@chakra-ui/react';

/**
 * SafeStatArrow - A utility component that ensures StatArrow is always wrapped in Stat
 * This prevents the "useStatStyles returned is 'undefined'" error
 */
export const SafeStatArrow: React.FC<StatArrowProps> = props => {
  return (
    <Stat>
      <StatArrow {...props} />
    </Stat>
  );
};

export default SafeStatArrow;
