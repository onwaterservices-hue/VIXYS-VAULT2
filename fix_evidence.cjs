const fs = require('fs');
let code = fs.readFileSync('src/utils/evidenceVectors.ts', 'utf8');

// Update ComputedEvidenceSummary interface
code = code.replace(
  /compositeFooterText: string;\n\}/,
  'compositeFooterText: string;\n  dynamicExplanation: string;\n}'
);

const newReturnLogic = `
  // Generate dynamic explanation
  let dynamicExplanation = "";
  if (totalValidCount === 0) {
    dynamicExplanation = "Insufficient market data to establish a structural bias at this time.";
  } else {
    const sortedVectors = [...validVectors].sort((a, b) => (b.score || 0) - (a.score || 0));
    const topFactors = sortedVectors.slice(0, 2).map(v => v.name.toLowerCase()).join(" and ");
    const biasStr = dir === 'UP' ? 'bullish' : dir === 'DOWN' ? 'bearish' : 'neutral';
    
    let baseSentence = \`Strong \${topFactors} \${topFactors.includes('and') ? 'are' : 'is'} supporting the current \${biasStr} structure.\`;
    if (dir === 'NEUTRAL') {
      baseSentence = \`Mixed \${topFactors} \${topFactors.includes('and') ? 'are' : 'is'} driving a structurally neutral bias.\`;
    }

    let alignmentSentence = "";
    if (alignedCount === totalValidCount && totalValidCount > 0) {
      alignmentSentence = " Full cross-venue alignment remains highly favorable.";
    } else if (alignedCount >= Math.ceil(totalValidCount / 2)) {
      alignmentSentence = " Alignment remains favorable, though some factors remain divergent.";
    } else {
      alignmentSentence = \` However, with only \${alignedCount} of \${totalValidCount} signals aligned, conflicting structural factors indicate caution.\`;
    }
    
    dynamicExplanation = \`\${baseSentence}\${alignmentSentence}\`;
  }

  return {
    vectors,
    alignedCount,
    totalValidCount,
    totalCount,
    compositeScore,
    compositeDisplay,
    convictionPct,
    signalsAlignedHeader: \`\${alignedCount} / \${totalCount} SIGNALS ALIGNED\`,
    convictionHeaderText: \`CONVICTION \${compositeDisplay}/10\`,
    convictionPercentText: \`\${convictionPct}% SIGNAL CONVICTION\`,
    compositeFooterText: \`\${compositeDisplay} / 10 COMPOSITE\`,
    dynamicExplanation,
  };
`;

code = code.replace(/return \{\n\s*vectors,[\s\S]*compositeFooterText:[^\n]*\n\s*\};/, newReturnLogic);

fs.writeFileSync('src/utils/evidenceVectors.ts', code);
