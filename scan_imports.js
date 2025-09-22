const fs = require('fs');
const path = require('path');

// Track issues found
const issues = {
  duplicateImports: [],
  duplicateIdentifiers: [],
  unusedImports: [],
  circularDeps: [],
  nonAlphabetized: []
};

// Track file modifications
const modifiedFiles = [];

// Function to check for duplicate imports
function checkDuplicateImports(filePath, content) {
  const lines = content.split('\n');
  const importLines = lines.filter(line => line.trim().startsWith('import'));
  
  // Check for duplicate import statements
  const importMap = new Map();
  importLines.forEach((line, index) => {
    const trimmed = line.trim();
    if (importMap.has(trimmed)) {
      issues.duplicateImports.push({
        file: filePath,
        line: index + 1,
        content: trimmed,
        duplicateOf: importMap.get(trimmed)
      });
    } else {
      importMap.set(trimmed, index + 1);
    }
  });
  
  // Check for duplicate identifiers within import statements
  const allImports = content.match(/import\s*\{[^}]*\}/g) || [];
  allImports.forEach((importBlock, blockIndex) => {
    const identifiers = importBlock.match(/\b\w+\b/g) || [];
    const seen = new Set();
    identifiers.forEach(id => {
      if (seen.has(id) && id !== 'import' && id !== 'from') {
        issues.duplicateIdentifiers.push({
          file: filePath,
          identifier: id,
          importBlock: importBlock.trim()
        });
      } else {
        seen.add(id);
      }
    });
  });
}

// Function to check if imports are alphabetized
function checkAlphabetizedImports(filePath, content) {
  const lines = content.split('\n');
  let inImportBlock = false;
  let importLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('import {')) {
      inImportBlock = true;
      importLines = [line];
    } else if (inImportBlock && line.includes('} from')) {
      importLines.push(line);
      
      // Check if the import block is alphabetized
      const allImports = importLines.join(' ').match(/\b\w+\b/g) || [];
      const identifiers = allImports.filter(id => 
        id !== 'import' && id !== 'from' && id !== 'as' && 
        !id.includes('{') && !id.includes('}') && !id.includes('(') && !id.includes(')')
      );
      
      const sorted = [...identifiers].sort();
      if (JSON.stringify(identifiers) !== JSON.stringify(sorted)) {
        issues.nonAlphabetized.push({
          file: filePath,
          line: i + 1,
          identifiers: identifiers,
          shouldBe: sorted
        });
      }
      
      inImportBlock = false;
      importLines = [];
    } else if (inImportBlock) {
      importLines.push(line);
    }
  }
}

// Function to scan a file
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    checkDuplicateImports(filePath, content);
    checkAlphabetizedImports(filePath, content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
}

// Function to scan directory recursively
function scanDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      scanDirectory(fullPath);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      scanFile(fullPath);
    }
  });
}

// Start scanning
console.log('🔍 Starting comprehensive import scan...');
scanDirectory('./src');

// Report results
console.log('\n📊 SCAN RESULTS:');
console.log('================');

if (issues.duplicateImports.length > 0) {
  console.log(`\n❌ Duplicate Imports (${issues.duplicateImports.length}):`);
  issues.duplicateImports.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line} - "${issue.content}"`);
  });
} else {
  console.log('\n✅ No duplicate imports found');
}

if (issues.duplicateIdentifiers.length > 0) {
  console.log(`\n❌ Duplicate Identifiers (${issues.duplicateIdentifiers.length}):`);
  issues.duplicateIdentifiers.forEach(issue => {
    console.log(`  ${issue.file} - "${issue.identifier}" in: ${issue.importBlock}`);
  });
} else {
  console.log('\n✅ No duplicate identifiers found');
}

if (issues.nonAlphabetized.length > 0) {
  console.log(`\n⚠️  Non-alphabetized imports (${issues.nonAlphabetized.length}):`);
  issues.nonAlphabetized.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    Current: [${issue.identifiers.join(', ')}]`);
    console.log(`    Should be: [${issue.shouldBe.join(', ')}]`);
  });
} else {
  console.log('\n✅ All imports are properly alphabetized');
}

console.log('\n🎯 Summary:');
console.log(`- Files scanned: ${process.argv[2] || 'All TypeScript files in src/'}`);
console.log(`- Duplicate imports: ${issues.duplicateImports.length}`);
console.log(`- Duplicate identifiers: ${issues.duplicateIdentifiers.length}`);
console.log(`- Non-alphabetized imports: ${issues.nonAlphabetized.length}`);
