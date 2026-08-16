const fs = require('fs');
const content = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
try {
  require('@babel/parser').parse(content, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  console.log('Valid syntax');
} catch (e) {
  console.log(e.message);
}
