#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { optimizeAssets } from './optimize-assets.js';
import { optimizeFonts } from './optimize-fonts.js';

console.log('🚀 Starting Comprehensive Asset Optimization...');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Asset optimization settings
  assets: {
    // Image optimization
    images: {
      webp: { quality: 85, effort: 6 },
      avif: { quality: 80, effort: 4 },
      jpeg: { quality: 90, progressive: true },
      png: { quality: 90, compressionLevel: 9 },
      svg: { optimizationLevel: 7 },
      sizes: [
        { width: 320, suffix: '-sm' },
        { width: 640, suffix: '-md' },
        { width: 1024, suffix: '-lg' },
        { width: 1920, suffix: '-xl' },
      ],
    },
    // Font optimization
    fonts: {
      subset: true,
      preload: true,
      formats: ['woff2', 'woff'],
      display: 'swap',
    },
    // Compression settings
    compression: {
      gzip: true,
      brotli: true,
      level: 6,
    },
  },
  // Directories
  directories: {
    public: './public',
    src: './src',
    dist: './dist',
    images: './dist/images',
    fonts: './dist/fonts',
  },
  // File patterns
  patterns: {
    images: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
    fonts: /\.(woff2?|ttf|otf|eot)$/i,
    assets: /\.(css|js|html|json|xml|txt)$/i,
  },
};

// ============================================
// COMPRESSION UTILITIES
// ============================================

class CompressionOptimizer {
  constructor() {
    this.compressionStats = {
      total: 0,
      processed: 0,
      errors: 0,
      sizeReduction: 0,
    };
  }

  async compressAssets() {
    console.log('🗜️  Compressing assets...');

    // Find all compressible assets
    const assets = this.findAssets();
    
    for (const asset of assets) {
      try {
        await this.compressAsset(asset);
      } catch (error) {
        console.error(`❌ Error compressing ${asset}:`, error.message);
        this.compressionStats.errors++;
      }
    }

    console.log(`✅ Compression complete: ${this.compressionStats.processed}/${this.compressionStats.total} assets processed`);
  }

  findAssets() {
    const assets = [];
    const searchDirs = [CONFIG.directories.dist];
    
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        this.findFilesRecursively(dir, CONFIG.patterns.assets, assets);
      }
    }

    return assets;
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

  async compressAsset(assetPath) {
    const stats = fs.statSync(assetPath);
    const originalSize = stats.size;
    
    this.compressionStats.total++;

    // Skip if already compressed
    if (assetPath.endsWith('.gz') || assetPath.endsWith('.br')) {
      this.compressionStats.skipped++;
      return;
    }

    // Compress with gzip
    if (CONFIG.assets.compression.gzip) {
      await this.compressGzip(assetPath);
    }

    // Compress with brotli
    if (CONFIG.assets.compression.brotli) {
      await this.compressBrotli(assetPath);
    }

    this.compressionStats.processed++;
  }

  async compressGzip(filePath) {
    try {
      const gzPath = `${filePath}.gz`;
      execSync(`gzip -c -${CONFIG.assets.compression.level} "${filePath}" > "${gzPath}"`, {
        stdio: 'pipe',
      });
    } catch (error) {
      console.warn(`⚠️  Gzip compression failed for ${filePath}:`, error.message);
    }
  }

  async compressBrotli(filePath) {
    try {
      const brPath = `${filePath}.br`;
      execSync(`brotli -c -${CONFIG.assets.compression.level} "${filePath}" > "${brPath}"`, {
        stdio: 'pipe',
      });
    } catch (error) {
      console.warn(`⚠️  Brotli compression failed for ${filePath}:`, error.message);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// ============================================
// ASSET MANIFEST GENERATOR
// ============================================

class AssetManifestGenerator {
  constructor() {
    this.manifest = {
      images: {},
      fonts: {},
      assets: {},
      compression: {
        gzip: CONFIG.assets.compression.gzip,
        brotli: CONFIG.assets.compression.brotli,
      },
      generated: new Date().toISOString(),
    };
  }

  generateManifest() {
    console.log('📋 Generating comprehensive asset manifest...');

    // Scan dist directory for all assets
    this.scanDirectory(CONFIG.directories.dist);

    // Write manifest file
    const manifestPath = path.join(CONFIG.directories.dist, 'asset-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(this.manifest, null, 2));
    
    console.log(`✅ Asset manifest generated: ${manifestPath}`);
  }

  scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.scanDirectory(fullPath);
      } else {
        this.addAsset(fullPath);
      }
    }
  }

  addAsset(assetPath) {
    const relativePath = path.relative(CONFIG.directories.dist, assetPath);
    const ext = path.extname(assetPath).toLowerCase();
    const name = path.basename(assetPath, ext);
    const dir = path.dirname(relativePath);

    // Categorize asset
    if (CONFIG.patterns.images.test(assetPath)) {
      if (!this.manifest.images[dir]) {
        this.manifest.images[dir] = {};
      }
      this.manifest.images[dir][name] = {
        path: `/${relativePath}`,
        size: fs.statSync(assetPath).size,
        format: ext.slice(1),
      };
    } else if (CONFIG.patterns.fonts.test(assetPath)) {
      if (!this.manifest.fonts[dir]) {
        this.manifest.fonts[dir] = {};
      }
      this.manifest.fonts[dir][name] = {
        path: `/${relativePath}`,
        size: fs.statSync(assetPath).size,
        format: ext.slice(1),
      };
    } else {
      if (!this.manifest.assets[dir]) {
        this.manifest.assets[dir] = {};
      }
      this.manifest.assets[dir][name] = {
        path: `/${relativePath}`,
        size: fs.statSync(assetPath).size,
        format: ext.slice(1),
      };
    }
  }
}

// ============================================
// PERFORMANCE ANALYZER
// ============================================

class PerformanceAnalyzer {
  constructor() {
    this.analysis = {
      totalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      recommendations: [],
    };
  }

  analyzeAssets() {
    console.log('📊 Analyzing asset performance...');

    const distDir = CONFIG.directories.dist;
    if (!fs.existsSync(distDir)) {
      console.log('⚠️  Dist directory not found - run build first');
      return;
    }

    this.calculateSizes(distDir);
    this.generateRecommendations();
    this.printAnalysis();
  }

  calculateSizes(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.calculateSizes(fullPath);
      } else {
        this.analysis.totalSize += stat.size;
        
        // Check for compressed versions
        const gzPath = `${fullPath}.gz`;
        const brPath = `${fullPath}.br`;
        
        if (fs.existsSync(gzPath)) {
          const gzSize = fs.statSync(gzPath).size;
          this.analysis.compressedSize += gzSize;
        } else if (fs.existsSync(brPath)) {
          const brSize = fs.statSync(brPath).size;
          this.analysis.compressedSize += brSize;
        } else {
          this.analysis.compressedSize += stat.size;
        }
      }
    }
  }

  generateRecommendations() {
    const recommendations = [];

    // Calculate compression ratio
    this.analysis.compressionRatio = this.analysis.compressedSize / this.analysis.totalSize;

    // Generate recommendations based on analysis
    if (this.analysis.compressionRatio > 0.7) {
      recommendations.push('Consider enabling more aggressive compression');
    }

    if (this.analysis.totalSize > 10 * 1024 * 1024) { // 10MB
      recommendations.push('Total asset size is large - consider lazy loading');
    }

    if (this.analysis.totalSize > 5 * 1024 * 1024) { // 5MB
      recommendations.push('Consider implementing asset bundling');
    }

    this.analysis.recommendations = recommendations;
  }

  printAnalysis() {
    console.log('\n📊 Asset Performance Analysis:');
    console.log('==============================');
    console.log(`Total size: ${this.formatBytes(this.analysis.totalSize)}`);
    console.log(`Compressed size: ${this.formatBytes(this.analysis.compressedSize)}`);
    console.log(`Compression ratio: ${(this.analysis.compressionRatio * 100).toFixed(1)}%`);
    console.log(`Size reduction: ${this.formatBytes(this.analysis.totalSize - this.analysis.compressedSize)}`);
    
    if (this.analysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.analysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// ============================================
// MAIN OPTIMIZATION PROCESS
// ============================================

async function optimizeAllAssets() {
  console.log('🚀 Starting comprehensive asset optimization...');

  // Check dependencies
  await checkDependencies();

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(CONFIG.directories.dist)) {
    fs.mkdirSync(CONFIG.directories.dist, { recursive: true });
  }

  // Step 1: Optimize images
  console.log('\n📸 Step 1: Optimizing images...');
  await optimizeAssets();

  // Step 2: Optimize fonts
  console.log('\n🔤 Step 2: Optimizing fonts...');
  await optimizeFonts();

  // Step 3: Compress assets
  console.log('\n🗜️  Step 3: Compressing assets...');
  const compressionOptimizer = new CompressionOptimizer();
  await compressionOptimizer.compressAssets();

  // Step 4: Generate manifest
  console.log('\n📋 Step 4: Generating asset manifest...');
  const manifestGenerator = new AssetManifestGenerator();
  manifestGenerator.generateManifest();

  // Step 5: Analyze performance
  console.log('\n📊 Step 5: Analyzing performance...');
  const performanceAnalyzer = new PerformanceAnalyzer();
  performanceAnalyzer.analyzeAssets();

  console.log('\n✅ Comprehensive asset optimization complete!');
}

async function checkDependencies() {
  console.log('🔍 Checking dependencies...');

  const dependencies = [
    { name: 'sharp', command: 'npm list sharp' },
    { name: 'gzip', command: 'gzip --version' },
    { name: 'brotli', command: 'brotli --version' },
  ];

  for (const dep of dependencies) {
    try {
      execSync(dep.command, { stdio: 'pipe' });
      console.log(`✅ ${dep.name} found`);
    } catch (error) {
      console.log(`⚠️  ${dep.name} not found - installing...`);
      if (dep.name === 'sharp') {
        execSync('npm install sharp --save-dev', { stdio: 'inherit' });
      } else if (dep.name === 'gzip') {
        console.log('   Install gzip: brew install gzip (macOS) or apt-get install gzip (Linux)');
      } else if (dep.name === 'brotli') {
        console.log('   Install brotli: brew install brotli (macOS) or apt-get install brotli (Linux)');
      }
    }
  }
}

// ============================================
// EXECUTION
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeAllAssets().catch(console.error);
}

export { optimizeAllAssets, CompressionOptimizer, AssetManifestGenerator, PerformanceAnalyzer };
