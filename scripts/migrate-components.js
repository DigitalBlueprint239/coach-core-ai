const fs = require('fs').promises;
const path = require('path');
const { transform } = require('@babel/core');
const glob = require('fast-glob');

async function migrateComponent(inputPath, outputPath) {
  try {
    // Read the original component
    const content = await fs.readFile(inputPath, 'utf8');
    // Transform to TypeScript
    const result = transform(content, {
      plugins: [
        '@babel/plugin-transform-typescript',
        ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      ],
      filename: path.basename(inputPath),
    });
    // Add TypeScript types
    let tsContent = result.code;
    // Add prop types
    tsContent = tsContent.replace(
      /function (\w+)\(props\)/g,
      'function $1(props: any)'
    );
    // Add React import if missing
    if (!tsContent.includes("import React")) {
      tsContent = "import React from 'react';\n" + tsContent;
    }
    // Write to new location
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath.replace('.js', '.tsx'), tsContent);
    console.log(`✅ Migrated: ${inputPath} → ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to migrate ${inputPath}:`, error);
  }
}

// Run migrations
async function runMigrations() {
  const migrations = [
    {
      from: '../old-project/src/components',
      to: './src/components',
      pattern: '**/*.js',
    },
    {
      from: '../old-project/src/screens',
      to: './src/features',
      pattern: '**/*.js',
    },
  ];
  for (const migration of migrations) {
    const files = await glob(path.join(migration.from, migration.pattern));
    for (const file of files) {
      const relativePath = path.relative(migration.from, file);
      const outputPath = path.join(migration.to, relativePath);
      await migrateComponent(file, outputPath);
    }
  }
}

runMigrations().catch(console.error); 