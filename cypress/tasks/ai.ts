// cypress/tasks/ai.ts

let aiMocks: Record<string, any> = {};

export const mockResponse = async (response: any) => {
  try {
    const { type, data } = response;
    aiMocks[type] = data;
    
    return { success: true, message: `AI mock set for ${type}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const resetMocks = async () => {
  try {
    aiMocks = {};
    return { success: true, message: 'AI mocks reset' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getMock = (type: string) => {
  return aiMocks[type] || null;
};






