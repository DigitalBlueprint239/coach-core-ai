// API service layer for backend integration
class APIService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Get headers for API requests
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Authentication required');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(response.token);
    return response.user;
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    this.setToken(response.token);
    return response.user;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  // Practice plan methods
  async getPracticePlans(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/practice-plans${queryParams ? `?${queryParams}` : ''}`;
    return await this.request(endpoint);
  }

  async getPracticePlan(id) {
    return await this.request(`/practice-plans/${id}`);
  }

  async createPracticePlan(planData) {
    return await this.request('/practice-plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  async updatePracticePlan(id, planData) {
    return await this.request(`/practice-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
  }

  async deletePracticePlan(id) {
    return await this.request(`/practice-plans/${id}`, {
      method: 'DELETE',
    });
  }

  async sharePracticePlan(id, shareData) {
    return await this.request(`/practice-plans/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(shareData),
    });
  }

  // Drill library methods
  async getDrills(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/drills${queryParams ? `?${queryParams}` : ''}`;
    return await this.request(endpoint);
  }

  async getDrill(id) {
    return await this.request(`/drills/${id}`);
  }

  async createDrill(drillData) {
    return await this.request('/drills', {
      method: 'POST',
      body: JSON.stringify(drillData),
    });
  }

  async updateDrill(id, drillData) {
    return await this.request(`/drills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(drillData),
    });
  }

  async deleteDrill(id) {
    return await this.request(`/drills/${id}`, {
      method: 'DELETE',
    });
  }

  async getFavoriteDrills() {
    return await this.request('/drills/favorites');
  }

  async toggleDrillFavorite(id) {
    return await this.request(`/drills/${id}/favorite`, {
      method: 'POST',
    });
  }

  // Feedback methods
  async getDrillFeedback(drillId) {
    return await this.request(`/drills/${drillId}/feedback`);
  }

  async submitDrillFeedback(drillId, feedbackData) {
    return await this.request(`/drills/${drillId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  }

  async getPracticeFeedback(practiceId) {
    return await this.request(`/practice-plans/${practiceId}/feedback`);
  }

  // AI integration methods
  async generateAISuggestions(prompt, context) {
    return await this.request('/ai/suggestions', {
      method: 'POST',
      body: JSON.stringify({ prompt, context }),
    });
  }

  async analyzePracticePlan(planData) {
    return await this.request('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  async optimizePracticePlan(planData) {
    return await this.request('/ai/optimize', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  // Export methods
  async exportPracticePlan(id, format) {
    const response = await this.request(`/practice-plans/${id}/export`, {
      method: 'POST',
      body: JSON.stringify({ format }),
    });
    
    // Handle file download
    if (response.downloadUrl) {
      window.open(response.downloadUrl, '_blank');
    }
    
    return response;
  }

  async generateShareableLink(id, options = {}) {
    return await this.request(`/practice-plans/${id}/share-link`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Team and roster methods
  async getTeams() {
    return await this.request('/teams');
  }

  async getTeam(id) {
    return await this.request(`/teams/${id}`);
  }

  async getTeamRoster(teamId) {
    return await this.request(`/teams/${teamId}/roster`);
  }

  async updateTeamRoster(teamId, rosterData) {
    return await this.request(`/teams/${teamId}/roster`, {
      method: 'PUT',
      body: JSON.stringify(rosterData),
    });
  }

  // Schedule methods
  async getPracticeSchedule(teamId, dateRange) {
    const queryParams = new URLSearchParams(dateRange).toString();
    const endpoint = `/teams/${teamId}/schedule${queryParams ? `?${queryParams}` : ''}`;
    return await this.request(endpoint);
  }

  async createPracticeSession(teamId, sessionData) {
    return await this.request(`/teams/${teamId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  // Analytics methods
  async getPracticeAnalytics(teamId, dateRange) {
    const queryParams = new URLSearchParams(dateRange).toString();
    const endpoint = `/analytics/practice${queryParams ? `?${queryParams}` : ''}`;
    return await this.request(endpoint);
  }

  async getDrillEffectiveness(teamId) {
    return await this.request(`/analytics/drills/${teamId}`);
  }

  async getPlayerProgress(teamId, playerId) {
    return await this.request(`/analytics/players/${teamId}/${playerId}`);
  }

  // Settings and preferences
  async getUserPreferences() {
    return await this.request('/user/preferences');
  }

  async updateUserPreferences(preferences) {
    return await this.request('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // File upload methods
  async uploadDrillVideo(file, drillId) {
    const formData = new FormData();
    formData.append('video', file);
    
    return await this.request(`/drills/${drillId}/video`, {
      method: 'POST',
      headers: {
        'Authorization': this.getHeaders().Authorization,
      },
      body: formData,
    });
  }

  async uploadTeamLogo(file, teamId) {
    const formData = new FormData();
    formData.append('logo', file);
    
    return await this.request(`/teams/${teamId}/logo`, {
      method: 'POST',
      headers: {
        'Authorization': this.getHeaders().Authorization,
      },
      body: formData,
    });
  }

  // Real-time sync methods
  async syncPracticePlan(id) {
    return await this.request(`/practice-plans/${id}/sync`, {
      method: 'POST',
    });
  }

  async getCollaborators(planId) {
    return await this.request(`/practice-plans/${planId}/collaborators`);
  }

  async inviteCollaborator(planId, email, role) {
    return await this.request(`/practice-plans/${planId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  // Notification methods
  async getNotifications() {
    return await this.request('/notifications');
  }

  async markNotificationRead(id) {
    return await this.request(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async updateNotificationPreferences(preferences) {
    return await this.request('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }
}

// Create singleton instance
const apiService = new APIService();

// Export the service and create hooks for React components
export default apiService;

// React hooks for API integration
export const useAPI = () => {
  return apiService;
};

// Custom hooks for specific API operations
export const usePracticePlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlans = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPracticePlans(filters);
      setPlans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async (planData) => {
    try {
      const newPlan = await apiService.createPracticePlan(planData);
      setPlans(prev => [...prev, newPlan]);
      return newPlan;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updatePlan = async (id, planData) => {
    try {
      const updatedPlan = await apiService.updatePracticePlan(id, planData);
      setPlans(prev => prev.map(plan => plan.id === id ? updatedPlan : plan));
      return updatedPlan;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deletePlan = async (id) => {
    try {
      await apiService.deletePracticePlan(id);
      setPlans(prev => prev.filter(plan => plan.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    plans,
    loading,
    error,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
  };
};

export const useDrills = () => {
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDrills = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getDrills(filters);
      setDrills(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDrill = async (drillData) => {
    try {
      const newDrill = await apiService.createDrill(drillData);
      setDrills(prev => [...prev, newDrill]);
      return newDrill;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    drills,
    loading,
    error,
    fetchDrills,
    createDrill,
  };
};

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSuggestions = async (prompt, context) => {
    setLoading(true);
    setError(null);
    try {
      const suggestions = await apiService.generateAISuggestions(prompt, context);
      return suggestions;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzePlan = async (planData) => {
    setLoading(true);
    setError(null);
    try {
      const analysis = await apiService.analyzePracticePlan(planData);
      return analysis;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    generateSuggestions,
    analyzePlan,
  };
}; 