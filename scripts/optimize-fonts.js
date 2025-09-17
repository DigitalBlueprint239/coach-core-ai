#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔤 Starting Font Optimization...');

// ============================================
// FONT OPTIMIZATION CONFIGURATION
// ============================================

const CONFIG = {
  // Font optimization settings
  fonts: {
    // Subset characters to include
    subset: {
      latin: true,
      latinExtended: true,
      cyrillic: false,
      greek: false,
      vietnamese: false,
      // Common characters for sports apps
      common: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?;:"\'()[]{}/-_=+@#$%^&*|\\~`',
      sports: 'Team Practice Game Score Win Loss Draw Play Coach Player Field Court Gym Stadium Arena League Division Championship Tournament Season Schedule',
    },
    // Font formats to generate
    formats: ['woff2', 'woff'],
    // Preload critical fonts
    preload: true,
    // Font display strategy
    display: 'swap',
  },
  // Directories
  directories: {
    public: './public',
    src: './src',
    dist: './dist',
    fonts: './dist/fonts',
  },
  // File patterns
  patterns: {
    fonts: /\.(woff2?|ttf|otf|eot)$/i,
  },
};

// ============================================
// FONT OPTIMIZER CLASS
// ============================================

class FontOptimizer {
  constructor() {
    this.processedFonts = new Set();
    this.optimizationStats = {
      total: 0,
      processed: 0,
      skipped: 0,
      errors: 0,
      sizeReduction: 0,
    };
    this.fontManifest = {
      fonts: {},
      preload: [],
      generated: new Date().toISOString(),
    };
  }

  async optimizeFonts() {
    console.log('🔤 Finding and optimizing fonts...');

    // Find all font files
    const fontFiles = this.findFontFiles();
    
    if (fontFiles.length === 0) {
      console.log('ℹ️  No font files found to optimize');
      return;
    }

    // Create fonts directory
    if (!fs.existsSync(CONFIG.directories.fonts)) {
      fs.mkdirSync(CONFIG.directories.fonts, { recursive: true });
    }

    // Process each font file
    for (const fontPath of fontFiles) {
      try {
        await this.optimizeFont(fontPath);
      } catch (error) {
        console.error(`❌ Error optimizing font ${fontPath}:`, error.message);
        this.optimizationStats.errors++;
      }
    }

    // Generate font manifest
    this.generateFontManifest();

    // Print statistics
    this.printStats();
  }

  findFontFiles() {
    const fontFiles = [];
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
    const stats = fs.statSync(fontPath);
    const originalSize = stats.size;
    
    const ext = path.extname(fontPath).toLowerCase();
    const name = path.basename(fontPath, ext);
    const relativePath = path.relative(process.cwd(), fontPath);
    
    console.log(`🔤 Processing: ${relativePath}`);

    // Skip if already processed
    if (this.processedFonts.has(fontPath)) {
      this.optimizationStats.skipped++;
      return;
    }

    this.processedFonts.add(fontPath);
    this.optimizationStats.total++;

    // Generate optimized formats
    const optimizedFormats = await this.generateFontFormats(fontPath, name);
    
    // Calculate size reduction
    const totalOptimizedSize = optimizedFormats.reduce((sum, format) => sum + format.size, 0);
    const sizeReduction = originalSize - totalOptimizedSize;
    this.optimizationStats.sizeReduction += sizeReduction;
    this.optimizationStats.processed++;

    // Add to manifest
    this.fontManifest.fonts[name] = {
      original: relativePath,
      formats: optimizedFormats.reduce((acc, format) => {
        acc[format.format] = {
          path: format.path,
          size: format.size,
          sizeFormatted: this.formatBytes(format.size),
        };
        return acc;
      }, {}),
      preload: CONFIG.fonts.preload,
      display: CONFIG.fonts.display,
    };

    // Add to preload list if enabled
    if (CONFIG.fonts.preload) {
      const woff2Format = optimizedFormats.find(f => f.format === 'woff2');
      if (woff2Format) {
        this.fontManifest.preload.push({
          name: name,
          path: woff2Format.path,
          format: 'woff2',
        });
      }
    }

    console.log(`✅ Optimized: ${relativePath} (${this.formatBytes(sizeReduction)} saved)`);
  }

  async generateFontFormats(fontPath, name) {
    const formats = [];
    
    // Generate WOFF2 format (best compression)
    const woff2Path = path.join(CONFIG.directories.fonts, `${name}.woff2`);
    await this.convertToWoff2(fontPath, woff2Path);
    const woff2Stats = fs.statSync(woff2Path);
    formats.push({
      format: 'woff2',
      path: `/fonts/${name}.woff2`,
      size: woff2Stats.size,
    });

    // Generate WOFF format (fallback)
    const woffPath = path.join(CONFIG.directories.fonts, `${name}.woff`);
    await this.convertToWoff(fontPath, woffPath);
    const woffStats = fs.statSync(woffPath);
    formats.push({
      format: 'woff',
      path: `/fonts/${name}.woff`,
      size: woffStats.size,
    });

    return formats;
  }

  async convertToWoff2(inputPath, outputPath) {
    try {
      // Use fonttools for conversion (if available)
      execSync(`pyftsubset "${inputPath}" --output-file="${outputPath}" --flavor=woff2`, {
        stdio: 'pipe',
      });
    } catch (error) {
      // Fallback: copy original file
      fs.copyFileSync(inputPath, outputPath);
    }
  }

  async convertToWoff(inputPath, outputPath) {
    try {
      // Use fonttools for conversion (if available)
      execSync(`pyftsubset "${inputPath}" --output-file="${outputPath}" --flavor=woff`, {
        stdio: 'pipe',
      });
    } catch (error) {
      // Fallback: copy original file
      fs.copyFileSync(inputPath, outputPath);
    }
  }

  generateFontManifest() {
    const manifestPath = path.join(CONFIG.directories.dist, 'font-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(this.fontManifest, null, 2));
    console.log(`✅ Font manifest generated: ${manifestPath}`);
  }

  generateCSS() {
    const cssPath = path.join(CONFIG.directories.dist, 'fonts.css');
    let css = '/* Optimized Fonts */\n\n';

    for (const [name, font] of Object.entries(this.fontManifest.fonts)) {
      css += `@font-face {\n`;
      css += `  font-family: '${name}';\n`;
      css += `  font-display: ${font.display};\n`;
      css += `  src: `;
      
      const srcParts = [];
      if (font.formats.woff2) {
        srcParts.push(`url('${font.formats.woff2.path}') format('woff2')`);
      }
      if (font.formats.woff) {
        srcParts.push(`url('${font.formats.woff.path}') format('woff')`);
      }
      
      css += srcParts.join(', ');
      css += `;\n`;
      css += `}\n\n`;
    }

    fs.writeFileSync(cssPath, css);
    console.log(`✅ Font CSS generated: ${cssPath}`);
  }

  generatePreloadHTML() {
    const htmlPath = path.join(CONFIG.directories.dist, 'font-preload.html');
    let html = '<!-- Font Preload Links -->\n';

    for (const preload of this.fontManifest.preload) {
      html += `<link rel="preload" href="${preload.path}" as="font" type="font/${preload.format}" crossorigin>\n`;
    }

    fs.writeFileSync(htmlPath, html);
    console.log(`✅ Font preload HTML generated: ${htmlPath}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printStats() {
    console.log('\n📊 Font Optimization Statistics:');
    console.log('================================');
    console.log(`Total fonts: ${this.optimizationStats.total}`);
    console.log(`Processed: ${this.optimizationStats.processed}`);
    console.log(`Skipped: ${this.optimizationStats.skipped}`);
    console.log(`Errors: ${this.optimizationStats.errors}`);
    console.log(`Size reduction: ${this.formatBytes(this.optimizationStats.sizeReduction)}`);
    console.log(`Preload fonts: ${this.fontManifest.preload.length}`);
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function optimizeFonts() {
  console.log('🔤 Starting font optimization...');

  // Check if fonttools is available
  try {
    execSync('pyftsubset --version', { stdio: 'pipe' });
    console.log('✅ Fonttools found');
  } catch (error) {
    console.log('⚠️  Fonttools not found - using fallback conversion');
    console.log('   Install with: pip install fonttools[woff]');
  }

  const optimizer = new FontOptimizer();
  await optimizer.optimizeFonts();
  optimizer.generateCSS();
  optimizer.generatePreloadHTML();

  console.log('\n✅ Font optimization complete!');
}

// ============================================
// EXECUTION
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeFonts().catch(console.error);
}

export { optimizeFonts, FontOptimizer };
