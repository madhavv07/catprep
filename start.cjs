const fs = require('fs');
const { execSync } = require('child_process');

if (!fs.existsSync('dist/server.cjs') || !fs.existsSync('dist/index.html')) {
  console.log('⚡ Production build not found. Automatically building with npm run build...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build complete. Starting PrepDesk server...');
}

// Execute the compiled production server
require('./dist/server.cjs');
