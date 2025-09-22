// cypress/tasks/files.ts

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export const read = (filePath: string) => {
  try {
    const fullPath = join(process.cwd(), filePath);
    const content = readFileSync(fullPath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const write = (filePath: string, content: string) => {
  try {
    const fullPath = join(process.cwd(), filePath);
    writeFileSync(fullPath, content, 'utf8');
    return { success: true, message: 'File written successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteFile = (filePath: string) => {
  try {
    const fullPath = join(process.cwd(), filePath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
      return { success: true, message: 'File deleted successfully' };
    } else {
      return { success: false, error: 'File does not exist' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};


