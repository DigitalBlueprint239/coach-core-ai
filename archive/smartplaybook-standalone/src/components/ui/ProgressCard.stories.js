import ProgressCard from './ProgressCard';

export default {
  title: 'UI/ProgressCard',
  component: ProgressCard,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  args: {
    title: 'Practice Sessions',
    currentValue: 15,
    maxValue: 20,
    unit: ' sessions',
    progressColor: 'blue',
    badgeText: 'On Track',
    description: 'Complete 5 more sessions to reach your monthly goal',
  },
};

export const HighProgress = {
  args: {
    title: 'Skills Mastery',
    currentValue: 85,
    maxValue: 100,
    unit: '%',
    progressColor: 'green',
    badgeText: 'Excellent',
    description: 'You\'re performing exceptionally well in skill development',
  },
};

export const LowProgress = {
  args: {
    title: 'Team Communication',
    currentValue: 3,
    maxValue: 10,
    unit: ' exercises',
    progressColor: 'orange',
    badgeText: 'Needs Work',
    description: 'Focus on communication drills in upcoming practices',
  },
};

export const Completed = {
  args: {
    title: 'Season Goals',
    currentValue: 10,
    maxValue: 10,
    unit: ' goals',
    progressColor: 'purple',
    badgeText: 'Completed',
    description: 'Congratulations! All season goals have been achieved',
  },
};

export const Fitness = {
  args: {
    title: 'Fitness Level',
    currentValue: 75,
    maxValue: 100,
    unit: ' points',
    progressColor: 'red',
    badgeText: 'Good',
    description: 'Maintain current fitness routine for optimal performance',
  },
}; 