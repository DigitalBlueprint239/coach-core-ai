#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Combines unit and integration test coverage reports
 * into a single comprehensive coverage report
 */

function combineCoverageReports() {
  try {
    console.log('🔍 Combining coverage reports...');
    
    // Read unit test coverage
    const unitCoveragePath = path.join(process.cwd(), 'coverage', 'unit-coverage.json');
    const integrationCoveragePath = path.join(process.cwd(), 'coverage', 'integration-coverage.json');
    
    let unitCoverage = {};
    let integrationCoverage = {};
    
    if (fs.existsSync(unitCoveragePath)) {
      unitCoverage = JSON.parse(fs.readFileSync(unitCoveragePath, 'utf8'));
      console.log('✅ Unit test coverage loaded');
    } else {
      console.log('⚠️  Unit test coverage not found');
    }
    
    if (fs.existsSync(integrationCoveragePath)) {
      integrationCoverage = JSON.parse(fs.readFileSync(integrationCoveragePath, 'utf8'));
      console.log('✅ Integration test coverage loaded');
    } else {
      console.log('⚠️  Integration test coverage not found');
    }
    
    // Combine coverage data
    const combinedCoverage = {
      total: {
        lines: {
          total: 0,
          covered: 0,
          skipped: 0,
          pct: 0
        },
        functions: {
          total: 0,
          covered: 0,
          skipped: 0,
          pct: 0
        },
        branches: {
          total: 0,
          covered: 0,
          skipped: 0,
          pct: 0
        },
        statements: {
          total: 0,
          covered: 0,
          skipped: 0,
          pct: 0
        }
      },
      files: {}
    };
    
    // Helper function to combine coverage metrics
    function combineMetrics(unit, integration) {
      const total = (unit?.total || 0) + (integration?.total || 0);
      const covered = (unit?.covered || 0) + (integration?.covered || 0);
      const skipped = (unit?.skipped || 0) + (integration?.skipped || 0);
      const pct = total > 0 ? (covered / total) * 100 : 0;
      
      return { total, covered, skipped, pct: Math.round(pct * 100) / 100 };
    }
    
    // Combine totals
    if (unitCoverage.total) {
      combinedCoverage.total.lines = combineMetrics(unitCoverage.total.lines, integrationCoverage.total?.lines);
      combinedCoverage.total.functions = combineMetrics(unitCoverage.total.functions, integrationCoverage.total?.functions);
      combinedCoverage.total.branches = combineMetrics(unitCoverage.total.branches, integrationCoverage.total?.branches);
      combinedCoverage.total.statements = combineMetrics(unitCoverage.total.statements, integrationCoverage.total?.statements);
    } else if (integrationCoverage.total) {
      combinedCoverage.total = integrationCoverage.total;
    }
    
    // Combine file-level coverage
    const allFiles = new Set([
      ...Object.keys(unitCoverage.files || {}),
      ...Object.keys(integrationCoverage.files || {})
    ]);
    
    for (const file of allFiles) {
      const unitFile = unitCoverage.files?.[file] || {};
      const integrationFile = integrationCoverage.files?.[file] || {};
      
      combinedCoverage.files[file] = {
        lines: combineMetrics(unitFile.lines, integrationFile.lines),
        functions: combineMetrics(unitFile.functions, integrationFile.functions),
        branches: combineMetrics(unitFile.branches, integrationFile.branches),
        statements: combineMetrics(unitFile.statements, integrationFile.statements)
      };
    }
    
    // Write combined coverage report
    const outputPath = path.join(process.cwd(), 'coverage', 'combined-coverage.json');
    fs.writeFileSync(outputPath, JSON.stringify(combinedCoverage, null, 2));
    
    console.log('✅ Combined coverage report generated');
    console.log('📊 Coverage Summary:');
    console.log(`  Lines: ${combinedCoverage.total.lines.pct}%`);
    console.log(`  Functions: ${combinedCoverage.total.functions.pct}%`);
    console.log(`  Branches: ${combinedCoverage.total.branches.pct}%`);
    console.log(`  Statements: ${combinedCoverage.total.statements.pct}%`);
    
    // Generate LCOV report for Codecov
    generateLCOVReport(combinedCoverage);
    
  } catch (error) {
    console.error('❌ Error combining coverage reports:', error);
    process.exit(1);
  }
}

function generateLCOVReport(coverage) {
  try {
    console.log('🔍 Generating LCOV report...');
    
    let lcovContent = '';
    
    for (const [file, fileCoverage] of Object.entries(coverage.files)) {
      // Skip if no line coverage data
      if (!fileCoverage.lines || !fileCoverage.lines.total) continue;
      
      lcovContent += `SF:${file}\n`;
      
      // Add function coverage
      if (fileCoverage.functions && fileCoverage.functions.total > 0) {
        lcovContent += `FNF:${fileCoverage.functions.total}\n`;
        lcovContent += `FNH:${fileCoverage.functions.covered}\n`;
      }
      
      // Add branch coverage
      if (fileCoverage.branches && fileCoverage.branches.total > 0) {
        lcovContent += `BRF:${fileCoverage.branches.total}\n`;
        lcovContent += `BRH:${fileCoverage.branches.covered}\n`;
      }
      
      // Add line coverage (simplified - in real implementation you'd need detailed line data)
      lcovContent += `LF:${fileCoverage.lines.total}\n`;
      lcovContent += `LH:${fileCoverage.lines.covered}\n`;
      
      lcovContent += 'end_of_record\n';
    }
    
    const lcovPath = path.join(process.cwd(), 'coverage', 'lcov.info');
    fs.writeFileSync(lcovPath, lcovContent);
    
    console.log('✅ LCOV report generated');
    
  } catch (error) {
    console.error('❌ Error generating LCOV report:', error);
  }
}

// Run the combination
combineCoverageReports();
