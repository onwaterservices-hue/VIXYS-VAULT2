const fs = require('fs');

let uiCode = fs.readFileSync('src/components/CryptoPredictionCenterView.tsx', 'utf8');

// Add import if missing
if (!uiCode.includes('import { computeEvidenceVectors }')) {
  uiCode = uiCode.replace(
    /import \{ useCanonical15mDecision \} from '\.\.\/hooks\/useCanonical15mDecision';/,
    "import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';\nimport { computeEvidenceVectors } from '../utils/evidenceVectors';"
  );
}

// Add evidenceSummary definition
if (!uiCode.includes('const evidenceSummary = useMemo(() => computeEvidenceVectors(canonicalDecision)')) {
  uiCode = uiCode.replace(
    /const \[nowMs, setNowMs\] = useState<number>\(Date\.now\(\)\);/,
    "const [nowMs, setNowMs] = useState<number>(Date.now());\n  const evidenceSummary = useMemo(() => computeEvidenceVectors(canonicalDecision), [canonicalDecision]);"
  );
}

fs.writeFileSync('src/components/CryptoPredictionCenterView.tsx', uiCode);
