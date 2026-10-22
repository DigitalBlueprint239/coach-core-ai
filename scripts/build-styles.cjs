// CRA 5 disables external PostCSS configuration. Compile Tailwind 4 explicitly
// before CRA, using the pinned dependency; never pass unresolved directives on.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(
  '@import "tailwindcss";\n@source "../src";',
  {from:path.join(root,'scripts/styles-input.css'),to:path.join(root,'src/utilities.generated.css')}
).then(r=>require('postcss')([require('postcss-nested')]).process(r.css,{from:undefined})).then(r=>fs.writeFileSync(path.join(root,'src/utilities.generated.css'),r.css)).catch(e=>{console.error(e);process.exit(1)});
