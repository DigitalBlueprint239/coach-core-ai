/**
 * Thumbnail Generator for Play Library
 * - Efficient canvas-based thumbnail generation
 * - Caching with LRU eviction
 * - Lazy loading support
 * - Memory usage optimization
 */

interface Play {
  id: string;
  name: string;
  players: Array<{
    id: string;
    x: number;
    y: number;
    number: string;
    position: string;
    color: string;
    selected: boolean;
  }>;
  routes: Array<{
    id: string;
    playerId: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    type: string;
  }>;
  formation: string;
  phase: string;
  type: string;
  createdAt: Date;
  thumbnail?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  description?: string;
}

interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  includeRoutes?: boolean;
  includePlayers?: boolean;
  includeField?: boolean;
  backgroundColor?: string;
  fieldColor?: string;
  playerSize?: number;
  routeWidth?: number;
}

interface ThumbnailCache {
  [playId: string]: {
    dataUrl: string;
    timestamp: number;
    options: ThumbnailOptions;
  };
}

class ThumbnailGenerator {
  private cache: ThumbnailCache = {};
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private maxCacheSize = 100;
  private defaultOptions: ThumbnailOptions = {
    width: 200,
    height: 120,
    quality: 0.8,
    includeRoutes: true,
    includePlayers: true,
    includeField: true,
    backgroundColor: '#f8fafc',
    fieldColor: '#15803d',
    playerSize: 4,
    routeWidth: 2
  };

  constructor() {
    this.initializeCanvas();
  }

  private initializeCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    if (!this.ctx) {
      console.error('Failed to get 2D context for thumbnail generation');
    }
  }

  /**
   * Generate thumbnail for a play
   */
  async generateThumbnail(
    play: Play,
    options: Partial<ThumbnailOptions> = {}
  ): Promise<string> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const cacheKey = this.getCacheKey(play.id, finalOptions);

    // Check cache first
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey].dataUrl;
    }

    // Generate new thumbnail
    const dataUrl = await this.renderThumbnail(play, finalOptions);

    // Cache the result
    this.cacheThumbnail(cacheKey, dataUrl, finalOptions);

    return dataUrl;
  }

  /**
   * Render thumbnail on canvas
   */
  private async renderThumbnail(
    play: Play,
    options: ThumbnailOptions
  ): Promise<string> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not initialized');
    }

    const { width, height, backgroundColor, fieldColor } = options;

    // Set canvas dimensions
    this.canvas.width = width;
    this.canvas.height = height;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw background
    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    // Draw field
    if (options.includeField) {
      this.drawField(width, height, fieldColor);
    }

    // Draw routes
    if (options.includeRoutes) {
      this.drawRoutes(play.routes, width, height, options);
    }

    // Draw players
    if (options.includePlayers) {
      this.drawPlayers(play.players, width, height, options);
    }

    // Convert to data URL
    return this.canvas.toDataURL('image/jpeg', options.quality);
  }

  /**
   * Draw football field
   */
  private drawField(width: number, height: number, fieldColor: string): void {
    if (!this.ctx) return;

    // Field background
    this.ctx.fillStyle = fieldColor;
    this.ctx.fillRect(0, 0, width, height);

    // End zones
    const endzoneWidth = width * 0.1;
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.globalAlpha = 0.13;
    this.ctx.fillRect(0, 0, endzoneWidth, height);
    this.ctx.fillRect(width - endzoneWidth, 0, endzoneWidth, height);
    this.ctx.globalAlpha = 1;

    // Yard lines
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    const yardLineSpacing = (width - 2 * endzoneWidth) / 10;
    
    for (let i = 1; i < 10; i++) {
      const x = endzoneWidth + i * yardLineSpacing;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    // Hash marks
    for (let i = 1; i < 10; i++) {
      const x = endzoneWidth + i * yardLineSpacing;
      const hashMarkLength = 5;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, hashMarkLength);
      this.ctx.moveTo(x, height - hashMarkLength);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
  }

  /**
   * Draw routes on canvas
   */
  private drawRoutes(
    routes: Play['routes'],
    width: number,
    height: number,
    options: ThumbnailOptions
  ): void {
    if (!this.ctx) return;

    const { routeWidth } = options;

    routes.forEach(route => {
      if (route.points.length < 2) return;

      this.ctx.strokeStyle = route.color;
      this.ctx.lineWidth = routeWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      // Draw route path
      this.ctx.beginPath();
      route.points.forEach((point, index) => {
        const x = (point.x / 600) * width; // Scale from field coordinates
        const y = (point.y / 300) * height;
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      this.ctx.stroke();

      // Draw arrows
      this.drawRouteArrows(route.points, width, height, route.color);
    });
  }

  /**
   * Draw arrows on routes
   */
  private drawRouteArrows(
    points: Array<{ x: number; y: number }>,
    width: number,
    height: number,
    color: string
  ): void {
    if (!this.ctx || points.length < 2) return;

    // Draw arrow at midpoint
    const midIndex = Math.floor(points.length / 2);
    const p1 = points[midIndex];
    const p2 = points[midIndex + 1];

    if (!p1 || !p2) return;

    const x1 = (p1.x / 600) * width;
    const y1 = (p1.y / 300) * height;
    const x2 = (p2.x / 600) * width;
    const y2 = (p2.y / 300) * height;

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    this.ctx.save();
    this.ctx.translate(midX, midY);
    this.ctx.rotate(angle);

    // Draw arrow
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-8, -4);
    this.ctx.lineTo(-8, 4);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Draw players on canvas
   */
  private drawPlayers(
    players: Play['players'],
    width: number,
    height: number,
    options: ThumbnailOptions
  ): void {
    if (!this.ctx) return;

    const { playerSize } = options;

    players.forEach(player => {
      const x = (player.x / 600) * width;
      const y = (player.y / 300) * height;

      // Player circle
      this.ctx.beginPath();
      this.ctx.arc(x, y, playerSize, 0, 2 * Math.PI);
      this.ctx.fillStyle = player.color;
      this.ctx.fill();

      // Player border
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = '#fff';
      this.ctx.stroke();

      // Player number (if space allows)
      if (playerSize > 3) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `${Math.max(8, playerSize)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(player.number, x, y);
      }
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(playId: string, options: ThumbnailOptions): string {
    return `${playId}-${JSON.stringify(options)}`;
  }

  /**
   * Cache thumbnail with LRU eviction
   */
  private cacheThumbnail(
    key: string,
    dataUrl: string,
    options: ThumbnailOptions
  ): void {
    // Remove oldest entries if cache is full
    if (Object.keys(this.cache).length >= this.maxCacheSize) {
      const oldestKey = Object.keys(this.cache).reduce((oldest, current) => {
        return this.cache[current].timestamp < this.cache[oldest].timestamp
          ? current
          : oldest;
      });
      delete this.cache[oldestKey];
    }

    // Add new entry
    this.cache[key] = {
      dataUrl,
      timestamp: Date.now(),
      options
    };
  }

  /**
   * Preload thumbnails for visible items
   */
  async preloadThumbnails(
    plays: Play[],
    options: Partial<ThumbnailOptions> = {}
  ): Promise<void> {
    const promises = plays.map(play => 
      this.generateThumbnail(play, options).catch(error => {
        console.warn(`Failed to preload thumbnail for play ${play.id}:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const size = Object.keys(this.cache).length;
    const totalMemory = Object.values(this.cache).reduce(
      (total, item) => total + item.dataUrl.length,
      0
    );

    return {
      size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses
      memoryUsage: totalMemory
    };
  }

  /**
   * Set cache size limit
   */
  setMaxCacheSize(size: number): void {
    this.maxCacheSize = size;
    
    // Evict excess items
    while (Object.keys(this.cache).length > this.maxCacheSize) {
      const oldestKey = Object.keys(this.cache).reduce((oldest, current) => {
        return this.cache[current].timestamp < this.cache[oldest].timestamp
          ? current
          : oldest;
      });
      delete this.cache[oldestKey];
    }
  }

  /**
   * Generate thumbnail with custom dimensions
   */
  async generateCustomThumbnail(
    play: Play,
    width: number,
    height: number,
    options: Partial<ThumbnailOptions> = {}
  ): Promise<string> {
    return this.generateThumbnail(play, {
      ...options,
      width,
      height
    });
  }

  /**
   * Generate multiple thumbnails in batch
   */
  async generateBatchThumbnails(
    plays: Play[],
    options: Partial<ThumbnailOptions> = {}
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Process in batches to avoid overwhelming the browser
    const batchSize = 5;
    for (let i = 0; i < plays.length; i += batchSize) {
      const batch = plays.slice(i, i + batchSize);
      const batchPromises = batch.map(async (play) => {
        try {
          const thumbnail = await this.generateThumbnail(play, options);
          results.set(play.id, thumbnail);
        } catch (error) {
          console.error(`Failed to generate thumbnail for play ${play.id}:`, error);
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return results;
  }
}

// Create singleton instance
const thumbnailGenerator = new ThumbnailGenerator();

export default thumbnailGenerator;
export { ThumbnailGenerator };
export type { Play, ThumbnailOptions }; 