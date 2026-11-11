import CoachCard from './CoachCard';

export default {
  title: 'UI/CoachCard',
  component: CoachCard,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onViewProfile: { action: 'view profile clicked' },
    onContact: { action: 'contact clicked' },
  },
};

export const Default = {
  args: {
    coach: {
      name: 'Sarah Johnson',
      sport: 'Soccer',
      experience: 8,
      rating: 4.8,
      avatar: '',
      isOnline: true,
      specialties: ['Youth Development', 'Tactics', 'Fitness'],
    },
  },
};

export const OfflineCoach = {
  args: {
    coach: {
      name: 'Mike Rodriguez',
      sport: 'Basketball',
      experience: 12,
      rating: 4.9,
      avatar: '',
      isOnline: false,
      specialties: ['Shooting', 'Defense', 'Leadership'],
    },
  },
};

export const BaseballCoach = {
  args: {
    coach: {
      name: 'David Chen',
      sport: 'Baseball',
      experience: 15,
      rating: 4.7,
      avatar: '',
      isOnline: true,
      specialties: ['Pitching', 'Hitting', 'Strategy'],
    },
  },
};

export const NewCoach = {
  args: {
    coach: {
      name: 'Emily Davis',
      sport: 'Tennis',
      experience: 3,
      rating: 4.5,
      avatar: '',
      isOnline: true,
      specialties: ['Technique', 'Mental Game'],
    },
  },
}; 