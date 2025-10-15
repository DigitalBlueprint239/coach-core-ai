import { dataService } from '../firebase/data-service';

// Drill Categories
export type DrillCategory =
  | 'warmup'
  | 'fundamental'
  | 'team_play'
  | 'conditioning'
  | 'cooldown';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type AgeGroup = 'u8' | 'u10' | 'u12' | 'u14' | 'jv' | 'varsity';

// Drill Interface
export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  duration: number; // minutes
  intensity: 'low' | 'medium' | 'high';
  description: string;
  equipment: string[];
  objectives: string[];
  skillLevel: SkillLevel;
  ageGroups: AgeGroup[];
  sport: 'football' | 'flag_football';
  videoUrl?: string;
  safetyNotes: string;
  setupInstructions: string;
  coachingPoints: string[];
  variations: string[];
  progression: string[];
  commonMistakes: string[];
  successCriteria: string[];
}

// Comprehensive Drill Library
export const drillLibrary: Drill[] = [
  // WARMUP DRILLS
  {
    id: 'warmup-1',
    name: 'Dynamic Stretching Circuit',
    category: 'warmup',
    duration: 10,
    intensity: 'low',
    description:
      'Progressive warmup with high knees, butt kicks, leg swings, and arm circles',
    equipment: ['cones'],
    objectives: [
      'Increase body temperature',
      'Improve flexibility',
      'Prepare muscles for activity',
    ],
    skillLevel: 'beginner',
    ageGroups: ['u8', 'u10', 'u12', 'u14', 'jv', 'varsity'],
    sport: 'football',
    safetyNotes:
      'Ensure proper spacing between players. Start slow and gradually increase intensity.',
    setupInstructions:
      'Set up cones in a circle or line formation. Players move around the course.',
    coachingPoints: [
      'Keep movements controlled and smooth',
      'Maintain proper posture throughout',
      'Breathe steadily during each movement',
    ],
    variations: [
      'Add lateral movements',
      'Include backward walking',
      'Incorporate arm movements',
    ],
    progression: [
      'Start with walking pace',
      'Progress to jogging',
      'Add dynamic movements',
    ],
    commonMistakes: [
      'Moving too fast initially',
      'Poor posture',
      'Insufficient spacing',
    ],
    successCriteria: [
      'Players are warm and loose',
      'No injuries during warmup',
      'Proper form maintained',
    ],
  },
  {
    id: 'warmup-2',
    name: 'Agility Ladder Drills',
    category: 'warmup',
    duration: 8,
    intensity: 'low',
    description:
      'Footwork drills using agility ladder to improve coordination and foot speed',
    equipment: ['Agility ladder'],
    objectives: [
      'Improve foot speed',
      'Enhance coordination',
      'Warm up lower body',
    ],
    skillLevel: 'beginner',
    ageGroups: ['u8', 'u10', 'u12', 'u14', 'jv', 'varsity'],
    sport: 'football',
    safetyNotes:
      'Ensure ladder is secure. Players should focus on form over speed initially.',
    setupInstructions:
      'Lay agility ladder on flat ground. Players line up at one end.',
    coachingPoints: [
      'Lift knees high',
      'Stay on balls of feet',
      'Keep eyes forward',
    ],
    variations: ['High knees', 'Lateral movement', 'In-and-out pattern'],
    progression: [
      'Walk through pattern',
      'Jog through pattern',
      'Run through pattern',
    ],
    commonMistakes: [
      'Looking down at feet',
      'Poor posture',
      'Moving too fast too soon',
    ],
    successCriteria: [
      'Clean footwork',
      'Proper form maintained',
      'Players ready for practice',
    ],
  },

  // FUNDAMENTAL DRILLS
  {
    id: 'fundamental-1',
    name: 'Proper Tackling Technique (Hawk Tackle)',
    category: 'fundamental',
    duration: 15,
    intensity: 'medium',
    description:
      'USA Football Heads Up tackling progression focusing on safe technique',
    equipment: ['Tackling dummies', 'Cones', 'Pads'],
    objectives: [
      'Learn safe tackling technique',
      'Build confidence',
      'Prevent head injuries',
    ],
    skillLevel: 'intermediate',
    ageGroups: ['u10', 'u12', 'u14', 'jv', 'varsity'],
    sport: 'football',
    videoUrl: 'https://usafootball.com/hawk-tackle',
    safetyNotes:
      'NO live tackling in first 3 practices. Emphasize head placement and form.',
    setupInstructions:
      'Set up tackling dummies in a line. Players practice form without contact.',
    coachingPoints: [
      'Eyes up, head back',
      'Bend at knees, not waist',
      'Drive through with legs',
      'Wrap up with arms',
    ],
    variations: ['Angle tackling', 'Open field tackling', 'Goal line tackling'],
    progression: [
      'Form tackling',
      'Dummy tackling',
      'Controlled live tackling',
    ],
    commonMistakes: [
      'Leading with head',
      'Poor body position',
      'Not wrapping up',
    ],
    successCriteria: [
      'Proper form demonstrated',
      'No head contact',
      'Confident execution',
    ],
  },
  {
    id: 'fundamental-2',
    name: 'Passing Fundamentals',
    category: 'fundamental',
    duration: 12,
    intensity: 'medium',
    description:
      'Quarterback passing technique focusing on grip, stance, and throwing motion',
    equipment: ['Football', 'Target net or receiver'],
    objectives: [
      'Improve passing accuracy',
      'Develop proper mechanics',
      'Build arm strength',
    ],
    skillLevel: 'beginner',
    ageGroups: ['u8', 'u10', 'u12', 'u14', 'jv', 'varsity'],
    sport: 'football',
    safetyNotes:
      'Ensure proper spacing. Start with short distances and increase gradually.',
    setupInstructions:
      'Set up target net or have receivers line up. QBs practice throwing motion.',
    coachingPoints: [
      'Proper grip on football',
      'Stable base with feet',
      'Follow through motion',
      'Step into throw',
    ],
    variations: ['Stationary passing', 'Moving passing', 'Different distances'],
    progression: ['Short throws', 'Medium throws', 'Long throws'],
    commonMistakes: ['Poor grip', 'No follow through', 'Inconsistent motion'],
    successCriteria: ['Accurate throws', 'Proper form', 'Confident execution'],
  },
  {
    id: 'fundamental-3',
    name: 'Catching Technique',
    category: 'fundamental',
    duration: 10,
    intensity: 'low',
    description:
      'Proper receiving technique focusing on hand placement and body control',
    equipment: ['Football', 'Throwing machine or QB'],
    objectives: [
      'Improve catching ability',
      'Develop hand-eye coordination',
      'Build confidence',
    ],
    skillLevel: 'beginner',
    ageGroups: ['u8', 'u10', 'u12', 'u14', 'jv', 'varsity'],
    sport: 'football',
    safetyNotes:
      'Start with soft throws. Ensure proper spacing between players.',
    setupInstructions:
      'Receivers line up. QB or machine throws passes at different angles.',
    coachingPoints: [
      'Hands out in front',
      'Catch with hands, not body',
      'Tuck ball after catch',
      'Keep eyes on ball',
    ],
    variations: ['High catches', 'Low catches', 'Side catches'],
    progression: [
      'Stationary catching',
      'Moving catches',
      'Game situation catches',
    ],
    commonMistakes: [
      'Catching with body',
      'Looking away too soon',
      'Poor hand placement',
    ],
    successCriteria: ['Clean catches', 'Proper form', 'Confident hands'],
  },

  // TEAM PLAY DRILLS
  {
    id: 'team-1',
    name: '7-on-7 Scrimmage',
    category: 'team_play',
    duration: 20,
    intensity: 'high',
    description:
      'Small-sided game to practice plays and teamwork in game-like situations',
    equipment: ['Football', 'Cones for field markers', 'Pinnies'],
    objectives: [
      'Apply learned skills',
      'Improve teamwork',
      'Enhance decision-making',
    ],
    skillLevel: 'intermediate',
    ageGroups: ['u10', 'u12', 'u14', 'jv', 'varsity'],
    sport: 'football',
    safetyNotes:
      'No tackling - touch football only. Emphasize sportsmanship and fair play.',
    setupInstructions:
      'Mark off field with cones. Divide into two teams with different colored pinnies.',
    coachingPoints: [
      'Execute plays properly',
      'Communicate with teammates',
      'Make good decisions',
      'Play with intensity',
    ],
    variations: [
      'Red zone situations',
      'Two-minute drill',
      'Goal line scenarios',
    ],
    progression: ['Basic plays', 'Complex plays', 'Game situations'],
    commonMistakes: [
      'Poor communication',
      'Not following plays',
      'Lack of effort',
    ],
    successCriteria: [
      'Plays executed properly',
      'Good teamwork',
      'Positive attitude',
    ],
  },
  {
    id: 'team-2',
    name: 'Blocking Fundamentals',
    category: 'team_play',
    duration: 15,
    intensity: 'medium',
    description:
      'Offensive line blocking technique focusing on stance, hand placement, and drive',
    equipment: ['Blocking sleds', 'Pads', 'Cones'],
    objectives: [
      'Learn proper blocking',
      'Develop strength',
      'Improve technique',
    ],
    skillLevel: 'beginner',
    ageGroups: ['u8', 'u10', 'u12', 'u14', 'jv', 'varsity'],
    sport: 'football',
    safetyNotes:
      'Emphasize proper form. Start with light resistance and increase gradually.',
    setupInstructions:
      'Set up blocking sleds in line. Players practice blocking technique.',
    coachingPoints: [
      'Proper stance',
      'Hand placement',
      'Drive with legs',
      'Maintain balance',
    ],
    variations: ['Run blocking', 'Pass blocking', 'Pulling blocks'],
    progression: ['Individual blocking', 'Partner blocking', 'Team blocking'],
    commonMistakes: [
      'Poor stance',
      'Weak hand placement',
      'Not driving with legs',
    ],
    successCriteria: ['Proper form', 'Good technique', 'Confident execution'],
  },

  // CONDITIONING DRILLS
  {
    id: 'conditioning-1',
    name: 'Interval Training',
    category: 'conditioning',
    duration: 12,
    intensity: 'high',
    description:
      'High-intensity interval training to improve cardiovascular fitness and endurance',
    equipment: ['Cones', 'Stopwatch'],
    objectives: ['Improve endurance', 'Build stamina', 'Enhance recovery'],
    skillLevel: 'intermediate',
    ageGroups: ['u12', 'u14', 'jv', 'varsity'],
    sport: 'football',
    safetyNotes:
      'Monitor player fatigue. Ensure proper hydration and rest periods.',
    setupInstructions:
      'Set up course with cones. Players run intervals with rest periods.',
    coachingPoints: [
      'Maintain form during fatigue',
      'Push through discomfort',
      'Recover during rest periods',
      'Stay hydrated',
    ],
    variations: ['Sprint intervals', 'Hill intervals', 'Fartlek training'],
    progression: [
      'Short intervals',
      'Longer intervals',
      'More intense intervals',
    ],
    commonMistakes: [
      'Starting too fast',
      'Poor form when tired',
      'Insufficient rest',
    ],
    successCriteria: [
      'Completed intervals',
      'Maintained form',
      'Improved endurance',
    ],
  },

  // COOLDOWN DRILLS
  {
    id: 'cooldown-1',
    name: 'Static Stretching',
    category: 'cooldown',
    duration: 5,
    intensity: 'low',
    description:
      'Gentle stretching to cool down muscles and improve flexibility',
    equipment: ['None required'],
    objectives: [
      'Reduce muscle tension',
      'Improve flexibility',
      'Prevent soreness',
    ],
    skillLevel: 'beginner',
    ageGroups: ['u8', 'u10', 'u12', 'u14', 'jv', 'varsity'],
    sport: 'football',
    safetyNotes: 'No bouncing. Hold stretches gently. Stop if there is pain.',
    setupInstructions:
      'Players spread out in open area. Coach leads stretching routine.',
    coachingPoints: [
      'Hold each stretch 15-30 seconds',
      'Breathe steadily',
      "Don't bounce",
      'Stretch to mild tension',
    ],
    variations: [
      'Partner stretching',
      'Dynamic stretching',
      'Yoga-based stretches',
    ],
    progression: ['Basic stretches', 'Advanced stretches', 'Partner stretches'],
    commonMistakes: [
      'Bouncing during stretches',
      'Holding breath',
      'Stretching too hard',
    ],
    successCriteria: ['Muscles relaxed', 'Improved flexibility', 'No injuries'],
  },
];

class DrillLibraryService {
  // Get drills by category
  getDrillsByCategory(category: DrillCategory): Drill[] {
    return drillLibrary.filter(drill => drill.category === category);
  }

  // Get drills by age group
  getDrillsByAgeGroup(ageGroup: AgeGroup): Drill[] {
    return drillLibrary.filter(drill => drill.ageGroups.includes(ageGroup));
  }

  // Get drills by skill level
  getDrillsBySkillLevel(skillLevel: SkillLevel): Drill[] {
    return drillLibrary.filter(drill => drill.skillLevel === skillLevel);
  }

  // Get drills by objectives
  getDrillsByObjectives(objectives: string[]): Drill[] {
    return drillLibrary.filter(drill =>
      objectives.some(objective =>
        drill.objectives.some(drillObjective =>
          drillObjective.toLowerCase().includes(objective.toLowerCase())
        )
      )
    );
  }

  // Get drills for practice planning
  getDrillsForPractice(
    ageGroup: AgeGroup,
    skillLevel: SkillLevel,
    objectives: string[],
    duration: number
  ): Drill[] {
    let filteredDrills = drillLibrary.filter(
      drill =>
        drill.ageGroups.includes(ageGroup) && drill.skillLevel === skillLevel
    );

    // Filter by objectives if specified
    if (objectives.length > 0) {
      filteredDrills = filteredDrills.filter(drill =>
        objectives.some(objective =>
          drill.objectives.some(drillObjective =>
            drillObjective.toLowerCase().includes(objective.toLowerCase())
          )
        )
      );
    }

    // Sort by duration to fit practice time
    filteredDrills.sort((a, b) => a.duration - b.duration);

    return filteredDrills;
  }

  // Generate practice plan with drills
  generatePracticePlan(
    ageGroup: AgeGroup,
    skillLevel: SkillLevel,
    objectives: string[],
    totalDuration: number
  ): {
    warmup: Drill[];
    fundamental: Drill[];
    teamPlay: Drill[];
    conditioning: Drill[];
    cooldown: Drill[];
  } {
    const availableDrills = this.getDrillsForPractice(
      ageGroup,
      skillLevel,
      objectives,
      totalDuration
    );

    // Allocate time for each category
    const warmupTime = Math.min(15, Math.floor(totalDuration * 0.15));
    const fundamentalTime = Math.floor(totalDuration * 0.4);
    const teamPlayTime = Math.floor(totalDuration * 0.3);
    const conditioningTime = Math.floor(totalDuration * 0.1);
    const cooldownTime = Math.max(
      5,
      totalDuration -
        warmupTime -
        fundamentalTime -
        teamPlayTime -
        conditioningTime
    );

    // Select drills for each category
    const warmup = this.selectDrillsByDuration(
      availableDrills.filter(d => d.category === 'warmup'),
      warmupTime
    );
    const fundamental = this.selectDrillsByDuration(
      availableDrills.filter(d => d.category === 'fundamental'),
      fundamentalTime
    );
    const teamPlay = this.selectDrillsByDuration(
      availableDrills.filter(d => d.category === 'team_play'),
      teamPlayTime
    );
    const conditioning = this.selectDrillsByDuration(
      availableDrills.filter(d => d.category === 'conditioning'),
      conditioningTime
    );
    const cooldown = this.selectDrillsByDuration(
      availableDrills.filter(d => d.category === 'cooldown'),
      cooldownTime
    );

    return {
      warmup,
      fundamental,
      teamPlay,
      conditioning,
      cooldown,
    };
  }

  // Helper method to select drills that fit within time constraints
  private selectDrillsByDuration(
    drills: Drill[],
    targetDuration: number
  ): Drill[] {
    const selectedDrills: Drill[] = [];
    let currentDuration = 0;

    for (const drill of drills) {
      if (currentDuration + drill.duration <= targetDuration) {
        selectedDrills.push(drill);
        currentDuration += drill.duration;
      }
    }

    return selectedDrills;
  }

  // Get drill by ID
  getDrillById(id: string): Drill | undefined {
    return drillLibrary.find(drill => drill.id === id);
  }

  // Search drills by name or description
  searchDrills(searchTerm: string): Drill[] {
    const term = searchTerm.toLowerCase();
    return drillLibrary.filter(
      drill =>
        drill.name.toLowerCase().includes(term) ||
        drill.description.toLowerCase().includes(term) ||
        drill.objectives.some(objective =>
          objective.toLowerCase().includes(term)
        )
    );
  }

  // Get equipment list for practice
  getEquipmentList(drills: Drill[]): string[] {
    const equipmentSet = new Set<string>();
    drills.forEach(drill => {
      drill.equipment.forEach(item => equipmentSet.add(item));
    });
    return Array.from(equipmentSet);
  }

  // Get safety checklist
  getSafetyChecklist(ageGroup: AgeGroup): string[] {
    const checklists = {
      u8: [
        'Ensure all equipment is age-appropriate',
        'Maintain constant supervision',
        'Focus on fun and basic skills',
        'No contact drills',
        'Frequent water breaks',
      ],
      u10: [
        'Introduce basic contact concepts safely',
        'Emphasize proper technique',
        'Monitor fatigue levels',
        'Encourage sportsmanship',
        'Regular safety reminders',
      ],
      u12: [
        'Progressive skill development',
        'Proper tackling technique',
        'Equipment safety checks',
        'Conditioning appropriate for age',
        'Clear communication of rules',
      ],
      u14: [
        'Advanced technique training',
        'Game situation preparation',
        'Physical conditioning',
        'Mental preparation',
        'Leadership development',
      ],
      jv: [
        'High school level preparation',
        'Advanced skill development',
        'Game strategy understanding',
        'Physical conditioning',
        'Mental toughness',
      ],
      varsity: [
        'Elite level preparation',
        'Advanced strategy implementation',
        'Peak physical conditioning',
        'Mental preparation',
        'Leadership and teamwork',
      ],
    };

    return checklists[ageGroup] || checklists['u12'];
  }
}

export const drillLibraryService = new DrillLibraryService();
export default drillLibraryService;
