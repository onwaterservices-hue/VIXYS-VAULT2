const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "return (\n          {isVerifyingPayment && (",
  "return (\n    <>\n      {isVerifyingPayment && ("
);

code = code.replace(
  "    </div>\n  );\n}\n",
  "    </div>\n    </>\n  );\n}\n"
);

fs.writeFileSync('src/App.tsx', code);
