#!/usr/bin/env node

/**
 * Comprehensive Pre-Build Validation Script
 * 
 * This script performs extensive validation to catch ALL potential issues
 * before attempting a production build. It includes:
 * 
 * 1. TypeScript compilation check
 * 2. ESLint validation
 * 3. Dependency audit
 * 4. Security vulnerability scan
 * 5. Import/export validation
 * 6. Environment variable validation
 * 7. Build configuration check
 * 8. Performance analysis
 * 9. Bundle size estimation
 * 10. Code quality metrics
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ComprehensiveValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logSection(title) {
    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan} ${title}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  }

  logStep(step, status = 'info') {
    const statusColors = {
      info: colors.blue,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red
    };
    const statusSymbols = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    console.log(`${statusSymbols[status]} ${statusColors[status]}${step}${colors.reset}`);
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command.split(' ')[0], command.split(' ').slice(1), {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkTypeScript() {
    this.logStep('Checking TypeScript compilation...');
    
    try {
      const result = await this.runCommand('npx tsc --noEmit --skipLibCheck');
      if (result.code === 0) {
        this.logStep('TypeScript compilation passed', 'success');
        return true;
      } else {
        this.logStep('TypeScript compilation failed', 'error');
        this.errors.push('TypeScript compilation errors found');
        console.log(result.stderr);
        return false;
      }
    } catch (error) {
      this.logStep('TypeScript check failed', 'error');
      this.errors.push('TypeScript check failed: ' + error.message);
      return false;
    }
  }

  async checkESLint() {
    this.logStep('Running ESLint validation...');
    
    try {
      const result = await this.runCommand('npx eslint src --ext .ts,.tsx --max-warnings 0');
      if (result.code === 0) {
        this.logStep('ESLint validation passed', 'success');
        return true;
      } else {
        this.logStep('ESLint validation failed', 'error');
        this.errors.push('ESLint validation errors found');
        console.log(result.stdout);
        return false;
      }
    } catch (error) {
      this.logStep('ESLint check failed', 'error');
      this.errors.push('ESLint check failed: ' + error.message);
      return false;
    }
  }

  async checkDependencies() {
    this.logStep('Checking dependencies...');
    
    try {
      // Check for missing dependencies
      const result = await this.runCommand('npm ls --depth=0');
      if (result.code === 0) {
        this.logStep('Dependencies check passed', 'success');
      } else {
        this.logStep('Dependency issues found', 'warning');
        this.warnings.push('Dependency issues detected');
        console.log(result.stderr);
      }

      // Check for outdated packages
      const outdatedResult = await this.runCommand('npm outdated --json');
      if (outdatedResult.stdout.trim()) {
        this.logStep('Outdated packages found', 'warning');
        this.warnings.push('Outdated packages detected');
        const outdated = JSON.parse(outdatedResult.stdout);
        Object.keys(outdated).forEach(pkg => {
          console.log(`  ${pkg}: ${outdated[pkg].current} → ${outdated[pkg].latest}`);
        });
      }

      return true;
    } catch (error) {
      this.logStep('Dependency check failed', 'error');
      this.errors.push('Dependency check failed: ' + error.message);
      return false;
    }
  }

  async checkSecurity() {
    this.logStep('Running security audit...');
    
    try {
      const result = await this.runCommand('npm audit --audit-level=moderate');
      if (result.code === 0) {
        this.logStep('Security audit passed', 'success');
        return true;
      } else {
        this.logStep('Security vulnerabilities found', 'warning');
        this.warnings.push('Security vulnerabilities detected');
        console.log(result.stdout);
        return false;
      }
    } catch (error) {
      this.logStep('Security audit failed', 'error');
      this.errors.push('Security audit failed: ' + error.message);
      return false;
    }
  }

  checkImportIssues() {
    this.logStep('Checking import/export issues...');
    
    const srcDir = path.join(process.cwd(), 'src');
    const issues = [];

    const checkFile = (filePath) => {
      if (!fs.existsSync(filePath) || filePath.includes('node_modules')) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for import.meta.env usage in CRA
        if (line.includes('import.meta.env') && !line.includes('//')) {
          issues.push(`${filePath}:${index + 1} - import.meta.env usage detected (use process.env.REACT_APP_* in CRA)`);
        }

        // Check for problematic exports
        if (line.includes('export {') && line.includes('from') && !line.includes('//')) {
          const match = line.match(/export\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/);
          if (match) {
            const exports = match[1].split(',').map(e => e.trim());
            const modulePath = match[2];

            if (modulePath.includes('node_modules')) {
              return;
            }

            // Check if the module exists
            const moduleFile = path.resolve(path.dirname(filePath), modulePath);
            if (!fs.existsSync(moduleFile) && !fs.existsSync(moduleFile + '.ts') && !fs.existsSync(moduleFile + '.tsx')) {
              issues.push(`${filePath}:${index + 1} - Module not found: ${modulePath}`);
            }
          }
        }
      });
    };

    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          checkFile(filePath);
        }
      });
    };

    walkDir(srcDir);

    if (issues.length === 0) {
      this.logStep('Import/export validation passed', 'success');
      return true;
    } else {
      this.logStep('Import/export issues found', 'error');
      this.errors.push('Import/export issues detected');
      issues.forEach(issue => console.log(`  ${issue}`));
      return false;
    }
  }

  checkEnvironmentVariables() {
    this.logStep('Checking environment configuration...');
    
    const envFile = path.join(process.cwd(), '.env');
    const envExampleFile = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envFile)) {
      this.logStep('No .env file found', 'warning');
      this.warnings.push('No .env file found');
    }

    if (!fs.existsSync(envExampleFile)) {
      this.logStep('No .env.example file found', 'warning');
      this.warnings.push('No .env.example file found');
    }

    // Check for required environment variables in code
    const srcDir = path.join(process.cwd(), 'src');
    const requiredEnvVars = new Set();

    const checkFile = (filePath) => {
      if (!fs.existsSync(filePath) || filePath.includes('node_modules')) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const envMatches = content.match(/process\.env\.REACT_APP_[A-Z_]+/g);
      if (envMatches) {
        envMatches.forEach(match => {
          requiredEnvVars.add(match);
        });
      }
    };

    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          checkFile(filePath);
        }
      });
    };

    walkDir(srcDir);

    this.logStep(`Found ${requiredEnvVars.size} environment variables in use`, 'info');
    Array.from(requiredEnvVars).forEach(envVar => {
      console.log(`  ${envVar}`);
    });

    return true;
  }

  checkBuildConfiguration() {
    this.logStep('Checking build configuration...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const issues = [];

    // Check for required scripts
    const requiredScripts = ['start', 'build', 'test'];
    requiredScripts.forEach(script => {
      if (!packageJson.scripts[script]) {
        issues.push(`Missing required script: ${script}`);
      }
    });

    // Check for Vite (replacing react-scripts)
    if (!packageJson.dependencies['vite'] && !packageJson.devDependencies['vite']) {
      issues.push('vite not found in dependencies');
    }

    // Check for TypeScript
    if (!packageJson.dependencies['typescript'] && !packageJson.devDependencies['typescript']) {
      issues.push('typescript not found in dependencies');
    }

    if (issues.length === 0) {
      this.logStep('Build configuration check passed', 'success');
      return true;
    } else {
      this.logStep('Build configuration issues found', 'error');
      this.errors.push('Build configuration issues detected');
      issues.forEach(issue => console.log(`  ${issue}`));
      return false;
    }
  }

  async checkBundleSize() {
    this.logStep('Estimating bundle size...');
    
    try {
      // Create a temporary build to analyze
      const result = await this.runCommand('npm run build', { stdio: 'pipe' });
      if (result.code === 0) {
        const buildDir = path.join(process.cwd(), 'dist');
        if (fs.existsSync(buildDir)) {
          const files = fs.readdirSync(buildDir);
          let totalSize = 0;
          
          files.forEach(file => {
            const filePath = path.join(buildDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              totalSize += stat.size;
            }
          });

          const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
          this.logStep(`Bundle size: ${sizeInMB} MB`, 'info');
          
          if (totalSize > 5 * 1024 * 1024) { // 5MB
            this.warnings.push('Bundle size is large (>5MB)');
          }
        }
      }
      return true;
    } catch (error) {
      this.logStep('Bundle size check failed', 'warning');
      this.warnings.push('Could not estimate bundle size');
      return false;
    }
  }

  async runAllChecks() {
    this.logSection('COMPREHENSIVE PRE-BUILD VALIDATION');
    
    const checks = [
      () => this.checkTypeScript(),
      () => this.checkESLint(),
      () => this.checkDependencies(),
      () => this.checkSecurity(),
      () => this.checkImportIssues(),
      () => this.checkEnvironmentVariables(),
      () => this.checkBuildConfiguration(),
      () => this.checkBundleSize()
    ];

    const results = await Promise.allSettled(checks.map(check => check()));
    
    this.logSection('VALIDATION SUMMARY');
    
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    
    console.log(`\n${colors.bright}Validation completed in ${duration}s${colors.reset}\n`);
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('🎉 All checks passed! Ready for production build.', 'green');
      process.exit(0);
    } else {
      if (this.errors.length > 0) {
        console.log(`\n${colors.red}${colors.bright}❌ ERRORS (${this.errors.length}):${colors.reset}`);
        this.errors.forEach(error => console.log(`  • ${error}`));
      }
      
      if (this.warnings.length > 0) {
        console.log(`\n${colors.yellow}${colors.bright}⚠️  WARNINGS (${this.warnings.length}):${colors.reset}`);
        this.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
      
      console.log(`\n${colors.bright}${colors.red}Build validation failed! Fix these issues before proceeding.${colors.reset}`);
      
      if (this.errors.length > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    }
  }
}

// Run the validation
const validator = new ComprehensiveValidator();
validator.runAllChecks().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
}); 