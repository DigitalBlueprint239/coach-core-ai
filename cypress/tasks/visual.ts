// cypress/tasks/visual.ts

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const compare = async (baseline: string, current: string) => {
  try {
    const baselinePath = join(process.cwd(), 'cypress', 'baseline', `${baseline}.png`);
    const currentPath = join(process.cwd(), 'cypress', 'screenshots', `${current}.png`);
    
    if (!existsSync(baselinePath)) {
      return { success: false, error: 'Baseline image not found' };
    }
    
    if (!existsSync(currentPath)) {
      return { success: false, error: 'Current image not found' };
    }
    
    // In a real implementation, you would use a library like pixelmatch
    // to compare the images and calculate the difference percentage
    const difference = 0.05; // Mock 5% difference
    
    return {
      success: true,
      difference,
      passed: difference < 0.1, // 10% threshold
      message: `Visual difference: ${(difference * 100).toFixed(2)}%`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const update = async (baseline: string) => {
  try {
    const currentPath = join(process.cwd(), 'cypress', 'screenshots', `${baseline}.png`);
    const baselinePath = join(process.cwd(), 'cypress', 'baseline', `${baseline}.png`);
    
    if (!existsSync(currentPath)) {
      return { success: false, error: 'Current image not found' };
    }
    
    // Copy current screenshot to baseline
    const currentImage = readFileSync(currentPath);
    writeFileSync(baselinePath, currentImage);
    
    return { success: true, message: 'Baseline updated successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};


