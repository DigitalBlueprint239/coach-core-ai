import React from 'react';
import {
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatProps,
  StatLabelProps,
  StatNumberProps,
  StatHelpTextProps,
  StatArrowProps,
} from '@chakra-ui/react';

/**
 * SafeStat - A utility component that ensures all stat components are properly wrapped
 * This prevents the "useStatStyles returned is 'undefined'" error
 */

// Safe wrapper for StatLabel
export const SafeStatLabel: React.FC<StatLabelProps> = props => {
  return (
    <Stat>
      <StatLabel {...props} />
    </Stat>
  );
};

// Safe wrapper for StatNumber
export const SafeStatNumber: React.FC<StatNumberProps> = props => {
  return (
    <Stat>
      <StatNumber {...props} />
    </Stat>
  );
};

// Safe wrapper for StatHelpText
export const SafeStatHelpText: React.FC<StatHelpTextProps> = props => {
  return (
    <Stat>
      <StatHelpText {...props} />
    </Stat>
  );
};

// Safe wrapper for StatArrow
export const SafeStatArrow: React.FC<StatArrowProps> = props => {
  return (
    <Stat>
      <StatArrow {...props} />
    </Stat>
  );
};

// Safe wrapper for complete Stat group
export const SafeStat: React.FC<StatProps> = ({ children, ...props }) => {
  return <Stat {...props}>{children}</Stat>;
};

// Export all safe components
export {
  SafeStat as default,
  SafeStatLabel,
  SafeStatNumber,
  SafeStatHelpText,
  SafeStatArrow,
};
