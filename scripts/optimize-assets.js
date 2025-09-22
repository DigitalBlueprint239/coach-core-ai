#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

console.log('🚀 Starting Asset Optimization...');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Image optimization settings
  images: {
    webp: {
      quality: 85,
      effort: 6,
      lossless: false,
    },
    avif: {
      quality: 80,
      effort: 4,
      lossless: false,
    },
    jpeg: {
      quality: 90,
      progressive: true,
      mozjpeg: true,
    },
    png: {
      quality: 90,
      compressionLevel: 9,
      progressive: true,
    },
    // Responsive image sizes
    sizes: [
      { width: 320, suffix: '-sm' },
      { width: 640, suffix: '-md' },
      { width: 1024, suffix: '-lg' },
      { width: 1920, suffix: '-xl' },
    ],
  },
  // Font optimization settings
  fonts: {
    subset: true,
    preload: true,
    formats: ['woff2', 'woff'],
  },
  // Directories to process
  directories: {
    public: './public',
    src: './src',
    dist: './dist',
  },
  // File patterns
  patterns: {
    images: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
    fonts: /\.(woff2?|ttf|otf|eot)$/i,
  },
};

// ============================================
// IMAGE OPTIMIZATION
// ============================================

class ImageOptimizer {
  constructor() {
    this.processedImages = new Set();
    this.optimizationStats = {
      total: 0,
      processed: 0,
      skipped: 0,
      errors: 0,
      sizeReduction: 0,
    };
  }

  async optimizeImage(inputPath, outputDir, options = {}) {
    try {
      const stats = fs.statSync(inputPath);
      const originalSize = stats.size;
      
      const ext = path.extname(inputPath).toLowerCase();
      const name = path.basename(inputPath, ext);
      const relativePath = path.relative(process.cwd(), inputPath);
      
      console.log(`📸 Processing: ${relativePath}`);

      // Skip if already processed
      if (this.processedImages.has(inputPath)) {
        this.optimizationStats.skipped++;
        return;
      }

      this.processedImages.add(inputPath);
      this.optimizationStats.total++;

      // Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate multiple formats and sizes
      const formats = ['webp', 'avif', 'jpeg'];
      const sizes = CONFIG.images.sizes;
      
      for (const format of formats) {
        for (const size of sizes) {
          const outputPath = path.join(
            outputDir,
            `${name}${size.suffix}.${format}`
          );

          await this.generateImage(inputPath, outputPath, format, size.width);
        }
      }

      // Generate original format optimized version
      const optimizedOriginal = path.join(outputDir, `${name}-optimized${ext}`);
      await this.generateImage(inputPath, optimizedOriginal, ext.slice(1));

      // Calculate size reduction
      const optimizedStats = fs.statSync(optimizedOriginal);
      const sizeReduction = originalSize - optimizedStats.size;
      this.optimizationStats.sizeReduction += sizeReduction;
      this.optimizationStats.processed++;

      console.log(`✅ Optimized: ${relativePath} (${this.formatBytes(sizeReduction)} saved)`);

    } catch (error) {
      console.error(`❌ Error optimizing ${inputPath}:`, error.message);
      this.optimizationStats.errors++;
    }
  }

  async generateImage(inputPath, outputPath, format, width = null) {
    let pipeline = sharp(inputPath);

    // Resize if width specified
    if (width) {
      pipeline = pipeline.resize(width, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    // Apply format-specific optimizations
    switch (format) {
      case 'webp':
        pipeline = pipeline.webp(CONFIG.images.webp);
        break;
      case 'avif':
        pipeline = pipeline.avif(CONFIG.images.avif);
        break;
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg(CONFIG.images.jpeg);
        break;
      case 'png':
        pipeline = pipeline.png(CONFIG.images.png);
        break;
      default:
        // Keep original format with optimization
        break;
    }

    await pipeline.toFile(outputPath);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStats() {
    return {
      ...this.optimizationStats,
      sizeReductionFormatted: this.formatBytes(this.optimizationStats.sizeReduction),
    };
  }
}

// ============================================
// FONT OPTIMIZATION
// ============================================

class FontOptimizer {
  constructor() {
    this.processedFonts = new Set();
    this.fontStats = {
      total: 0,
      processed: 0,
      errors: 0,
    };
  }

  async optimizeFonts() {
    console.log('🔤 Optimizing fonts...');

    // Find all font files
    const fontFiles = this.findFontFiles();
    
    for (const fontPath of fontFiles) {
      try {
        await this.optimizeFont(fontPath);
      } catch (error) {
        console.error(`❌ Error optimizing font ${fontPath}:`, error.message);
        this.fontStats.errors++;
      }
    }

    console.log(`✅ Font optimization complete: ${this.fontStats.processed}/${this.fontStats.total} fonts processed`);
  }

  findFontFiles() {
    const fontFiles = [];
    
    // Search in public and src directories
    const searchDirs = [CONFIG.directories.public, CONFIG.directories.src];
    
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        this.findFilesRecursively(dir, CONFIG.patterns.fonts, fontFiles);
      }
    }

    return fontFiles;
  }

  findFilesRecursively(dir, pattern, files) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.findFilesRecursively(fullPath, pattern, files);
      } else if (pattern.test(item)) {
        files.push(fullPath);
      }
    }
  }

  async optimizeFont(fontPath) {
    this.fontStats.total++;
    
    // For now, just copy fonts to dist with proper naming
    // In a real implementation, you'd use fonttools or similar
    const ext = path.extname(fontPath);
    const name = path.basename(fontPath, ext);
    const outputPath = path.join(CONFIG.directories.dist, 'fonts', `${name}${ext}`);
    
    // Create fonts directory
    const fontsDir = path.dirname(outputPath);
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }
    
    // Copy font file
    fs.copyFileSync(fontPath, outputPath);
    
    this.fontStats.processed++;
    console.log(`✅ Font processed: ${path.basename(fontPath)}`);
  }
}

// ============================================
// ASSET MANIFEST GENERATION
// ============================================

class AssetManifestGenerator {
  constructor() {
    this.manifest = {
      images: {},
      fonts: {},
      generated: new Date().toISOString(),
    };
  }

  generateManifest(optimizedAssets) {
    console.log('📋 Generating asset manifest...');

    // Add optimized images to manifest
    for (const asset of optimizedAssets.images) {
      if (!this.manifest.images[asset.original]) {
        this.manifest.images[asset.original] = {
          formats: {},
          sizes: {},
        };
      }

      this.manifest.images[asset.original].formats[asset.format] = asset.path;
      
      if (asset.size) {
        this.manifest.images[asset.original].sizes[asset.size] = asset.path;
      }
    }

    // Add fonts to manifest
    for (const font of optimizedAssets.fonts) {
      this.manifest.fonts[font.name] = font.path;
    }

    // Write manifest file
    const manifestPath = path.join(CONFIG.directories.dist, 'asset-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(this.manifest, null, 2));
    
    console.log(`✅ Asset manifest generated: ${manifestPath}`);
  }
}

// ============================================
// MAIN OPTIMIZATION PROCESS
// ============================================

async function optimizeAssets() {
  console.log('🚀 Starting comprehensive asset optimization...');

  // Check if sharp is available
  try {
    require('sharp');
  } catch (error) {
    console.log('📦 Installing sharp for image optimization...');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
  }

  const imageOptimizer = new ImageOptimizer();
  const fontOptimizer = new FontOptimizer();
  const manifestGenerator = new AssetManifestGenerator();

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(CONFIG.directories.dist)) {
    fs.mkdirSync(CONFIG.directories.dist, { recursive: true });
  }

  // Find and optimize images
  console.log('📸 Finding and optimizing images...');
  const imageFiles = findImageFiles();
  
  for (const imagePath of imageFiles) {
    const outputDir = path.join(CONFIG.directories.dist, 'images');
    await imageOptimizer.optimizeImage(imagePath, outputDir);
  }

  // Optimize fonts
  await fontOptimizer.optimizeFonts();

  // Generate asset manifest
  const optimizedAssets = {
    images: [], // Would be populated with actual optimized assets
    fonts: [],  // Would be populated with actual font assets
  };
  
  manifestGenerator.generateManifest(optimizedAssets);

  // Print optimization statistics
  console.log('\n📊 Optimization Statistics:');
  console.log('========================');
  
  const imageStats = imageOptimizer.getStats();
  console.log(`Images: ${imageStats.processed}/${imageStats.total} processed`);
  console.log(`Size reduction: ${imageStats.sizeReductionFormatted}`);
  console.log(`Errors: ${imageStats.errors}`);
  
  const fontStats = fontOptimizer.fontStats;
  console.log(`Fonts: ${fontStats.processed}/${fontStats.total} processed`);
  console.log(`Font errors: ${fontStats.errors}`);

  console.log('\n✅ Asset optimization complete!');
}

function findImageFiles() {
  const imageFiles = [];
  const searchDirs = [CONFIG.directories.public, CONFIG.directories.src];
  
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      findFilesRecursively(dir, CONFIG.patterns.images, imageFiles);
    }
  }

  return imageFiles;
}

function findFilesRecursively(dir, pattern, files) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findFilesRecursively(fullPath, pattern, files);
    } else if (pattern.test(item)) {
      files.push(fullPath);
    }
  }
}

// ============================================
// EXECUTION
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeAssets().catch(console.error);
}

export { optimizeAssets, ImageOptimizer, FontOptimizer, AssetManifestGenerator };
