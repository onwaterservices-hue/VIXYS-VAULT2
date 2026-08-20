const fs = require('fs');

['src/components/AuthModal.tsx', 'src/components/AuthView.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the unconditional register mode check with one that ensures no success message is showing
  // Also we will change it to only show if there is no error message either, to be safe.
  const target = "{mode === 'register' && (";
  const replacement = "{mode === 'register' && !successMsg && (";
  
  // In AuthModal it might have `{mode === 'register' && (`
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log(`Updated ${file} successfully.`);
  } else {
    console.log(`Could not find target in ${file}`);
  }
});
