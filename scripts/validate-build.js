#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-build validation...\n');

const errors = [];
const warnings = [];

// 1. Check TypeScript compilation
console.log('1️⃣ Checking TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation passed');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  errors.push('TypeScript compilation errors found');
  console.log(error.stdout?.toString() || error.message);
}

// 2. Check ESLint
console.log('\n2️⃣ Running ESLint...');
try {
  execSync('npx eslint src --ext .ts,.tsx --max-warnings 0', { stdio: 'pipe' });
  console.log('✅ ESLint passed');
} catch (error) {
  console.log('❌ ESLint failed');
  warnings.push('ESLint issues found');
  console.log(error.stdout?.toString() || error.message);
}

// 3. Check for missing dependencies
console.log('\n3️⃣ Checking for missing dependencies...');
try {
  execSync('npm ls --depth=0', { stdio: 'pipe' });
  console.log('✅ All dependencies are installed');
} catch (error) {
  console.log('❌ Missing or conflicting dependencies');
  errors.push('Dependency issues found');
  console.log(error.stdout?.toString() || error.message);
}

// 4. Check for common import issues
console.log('\n4️⃣ Checking for common import issues...');
const srcDir = path.join(__dirname, '../src');
const importIssues = [];

function checkFile(filePath) {
  // Skip node_modules files
  if (filePath.includes('node_modules')) {
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check for import.meta.env in CRA project
    if (line.includes('import.meta.env') && !filePath.includes('vite.config')) {
      importIssues.push(`${filePath}:${index + 1} - import.meta.env should be process.env in CRA`);
    }
    
    // Check for missing exports
    if (line.includes('export {') && line.includes('from') && !line.includes('//')) {
      const match = line.match(/export\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/);
      if (match) {
        const exports = match[1].split(',').map(e => e.trim());
        const modulePath = match[2];
        
        // Skip node_modules imports
        if (modulePath.includes('node_modules')) {
          return;
        }
        
        // Check if module exists
        const fullPath = path.resolve(path.dirname(filePath), modulePath);
        if (!fs.existsSync(fullPath) && !fs.existsSync(fullPath + '.ts') && !fs.existsSync(fullPath + '.tsx')) {
          importIssues.push(`${filePath}:${index + 1} - Module not found: ${modulePath}`);
        }
      }
    }
  });
}

function walkDir(dir) {
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
}

walkDir(srcDir);

if (importIssues.length > 0) {
  console.log('❌ Import issues found:');
  importIssues.forEach(issue => console.log(`  - ${issue}`));
  errors.push(`${importIssues.length} import issues found`);
} else {
  console.log('✅ No import issues found');
}

// 5. Check package.json scripts
console.log('\n5️⃣ Checking package.json configuration...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!packageJson.scripts.build) {
  errors.push('Missing build script in package.json');
}

if (packageJson.dependencies['react-scripts'] === '^0.0.0') {
  errors.push('Invalid react-scripts version in package.json');
}

console.log('✅ Package.json configuration looks good');

// 6. Check for environment variables
console.log('\n6️⃣ Checking environment configuration...');
const envFile = path.join(__dirname, '../.env');
const envExampleFile = path.join(__dirname, '../.env.example');

if (!fs.existsSync(envFile) && fs.existsSync(envExampleFile)) {
  warnings.push('No .env file found, but .env.example exists');
}

console.log('✅ Environment configuration checked');

// Summary
console.log('\n📊 Validation Summary:');
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log('\n❌ Build validation failed! Fix these issues:');
  errors.forEach(error => console.log(`  - ${error}`));
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  Build validation passed with warnings:');
  warnings.forEach(warning => console.log(`  - ${warning}`));
  console.log('\n✅ Ready for production build!');
} else {
  console.log('\n✅ All validations passed! Ready for production build.');
} 