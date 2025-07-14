// Starter templates — you can add as many as you want!
export const initialTemplates = [
  {
    name: "Standard Practice",
    periods: [
      { name: "Warm-Up", minutes: 10 },
      { name: "Individual Drills", minutes: 20 },
      { name: "Team Period", minutes: 25 },
      { name: "Special Teams", minutes: 10 },
      { name: "Cool Down", minutes: 10 }
    ]
  },
  {
    name: "Short Practice",
    periods: [
      { name: "Warm-Up", minutes: 5 },
      { name: "Tempo Drills", minutes: 10 },
      { name: "7-on-7", minutes: 15 },
      { name: "Team", minutes: 10 }
    ]
  },
  {
    name: "Game Day Prep",
    periods: [
      { name: "Light Warm-Up", minutes: 8 },
      { name: "Position Review", minutes: 15 },
      { name: "Walk-Through", minutes: 12 },
      { name: "Special Teams", minutes: 8 },
      { name: "Team Meeting", minutes: 7 }
    ]
  },
  {
    name: "Conditioning Focus",
    periods: [
      { name: "Dynamic Warm-Up", minutes: 12 },
      { name: "Cardio Drills", minutes: 20 },
      { name: "Strength Work", minutes: 18 },
      { name: "Recovery", minutes: 10 }
    ]
  }
];

// Comprehensive drill library
export const drillLibrary = [
  // Warmup Drills
  {
    id: 1,
    name: "Dynamic Stretching",
    category: "warmup",
    intensity: "low",
    duration: 10,
    description: "Progressive stretching routine to prepare muscles for activity"
  },
  {
    id: 2,
    name: "Light Jogging",
    category: "warmup",
    intensity: "low",
    duration: 8,
    description: "Gentle jogging to increase heart rate and warm up muscles"
  },
  {
    id: 3,
    name: "Position-Specific Warmup",
    category: "warmup",
    intensity: "low",
    duration: 12,
    description: "Warmup drills specific to player positions"
  },
  {
    id: 4,
    name: "Agility Ladder",
    category: "warmup",
    intensity: "moderate",
    duration: 15,
    description: "Footwork drills using agility ladder"
  },

  // Conditioning Drills
  {
    id: 5,
    name: "Suicide Runs",
    category: "conditioning",
    intensity: "high",
    duration: 20,
    description: "Sprint intervals with increasing distances"
  },
  {
    id: 6,
    name: "Hill Sprints",
    category: "conditioning",
    intensity: "high",
    duration: 25,
    description: "Sprint up hills to build leg strength and endurance"
  },
  {
    id: 7,
    name: "Interval Training",
    category: "conditioning",
    intensity: "high",
    duration: 30,
    description: "Alternating high and low intensity periods"
  },
  {
    id: 8,
    name: "Circuit Training",
    category: "conditioning",
    intensity: "moderate",
    duration: 35,
    description: "Multiple exercises in rotation with minimal rest"
  },

  // Skills Drills
  {
    id: 9,
    name: "Passing Drills",
    category: "skills",
    intensity: "moderate",
    duration: 20,
    description: "Quarterback accuracy and timing practice"
  },
  {
    id: 10,
    name: "Catching Practice",
    category: "skills",
    intensity: "moderate",
    duration: 18,
    description: "Receiver catching drills and hand-eye coordination"
  },
  {
    id: 11,
    name: "Route Running",
    category: "skills",
    intensity: "moderate",
    duration: 22,
    description: "Precision route running and timing"
  },
  {
    id: 12,
    name: "Tackling Technique",
    category: "skills",
    intensity: "moderate",
    duration: 25,
    description: "Proper tackling form and safety"
  },
  {
    id: 13,
    name: "Blocking Drills",
    category: "skills",
    intensity: "moderate",
    duration: 20,
    description: "Offensive line blocking techniques"
  },
  {
    id: 14,
    name: "Ball Security",
    category: "skills",
    intensity: "low",
    duration: 15,
    description: "Fumble prevention and ball handling"
  },

  // Team Drills
  {
    id: 15,
    name: "7-on-7 Scrimmage",
    category: "team",
    intensity: "high",
    duration: 30,
    description: "Passing game practice without linemen"
  },
  {
    id: 16,
    name: "11-on-11 Scrimmage",
    category: "team",
    intensity: "high",
    duration: 45,
    description: "Full team scrimmage with live action"
  },
  {
    id: 17,
    name: "Red Zone Offense",
    category: "team",
    intensity: "high",
    duration: 25,
    description: "Practice scoring plays in the red zone"
  },
  {
    id: 18,
    name: "Two-Minute Drill",
    category: "team",
    intensity: "high",
    duration: 20,
    description: "Hurry-up offense simulation"
  },
  {
    id: 19,
    name: "Goal Line Defense",
    category: "team",
    intensity: "high",
    duration: 25,
    description: "Defensive goal line stand practice"
  },
  {
    id: 20,
    name: "Situational Football",
    category: "team",
    intensity: "moderate",
    duration: 35,
    description: "Game situation scenarios and decision making"
  },

  // Special Teams
  {
    id: 21,
    name: "Field Goal Practice",
    category: "special teams",
    intensity: "low",
    duration: 15,
    description: "Kicker accuracy and holder timing"
  },
  {
    id: 22,
    name: "Punt Coverage",
    category: "special teams",
    intensity: "moderate",
    duration: 20,
    description: "Punt team coverage and tackling"
  },
  {
    id: 23,
    name: "Kickoff Return",
    category: "special teams",
    intensity: "moderate",
    duration: 18,
    description: "Return team blocking and running"
  },
  {
    id: 24,
    name: "Punt Return",
    category: "special teams",
    intensity: "moderate",
    duration: 15,
    description: "Punt return catching and running"
  },
  {
    id: 25,
    name: "Onside Kick",
    category: "special teams",
    intensity: "moderate",
    duration: 12,
    description: "Onside kick execution and recovery"
  },

  // Recovery
  {
    id: 26,
    name: "Static Stretching",
    category: "recovery",
    intensity: "low",
    duration: 10,
    description: "Post-practice stretching to prevent injury"
  },
  {
    id: 27,
    name: "Ice Bath Rotation",
    category: "recovery",
    intensity: "low",
    duration: 15,
    description: "Cold therapy for muscle recovery"
  },
  {
    id: 28,
    name: "Light Walk",
    category: "recovery",
    intensity: "low",
    duration: 8,
    description: "Gentle walking to cool down"
  },
  {
    id: 29,
    name: "Team Meeting",
    category: "recovery",
    intensity: "low",
    duration: 10,
    description: "Post-practice discussion and review"
  }
];

// Utility functions for plan management
export const calculateTotalDuration = (drills) => {
  return drills.reduce((sum, drill) => sum + (drill.duration || 0), 0);
};

export const getDrillsByCategory = (drills, category) => {
  return drills.filter(drill => drill.category === category);
};

export const getDrillsByIntensity = (drills, intensity) => {
  return drills.filter(drill => drill.intensity === intensity);
};

export const validatePlan = (plan, drills) => {
  const totalDuration = calculateTotalDuration(drills);
  const warnings = [];
  
  if (totalDuration > 120) {
    warnings.push("Practice duration exceeds recommended 2-hour limit");
  }
  
  const highIntensityDrills = getDrillsByIntensity(drills, "high").length;
  if (highIntensityDrills > 3) {
    warnings.push("Too many high-intensity drills - consider adding recovery periods");
  }
  
  const warmupDrills = getDrillsByCategory(drills, "warmup");
  if (warmupDrills.length === 0) {
    warnings.push("No warmup drills included - consider adding warmup activities");
  }
  
  return warnings;
};

export const generateHydrationReminders = (totalDuration) => {
  const reminders = [];
  
  if (totalDuration > 60) {
    reminders.push("Schedule water break at 30-minute mark");
  }
  
  if (totalDuration > 90) {
    reminders.push("Schedule second water break at 60-minute mark");
  }
  
  if (totalDuration > 120) {
    reminders.push("Schedule third water break at 90-minute mark");
  }
  
  return reminders;
};

export const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};
