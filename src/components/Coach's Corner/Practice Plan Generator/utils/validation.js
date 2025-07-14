// Advanced validation system for practice plans
export class PracticePlanValidator {
  constructor(sportProgram, rosterDetails, practiceSchedule) {
    this.sportProgram = sportProgram;
    this.rosterDetails = rosterDetails;
    this.practiceSchedule = practiceSchedule;
    this.warnings = [];
    this.errors = [];
    this.suggestions = [];
  }

  // Main validation method
  validatePlan(plan, drills) {
    this.warnings = [];
    this.errors = [];
    this.suggestions = [];

    this.validateDuration(plan, drills);
    this.validateIntensityBalance(drills);
    this.validateWarmupInclusion(drills);
    this.validatePositionCoverage(drills);
    this.validateDrillProgression(drills);
    this.validateEquipmentNeeds(drills);
    this.validateWeatherCompatibility(drills);
    this.validateRecoveryInclusion(drills);
    this.validateSpecialTeamsBalance(drills);
    this.validateTimeDistribution(plan, drills);

    return {
      isValid: this.errors.length === 0,
      warnings: this.warnings,
      errors: this.errors,
      suggestions: this.suggestions,
      score: this.calculatePlanScore(plan, drills)
    };
  }

  // Duration validation
  validateDuration(plan, drills) {
    const totalDuration = this.calculateTotalDuration(drills);
    const planDuration = plan.reduce((sum, period) => sum + period.minutes, 0);

    if (totalDuration > 120) {
      this.errors.push({
        type: 'duration',
        severity: 'error',
        message: 'Practice duration exceeds recommended 2-hour limit',
        details: `Current duration: ${totalDuration} minutes`,
        suggestion: 'Consider reducing drill durations or removing some drills'
      });
    } else if (totalDuration > 90) {
      this.warnings.push({
        type: 'duration',
        severity: 'warning',
        message: 'Practice duration is approaching the 2-hour limit',
        details: `Current duration: ${totalDuration} minutes`,
        suggestion: 'Monitor athlete fatigue and ensure adequate rest periods'
      });
    }

    if (Math.abs(totalDuration - planDuration) > 10) {
      this.warnings.push({
        type: 'duration_mismatch',
        severity: 'warning',
        message: 'Drill duration doesn\'t match practice period allocation',
        details: `Drills: ${totalDuration}min, Periods: ${planDuration}min`,
        suggestion: 'Adjust drill durations to fit within allocated periods'
      });
    }
  }

  // Intensity balance validation
  validateIntensityBalance(drills) {
    const intensityCounts = this.countByIntensity(drills);
    const totalDrills = drills.length;

    if (intensityCounts.high > 3) {
      this.errors.push({
        type: 'intensity',
        severity: 'error',
        message: 'Too many high-intensity drills',
        details: `${intensityCounts.high} high-intensity drills out of ${totalDrills} total`,
        suggestion: 'Add more moderate or low-intensity drills for balance'
      });
    }

    if (intensityCounts.high > 0 && intensityCounts.low === 0) {
      this.warnings.push({
        type: 'intensity_balance',
        severity: 'warning',
        message: 'No low-intensity recovery drills included',
        suggestion: 'Add warmup, cooldown, or recovery drills'
      });
    }

    // Check for proper intensity progression
    const intensityOrder = this.checkIntensityProgression(drills);
    if (!intensityOrder.isValid) {
      this.warnings.push({
        type: 'intensity_progression',
        severity: 'warning',
        message: 'Intensity progression may be too steep',
        details: intensityOrder.details,
        suggestion: 'Consider gradual intensity increase: low → moderate → high → moderate → low'
      });
    }
  }

  // Warmup validation
  validateWarmupInclusion(drills) {
    const warmupDrills = drills.filter(drill => drill.category === 'warmup');
    
    if (warmupDrills.length === 0) {
      this.errors.push({
        type: 'warmup',
        severity: 'error',
        message: 'No warmup drills included',
        suggestion: 'Add 10-15 minutes of warmup activities to prevent injury'
      });
    } else if (warmupDrills.length < 2) {
      this.warnings.push({
        type: 'warmup',
        severity: 'warning',
        message: 'Limited warmup variety',
        suggestion: 'Consider adding more warmup drills for comprehensive preparation'
      });
    }
  }

  // Position coverage validation
  validatePositionCoverage(drills) {
    if (!this.rosterDetails || this.rosterDetails.length === 0) {
      return; // Skip if no roster data
    }

    const positions = this.getUniquePositions();
    const positionDrills = this.getPositionSpecificDrills(drills);
    const uncoveredPositions = positions.filter(pos => !positionDrills[pos]);

    if (uncoveredPositions.length > 0) {
      this.warnings.push({
        type: 'position_coverage',
        severity: 'warning',
        message: 'Some positions lack specific drill coverage',
        details: `Missing drills for: ${uncoveredPositions.join(', ')}`,
        suggestion: 'Add position-specific drills or ensure general drills benefit all positions'
      });
    }
  }

  // Drill progression validation
  validateDrillProgression(drills) {
    const progression = this.analyzeDrillProgression(drills);
    
    if (progression.hasRapidIntensityChange) {
      this.warnings.push({
        type: 'progression',
        severity: 'warning',
        message: 'Rapid intensity changes detected',
        details: progression.details,
        suggestion: 'Gradually increase intensity to prevent injury and improve performance'
      });
    }
  }

  // Equipment validation
  validateEquipmentNeeds(drills) {
    const requiredEquipment = this.getRequiredEquipment(drills);
    const missingEquipment = this.checkEquipmentAvailability(requiredEquipment);

    if (missingEquipment.length > 0) {
      this.warnings.push({
        type: 'equipment',
        severity: 'warning',
        message: 'Some drills require equipment that may not be available',
        details: `Missing: ${missingEquipment.join(', ')}`,
        suggestion: 'Verify equipment availability or substitute with alternative drills'
      });
    }
  }

  // Weather compatibility validation
  validateWeatherCompatibility(drills) {
    // This would integrate with weather API
    const weatherConditions = this.getCurrentWeather();
    const incompatibleDrills = this.getWeatherIncompatibleDrills(drills, weatherConditions);

    if (incompatibleDrills.length > 0) {
      this.warnings.push({
        type: 'weather',
        severity: 'warning',
        message: 'Some drills may be affected by weather conditions',
        details: `Weather: ${weatherConditions.description}`,
        suggestion: 'Consider indoor alternatives or weather-appropriate modifications'
      });
    }
  }

  // Recovery validation
  validateRecoveryInclusion(drills) {
    const recoveryDrills = drills.filter(drill => drill.category === 'recovery');
    const totalDuration = this.calculateTotalDuration(drills);

    if (recoveryDrills.length === 0 && totalDuration > 60) {
      this.warnings.push({
        type: 'recovery',
        severity: 'warning',
        message: 'No recovery or cooldown drills included',
        suggestion: 'Add stretching, light walking, or team meeting for proper recovery'
      });
    }
  }

  // Special teams balance validation
  validateSpecialTeamsBalance(drills) {
    const specialTeamsDrills = drills.filter(drill => drill.category === 'special teams');
    
    if (specialTeamsDrills.length === 0) {
      this.suggestions.push({
        type: 'special_teams',
        severity: 'info',
        message: 'No special teams practice included',
        suggestion: 'Consider adding kicking, punting, or return drills'
      });
    }
  }

  // Time distribution validation
  validateTimeDistribution(plan, drills) {
    const timeSlots = this.analyzeTimeDistribution(drills);
    const gaps = this.findTimeGaps(timeSlots);
    const overlaps = this.findTimeOverlaps(timeSlots);

    if (gaps.length > 0) {
      this.warnings.push({
        type: 'time_gaps',
        severity: 'warning',
        message: 'Time gaps detected in practice schedule',
        details: `Gaps at: ${gaps.map(gap => `${gap.start}-${gap.end}`).join(', ')}`,
        suggestion: 'Fill gaps with additional drills or rest periods'
      });
    }

    if (overlaps.length > 0) {
      this.errors.push({
        type: 'time_overlaps',
        severity: 'error',
        message: 'Drill time conflicts detected',
        details: `Overlaps: ${overlaps.map(overlap => overlap.details).join(', ')}`,
        suggestion: 'Reschedule drills to avoid conflicts'
      });
    }
  }

  // Helper methods
  calculateTotalDuration(drills) {
    return drills.reduce((sum, drill) => sum + (drill.duration || 0), 0);
  }

  countByIntensity(drills) {
    return drills.reduce((counts, drill) => {
      const intensity = drill.intensity || 'moderate';
      counts[intensity] = (counts[intensity] || 0) + 1;
      return counts;
    }, {});
  }

  checkIntensityProgression(drills) {
    const intensityOrder = drills.map(drill => drill.intensity || 'moderate');
    let rapidChanges = 0;
    let details = [];

    for (let i = 1; i < intensityOrder.length; i++) {
      const current = intensityOrder[i];
      const previous = intensityOrder[i - 1];
      
      if ((previous === 'low' && current === 'high') || 
          (previous === 'high' && current === 'low')) {
        rapidChanges++;
        details.push(`${previous} → ${current} at drill ${i + 1}`);
      }
    }

    return {
      isValid: rapidChanges <= 1,
      hasRapidIntensityChange: rapidChanges > 1,
      details: details.join(', ')
    };
  }

  getUniquePositions() {
    return [...new Set(this.rosterDetails.map(player => player.position))];
  }

  getPositionSpecificDrills(drills) {
    const positionDrills = {};
    
    drills.forEach(drill => {
      if (drill.positions) {
        drill.positions.forEach(pos => {
          positionDrills[pos] = true;
        });
      }
    });

    return positionDrills;
  }

  analyzeDrillProgression(drills) {
    const intensities = drills.map(drill => drill.intensity || 'moderate');
    let rapidChanges = 0;
    let details = [];

    for (let i = 1; i < intensities.length; i++) {
      const current = intensities[i];
      const previous = intensities[i - 1];
      
      if (this.isRapidChange(previous, current)) {
        rapidChanges++;
        details.push(`${drills[i - 1].name} (${previous}) → ${drills[i].name} (${current})`);
      }
    }

    return {
      hasRapidIntensityChange: rapidChanges > 0,
      details: details.join(', ')
    };
  }

  isRapidChange(from, to) {
    const intensityLevels = { low: 1, moderate: 2, high: 3 };
    return Math.abs(intensityLevels[from] - intensityLevels[to]) > 1;
  }

  getRequiredEquipment(drills) {
    const equipment = new Set();
    
    drills.forEach(drill => {
      if (drill.equipment) {
        drill.equipment.forEach(item => equipment.add(item));
      }
    });

    return Array.from(equipment);
  }

  checkEquipmentAvailability(requiredEquipment) {
    // This would check against available equipment inventory
    const availableEquipment = ['cones', 'balls', 'agility ladders', 'tackle dummies'];
    return requiredEquipment.filter(item => !availableEquipment.includes(item));
  }

  getCurrentWeather() {
    // This would integrate with weather API
    return {
      temperature: 75,
      condition: 'sunny',
      description: 'Sunny, 75°F'
    };
  }

  getWeatherIncompatibleDrills(drills, weather) {
    const incompatible = [];
    
    drills.forEach(drill => {
      if (drill.weatherRestrictions) {
        const restrictions = drill.weatherRestrictions;
        if (restrictions.rain && weather.condition === 'rainy') {
          incompatible.push(drill.name);
        }
        if (restrictions.cold && weather.temperature < 40) {
          incompatible.push(drill.name);
        }
      }
    });

    return incompatible;
  }

  analyzeTimeDistribution(drills) {
    return drills
      .filter(drill => drill.timeSlot !== undefined)
      .map(drill => ({
        name: drill.name,
        start: drill.timeSlot,
        end: drill.timeSlot + (drill.duration || 15),
        duration: drill.duration || 15
      }))
      .sort((a, b) => a.start - b.start);
  }

  findTimeGaps(timeSlots) {
    const gaps = [];
    
    for (let i = 1; i < timeSlots.length; i++) {
      const previousEnd = timeSlots[i - 1].end;
      const currentStart = timeSlots[i].start;
      
      if (currentStart - previousEnd > 15) {
        gaps.push({
          start: previousEnd,
          end: currentStart,
          duration: currentStart - previousEnd
        });
      }
    }

    return gaps;
  }

  findTimeOverlaps(timeSlots) {
    const overlaps = [];
    
    for (let i = 0; i < timeSlots.length; i++) {
      for (let j = i + 1; j < timeSlots.length; j++) {
        const slot1 = timeSlots[i];
        const slot2 = timeSlots[j];
        
        if (slot1.start < slot2.end && slot1.end > slot2.start) {
          overlaps.push({
            drill1: slot1.name,
            drill2: slot2.name,
            details: `${slot1.name} conflicts with ${slot2.name}`
          });
        }
      }
    }

    return overlaps;
  }

  calculatePlanScore(plan, drills) {
    let score = 100;
    
    // Deduct points for each validation issue
    score -= this.errors.length * 20;
    score -= this.warnings.length * 5;
    
    // Bonus points for good practices
    const warmupDrills = drills.filter(d => d.category === 'warmup');
    const recoveryDrills = drills.filter(d => d.category === 'recovery');
    const totalDuration = this.calculateTotalDuration(drills);
    
    if (warmupDrills.length > 0) score += 10;
    if (recoveryDrills.length > 0) score += 10;
    if (totalDuration >= 60 && totalDuration <= 90) score += 15;
    
    return Math.max(0, Math.min(100, score));
  }
}

// Export validation utilities
export const validatePracticePlan = (plan, drills, sportProgram, rosterDetails, practiceSchedule) => {
  const validator = new PracticePlanValidator(sportProgram, rosterDetails, practiceSchedule);
  return validator.validatePlan(plan, drills);
};

export const getValidationSummary = (validationResult) => {
  const { isValid, warnings, errors, suggestions, score } = validationResult;
  
  return {
    status: isValid ? 'valid' : 'needs_attention',
    score,
    issues: errors.length + warnings.length,
    recommendations: suggestions.length,
    summary: `${score}/100 - ${errors.length} errors, ${warnings.length} warnings, ${suggestions.length} suggestions`
  };
}; 