import React from 'react';
import { Button, ButtonGroup } from '@chakra-ui/react';

interface QuickActionsProps {
  actions: Array<{
    label: string;
    onClick: () => void;
    colorScheme?: string;
    leftIcon?: React.ReactElement;
  }>;
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  if (!actions.length) return null;

  return (
    <ButtonGroup spacing={3} flexWrap="wrap">
      {actions.map((action) => (
        <Button
          key={action.label}
          colorScheme={action.colorScheme || 'blue'}
          onClick={action.onClick}
          leftIcon={action.leftIcon}
        >
          {action.label}
        </Button>
      ))}
    </ButtonGroup>
  );
};

export default QuickActions;
