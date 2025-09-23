// cypress/plugins/index.ts

export default (on: any, config: any) => {
  // Add any custom plugins here
  
  // Example: Add custom command for taking screenshots
  on('task', {
    'screenshot:take': (name: string) => {
      // Custom screenshot logic
      return { success: true, message: `Screenshot taken: ${name}` };
    }
  });

  // Example: Add custom command for database operations
  on('task', {
    'db:query': (query: string) => {
      // Custom database query logic
      return { success: true, data: [] };
    }
  });

  return config;
};






