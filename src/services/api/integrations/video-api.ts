import apiService from '../api-service';

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  url: string;
  platform: 'hudl' | 'youtube' | 'vimeo' | 'local';
  tags: string[];
  categories: string[];
  uploadDate: Date;
  lastModified: Date;
  size: number;
  resolution: string;
  fps: number;
}

export interface VideoAnalysis {
  id: string;
  videoId: string;
  analysisType: 'play-review' | 'technique' | 'strategy' | 'performance';
  timestamp: number;
  duration: number;
  notes: string;
  drawings: VideoDrawing[];
  ratings: VideoRating[];
  tags: string[];
  createdBy: string;
  createdAt: Date;
}

export interface VideoDrawing {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'line' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  text?: string;
  timestamp: number;
}

export interface VideoRating {
  category: string;
  score: number;
  maxScore: number;
  notes: string;
}

export interface VideoUploadOptions {
  title: string;
  description: string;
  tags: string[];
  categories: string[];
  privacy: 'public' | 'private' | 'team-only';
  allowComments: boolean;
  allowDownloads: boolean;
  autoGenerateThumbnail: boolean;
}

export interface VideoSearchFilters {
  query?: string;
  categories?: string[];
  tags?: string[];
  duration?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  platform?: string[];
  resolution?: string[];
}

class VideoAPIService {
  private hudlAPIKey: string;
  private youtubeAPIKey: string;
  private vimeoAPIKey: string;

  constructor() {
    this.hudlAPIKey = process.env.REACT_APP_HUDL_API_KEY || '';
    this.youtubeAPIKey = process.env.REACT_APP_YOUTUBE_API_KEY || '';
    this.vimeoAPIKey = process.env.REACT_APP_VIMEO_API_KEY || '';
  }

  // Hudl Integration
  async getHudlVideos(teamId: string, filters?: VideoSearchFilters): Promise<VideoMetadata[]> {
    try {
      const response = await apiService.get(`/hudl/teams/${teamId}/videos`, {
        ...this.buildHudlFilters(filters),
        api_key: this.hudlAPIKey,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch Hudl videos');
      }

      return this.transformHudlVideos(response.data);
    } catch (error) {
      console.error('Hudl API error:', error);
      throw error;
    }
  }

  async uploadToHudl(
    file: File,
    teamId: string,
    options: VideoUploadOptions
  ): Promise<VideoMetadata> {
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', options.title);
      formData.append('description', options.description);
      formData.append('tags', JSON.stringify(options.tags));
      formData.append('categories', JSON.stringify(options.categories));
      formData.append('privacy', options.privacy);
      formData.append('team_id', teamId);
      formData.append('api_key', this.hudlAPIKey);

      const response = await apiService.post('/hudl/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to upload video to Hudl');
      }

      return this.transformHudlVideo(response.data);
    } catch (error) {
      console.error('Hudl upload error:', error);
      throw error;
    }
  }

  async analyzeHudlVideo(videoId: string, analysis: Partial<VideoAnalysis>): Promise<VideoAnalysis> {
    try {
      const response = await apiService.post(`/hudl/videos/${videoId}/analysis`, {
        ...analysis,
        api_key: this.hudlAPIKey,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create video analysis');
      }

      return response.data;
    } catch (error) {
      console.error('Hudl analysis error:', error);
      throw error;
    }
  }

  // YouTube Integration
  async searchYouTubeVideos(query: string, filters?: VideoSearchFilters): Promise<VideoMetadata[]> {
    try {
      const response = await apiService.get('/youtube/search', {
        q: query,
        ...this.buildYouTubeFilters(filters),
        key: this.youtubeAPIKey,
        part: 'snippet',
        type: 'video',
        maxResults: 50,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to search YouTube videos');
      }

      return this.transformYouTubeVideos(response.data);
    } catch (error) {
      console.error('YouTube API error:', error);
      throw error;
    }
  }

  async getYouTubeVideoDetails(videoId: string): Promise<VideoMetadata> {
    try {
      const response = await apiService.get('/youtube/videos', {
        id: videoId,
        key: this.youtubeAPIKey,
        part: 'snippet,contentDetails,statistics',
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch YouTube video details');
      }

      return this.transformYouTubeVideo(response.data);
    } catch (error) {
      console.error('YouTube video details error:', error);
      throw error;
    }
  }

  // Vimeo Integration
  async searchVimeoVideos(query: string, filters?: VideoSearchFilters): Promise<VideoMetadata[]> {
    try {
      const response = await apiService.get('/vimeo/search', {
        query,
        ...this.buildVimeoFilters(filters),
        access_token: this.vimeoAPIKey,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to search Vimeo videos');
      }

      return this.transformVimeoVideos(response.data);
    } catch (error) {
      console.error('Vimeo API error:', error);
      throw error;
    }
  }

  // Local Video Management
  async uploadLocalVideo(
    file: File,
    options: VideoUploadOptions
  ): Promise<VideoMetadata> {
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('metadata', JSON.stringify(options));

      const response = await apiService.post('/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to upload local video');
      }

      return response.data;
    } catch (error) {
      console.error('Local video upload error:', error);
      throw error;
    }
  }

  async getLocalVideos(filters?: VideoSearchFilters): Promise<VideoMetadata[]> {
    try {
      const response = await apiService.get('/videos', this.buildLocalFilters(filters));

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch local videos');
      }

      return response.data;
    } catch (error) {
      console.error('Local videos fetch error:', error);
      throw error;
    }
  }

  async updateLocalVideo(videoId: string, updates: Partial<VideoMetadata>): Promise<VideoMetadata> {
    try {
      const response = await apiService.patch(`/videos/${videoId}`, updates);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update local video');
      }

      return response.data;
    } catch (error) {
      console.error('Local video update error:', error);
      throw error;
    }
  }

  async deleteLocalVideo(videoId: string): Promise<boolean> {
    try {
      const response = await apiService.delete(`/videos/${videoId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete local video');
      }

      return true;
    } catch (error) {
      console.error('Local video deletion error:', error);
      throw error;
    }
  }

  // Video Analysis
  async createVideoAnalysis(analysis: Partial<VideoAnalysis>): Promise<VideoAnalysis> {
    try {
      const response = await apiService.post('/video-analysis', analysis);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create video analysis');
      }

      return response.data;
    } catch (error) {
      console.error('Video analysis creation error:', error);
      throw error;
    }
  }

  async getVideoAnalysis(analysisId: string): Promise<VideoAnalysis> {
    try {
      const response = await apiService.get(`/video-analysis/${analysisId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch video analysis');
      }

      return response.data;
    } catch (error) {
      console.error('Video analysis fetch error:', error);
      throw error;
    }
  }

  async updateVideoAnalysis(analysisId: string, updates: Partial<VideoAnalysis>): Promise<VideoAnalysis> {
    try {
      const response = await apiService.patch(`/video-analysis/${analysisId}`, updates);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update video analysis');
      }

      return response.data;
    } catch (error) {
      console.error('Video analysis update error:', error);
      throw error;
    }
  }

  // Helper methods for building filters
  private buildHudlFilters(filters?: VideoSearchFilters): Record<string, any> {
    const hudlFilters: Record<string, any> = {};
    
    if (filters?.query) hudlFilters.search = filters.query;
    if (filters?.categories?.length) hudlFilters.categories = filters.categories.join(',');
    if (filters?.tags?.length) hudlFilters.tags = filters.tags.join(',');
    if (filters?.duration?.min) hudlFilters.min_duration = filters.duration.min;
    if (filters?.duration?.max) hudlFilters.max_duration = filters.duration.max;
    if (filters?.dateRange?.start) hudlFilters.start_date = filters.dateRange.start.toISOString();
    if (filters?.dateRange?.end) hudlFilters.end_date = filters.dateRange.end.toISOString();

    return hudlFilters;
  }

  private buildYouTubeFilters(filters?: VideoSearchFilters): Record<string, any> {
    const youtubeFilters: Record<string, any> = {};
    
    if (filters?.categories?.length) youtubeFilters.videoCategoryId = filters.categories[0];
    if (filters?.duration?.min) youtubeFilters.videoDuration = 'medium';
    if (filters?.duration?.max) youtubeFilters.videoDuration = 'short';
    if (filters?.dateRange?.start) youtubeFilters.publishedAfter = filters.dateRange.start.toISOString();
    if (filters?.dateRange?.end) youtubeFilters.publishedBefore = filters.dateRange.end.toISOString();

    return youtubeFilters;
  }

  private buildVimeoFilters(filters?: VideoSearchFilters): Record<string, any> {
    const vimeoFilters: Record<string, any> = {};
    
    if (filters?.categories?.length) vimeoFilters.categories = filters.categories.join(',');
    if (filters?.duration?.min) vimeoFilters.min_duration = filters.duration.min;
    if (filters?.duration?.max) vimeoFilters.max_duration = filters.duration.max;
    if (filters?.dateRange?.start) vimeoFilters.created_time = filters.dateRange.start.toISOString();

    return vimeoFilters;
  }

  private buildLocalFilters(filters?: VideoSearchFilters): Record<string, any> {
    const localFilters: Record<string, any> = {};
    
    if (filters?.query) localFilters.search = filters.query;
    if (filters?.categories?.length) localFilters.categories = filters.categories.join(',');
    if (filters?.tags?.length) localFilters.tags = filters.tags.join(',');
    if (filters?.platform?.length) localFilters.platforms = filters.platform.join(',');

    return localFilters;
  }

  // Data transformation methods
  private transformHudlVideos(data: any[]): VideoMetadata[] {
    return data.map(video => this.transformHudlVideo(video));
  }

  private transformHudlVideo(data: any): VideoMetadata {
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      duration: data.duration || 0,
      thumbnail: data.thumbnail || '',
      url: data.url,
      platform: 'hudl',
      tags: data.tags || [],
      categories: data.categories || [],
      uploadDate: new Date(data.upload_date),
      lastModified: new Date(data.last_modified),
      size: data.file_size || 0,
      resolution: data.resolution || '',
      fps: data.fps || 30,
    };
  }

  private transformYouTubeVideos(data: any[]): VideoMetadata[] {
    return data.map(video => this.transformYouTubeVideo(video));
  }

  private transformYouTubeVideo(data: any): VideoMetadata {
    return {
      id: data.id.videoId,
      title: data.snippet.title,
      description: data.snippet.description,
      duration: 0, // Would need contentDetails for actual duration
      thumbnail: data.snippet.thumbnails.high.url,
      url: `https://www.youtube.com/watch?v=${data.id.videoId}`,
      platform: 'youtube',
      tags: data.snippet.tags || [],
      categories: [data.snippet.categoryId],
      uploadDate: new Date(data.snippet.publishedAt),
      lastModified: new Date(data.snippet.publishedAt),
      size: 0,
      resolution: '',
      fps: 30,
    };
  }

  private transformVimeoVideos(data: any[]): VideoMetadata[] {
    return data.map(video => this.transformVimeoVideo(video));
  }

  private transformVimeoVideo(data: any): VideoMetadata {
    return {
      id: data.uri.split('/').pop() || '',
      title: data.name,
      description: data.description || '',
      duration: data.duration,
      thumbnail: data.pictures.base_link,
      url: data.link,
      platform: 'vimeo',
      tags: data.tags.map((tag: any) => tag.tag),
      categories: data.categories.map((cat: any) => cat.name),
      uploadDate: new Date(data.created_time),
      lastModified: new Date(data.modified_time),
      size: 0,
      resolution: data.width + 'x' + data.height,
      fps: 30,
    };
  }
}

export const videoAPIService = new VideoAPIService();
export default videoAPIService;
