#!/usr/bin/env node

/**
 * Bundle Analysis Script for Coach Core AI
 * Analyzes bundle size and provides optimization recommendations
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BundleAnalyzer {
  constructor() {
    this.projectRoot = path.dirname(__dirname);
    this.distPath = path.join(this.projectRoot, 'dist');
    this.reportsPath = path.join(this.projectRoot, 'reports');
    this.baselinePath = path.join(this.reportsPath, 'bundle-baseline.json');
  }

  /**
   * Run bundle analysis
   */
  async analyze() {
    console.log('🚀 Starting bundle analysis...\n');

    try {
      // Ensure reports directory exists
      if (!fs.existsSync(this.reportsPath)) {
        fs.mkdirSync(this.reportsPath, { recursive: true });
      }

      // Build the project
      console.log('📦 Building project...');
      execSync('npm run build', { stdio: 'inherit' });

      // Analyze bundle
      const bundleStats = this.analyzeBundle();
      const recommendations = this.generateRecommendations(bundleStats);
      
      // Save analysis
      this.saveAnalysis(bundleStats, recommendations);
      
      // Compare with baseline
      const comparison = this.compareWithBaseline(bundleStats);
      
      // Display results
      this.displayResults(bundleStats, recommendations, comparison);
      
      console.log('\n✅ Bundle analysis complete!');
      
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Analyze the built bundle
   */
  analyzeBundle() {
    console.log('🔍 Analyzing bundle...');
    
    const stats = {
      timestamp: new Date().toISOString(),
      totalSize: 0,
      gzipSize: 0,
      brotliSize: 0,
      chunks: [],
      assets: [],
      dependencies: [],
      analysis: {}
    };

    // Read dist directory
    if (!fs.existsSync(this.distPath)) {
      throw new Error('Dist directory not found. Run build first.');
    }

    // Analyze JavaScript files
    const jsFiles = this.findFiles(this.distPath, '.js');
    stats.chunks = jsFiles.map(file => {
      const size = fs.statSync(file).size;
      const relativePath = path.relative(this.distPath, file);
      
      stats.totalSize += size;
      
      return {
        name: relativePath,
        size: size,
        sizeKB: (size / 1024).toFixed(2),
        sizeMB: (size / (1024 * 1024)).toFixed(3)
      };
    });

    // Analyze CSS files
    const cssFiles = this.findFiles(this.distPath, '.css');
    stats.assets = cssFiles.map(file => {
      const size = fs.statSync(file).size;
      const relativePath = path.relative(this.distPath, file);
      
      stats.totalSize += size;
      
      return {
        name: relativePath,
        size: size,
        sizeKB: (size / 1024).toFixed(2),
        sizeMB: (size / (1024 * 1024)).toFixed(3)
      };
    });

    // Calculate sizes
    stats.totalSizeKB = (stats.totalSize / 1024).toFixed(2);
    stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(3);
    
    // Estimate gzip and brotli sizes
    stats.gzipSize = Math.round(stats.totalSize * 0.3);
    stats.brotliSize = Math.round(stats.totalSize * 0.2);
    stats.gzipSizeKB = (stats.gzipSize / 1024).toFixed(2);
    stats.brotliSizeKB = (stats.brotliSize / 1024).toFixed(2);

    // Analyze chunk distribution
    stats.analysis = this.analyzeChunkDistribution(stats.chunks);

    return stats;
  }

  /**
   * Find files by extension
   */
  findFiles(dir, ext) {
    const files = [];
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (item.endsWith(ext)) {
          files.push(fullPath);
        }
      });
    }
    
    traverse(dir);
    return files;
  }

  /**
   * Analyze chunk distribution
   */
  analyzeChunkDistribution(chunks) {
    const analysis = {
      totalChunks: chunks.length,
      largestChunk: null,
      smallestChunk: null,
      averageChunkSize: 0,
      chunkSizeDistribution: {
        small: 0,    // < 100KB
        medium: 0,   // 100KB - 500KB
        large: 0,    // 500KB - 1MB
        xlarge: 0    // > 1MB
      }
    };

    if (chunks.length === 0) return analysis;

    // Find largest and smallest chunks
    chunks.sort((a, b) => a.size - b.size);
    analysis.smallestChunk = chunks[0];
    analysis.largestChunk = chunks[chunks[chunks.length - 1]];

    // Calculate average
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    analysis.averageChunkSize = totalSize / chunks.length;

    // Categorize chunks by size
    chunks.forEach(chunk => {
      const sizeKB = chunk.size / 1024;
      if (sizeKB < 100) analysis.chunkSizeDistribution.small++;
      else if (sizeKB < 500) analysis.chunkSizeDistribution.medium++;
      else if (sizeKB < 1024) analysis.chunkSizeDistribution.large++;
      else analysis.chunkSizeDistribution.xlarge++;
    });

    return analysis;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];
    const warnings = [];

    // Bundle size recommendations
    if (stats.totalSizeMB > 2) {
      recommendations.push({
        type: 'warning',
        category: 'Bundle Size',
        message: 'Bundle size is large (>2MB). Consider code splitting and tree shaking.',
        priority: 'high'
      });
    } else if (stats.totalSizeMB > 1) {
      recommendations.push({
        type: 'info',
        category: 'Bundle Size',
        message: 'Bundle size is moderate. Consider lazy loading for better performance.',
        priority: 'medium'
      });
    }

    // Chunk size recommendations
    if (stats.analysis.chunkSizeDistribution.xlarge > 0) {
      recommendations.push({
        type: 'warning',
        category: 'Chunk Size',
        message: 'Large chunks detected. Consider splitting large components or libraries.',
        priority: 'high'
      });
    }

    if (stats.analysis.chunkSizeDistribution.large > 2) {
      recommendations.push({
        type: 'info',
        category: 'Chunk Size',
        message: 'Multiple large chunks detected. Review code splitting strategy.',
        priority: 'medium'
      });
    }

    // Chunk count recommendations
    if (stats.analysis.totalChunks > 10) {
      recommendations.push({
        type: 'info',
        category: 'Chunk Count',
        message: 'High chunk count. Consider consolidating small chunks.',
        priority: 'low'
      });
    }

    // Performance recommendations
    if (stats.gzipSizeKB > 500) {
      recommendations.push({
        type: 'warning',
        category: 'Performance',
        message: 'Gzipped size is large. Focus on reducing bundle size.',
        priority: 'high'
      });
    }

    // Best practices
    recommendations.push({
      type: 'success',
      category: 'Best Practices',
      message: 'Use React.lazy() for route-based code splitting.',
      priority: 'medium'
    });

    recommendations.push({
      type: 'success',
      category: 'Best Practices',
      message: 'Implement tree shaking to remove unused code.',
      priority: 'medium'
    });

    return recommendations;
  }

  /**
   * Compare with baseline
   */
  compareWithBaseline(currentStats) {
    if (!fs.existsSync(this.baselinePath)) {
      console.log('📊 No baseline found. Creating new baseline...');
      this.saveBaseline(currentStats);
      return null;
    }

    try {
      const baseline = JSON.parse(fs.readFileSync(this.baselinePath, 'utf8'));
      
      const comparison = {
        totalSize: {
          current: currentStats.totalSize,
          baseline: baseline.totalSize,
          change: currentStats.totalSize - baseline.totalSize,
          changePercent: ((currentStats.totalSize - baseline.totalSize) / baseline.totalSize * 100).toFixed(2)
        },
        chunkCount: {
          current: currentStats.analysis.totalChunks,
          baseline: baseline.analysis.totalChunks,
          change: currentStats.analysis.totalChunks - baseline.analysis.totalChunks
        }
      };

      return comparison;
    } catch (error) {
      console.warn('⚠️ Could not read baseline:', error.message);
      return null;
    }
  }

  /**
   * Save baseline
   */
  saveBaseline(stats) {
    const baseline = {
      ...stats,
      isBaseline: true,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(this.baselinePath, JSON.stringify(baseline, null, 2));
    console.log('📊 Baseline saved.');
  }

  /**
   * Save analysis results
   */
  saveAnalysis(stats, recommendations) {
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      recommendations,
      summary: {
        totalSize: stats.totalSizeMB + 'MB',
        chunkCount: stats.analysis.totalChunks,
        gzipSize: stats.gzipSizeKB + 'KB',
        brotliSize: stats.brotliSizeKB + 'KB'
      }
    };

    const reportPath = path.join(this.reportsPath, `bundle-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Analysis report saved: ${path.relative(this.projectRoot, reportPath)}`);
  }

  /**
   * Display results
   */
  displayResults(stats, recommendations, comparison) {
    console.log('\n📊 Bundle Analysis Results');
    console.log('=' .repeat(50));
    
    // Summary
    console.log(`\n📦 Bundle Summary:`);
    console.log(`   Total Size: ${stats.totalSizeMB} MB (${stats.totalSizeKB} KB)`);
    console.log(`   Gzipped: ~${stats.gzipSizeKB} KB`);
    console.log(`   Brotli: ~${stats.brotliSizeKB} KB`);
    console.log(`   Chunks: ${stats.analysis.totalChunks}`);
    
    // Chunk analysis
    console.log(`\n🔍 Chunk Analysis:`);
    const largest = stats.analysis.largestChunk;
    const smallest = stats.analysis.smallestChunk;
    if (largest && smallest) {
      console.log(`   Largest: ${largest.name} (${largest.sizeMB} MB)`);
      console.log(`   Smallest: ${smallest.name} (${smallest.sizeKB} KB)`);
      console.log(`   Average: ${(stats.analysis.averageChunkSize / 1024).toFixed(2)} KB`);
    } else {
      console.log('   No chunk size details available.');
    }
    
    // Size distribution
    const dist = stats.analysis.chunkSizeDistribution;
    console.log(`\n📏 Size Distribution:`);
    console.log(`   Small (<100KB): ${dist.small}`);
    console.log(`   Medium (100-500KB): ${dist.medium}`);
    console.log(`   Large (500KB-1MB): ${dist.large}`);
    console.log(`   XLarge (>1MB): ${dist.xlarge}`);
    
    // Comparison with baseline
    if (comparison) {
      console.log(`\n📈 Comparison with Baseline:`);
      const sizeChange = comparison.totalSize.changePercent;
      const sizeTrend = sizeChange > 0 ? '📈' : sizeChange < 0 ? '📉' : '➡️';
      console.log(`   Size Change: ${sizeTrend} ${sizeChange}%`);
      console.log(`   Chunk Count Change: ${comparison.chunkCount.change > 0 ? '+' : ''}${comparison.chunkCount.change}`);
    }
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    recommendations.forEach((rec, index) => {
      const icon = rec.type === 'warning' ? '⚠️' : rec.type === 'info' ? 'ℹ️' : '✅';
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`   ${index + 1}. ${icon} ${priority} ${rec.message}`);
    });
    
    // Performance score
    const score = this.calculatePerformanceScore(stats, recommendations);
    console.log(`\n🎯 Performance Score: ${score}/100`);
    
    if (score >= 80) console.log('   🎉 Excellent! Your bundle is well optimized.');
    else if (score >= 60) console.log('   👍 Good! Some optimizations could help.');
    else if (score >= 40) console.log('   ⚠️ Fair! Consider implementing recommendations.');
    else console.log('   🚨 Poor! Immediate optimization needed.');
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(stats, recommendations) {
    let score = 100;
    
    // Deduct for large bundle size
    if (stats.totalSizeMB > 2) score -= 30;
    else if (stats.totalSizeMB > 1) score -= 15;
    
    // Deduct for large chunks
    if (stats.analysis.chunkSizeDistribution.xlarge > 0) score -= 20;
    if (stats.analysis.chunkSizeDistribution.large > 2) score -= 10;
    
    // Deduct for warnings
    const warnings = recommendations.filter(r => r.type === 'warning');
    score -= warnings.length * 5;
    
    return Math.max(0, Math.round(score));
  }
}

// Run analysis if called directly
const analyzer = new BundleAnalyzer();
analyzer.analyze().catch(console.error);
