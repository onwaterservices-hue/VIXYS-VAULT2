import re

with open('src/components/ScalpDecisionChart.tsx', 'r') as f:
    content = f.read()

# Fix initial state
pattern1 = r'  const generateInitialCandles = \(basePrice = 64160\.5\) => \{.*?\n  \};\n\n  const \[candles, setCandles\] = useState<Candle\[\]>\(\(\) => generateInitialCandles\(\)\);'
replacement1 = r'''  const [candles, setCandles] = useState<Candle[]>([]);'''
content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)

# Fix fetch fallback prefill
pattern2 = r'        // Seed 35 candles.*?\n        setCandles\(initialCandles\);'
replacement2 = r'''        setCandles([{ time: Date.now(), open: p, high: p, low: p, close: p, volume: 0, takerBuyRatio: 0.5 }]);'''
content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)

# Remove fake setUpProbability
pattern3 = r'            // Smoothly drift probability\n            setUpProbability\(\(prev\) => \{\n              const shift = \(isBuyer \? 0\.3 : -0\.3\) \+ \(Math\.random\(\) - 0\.49\) \* 0\.4;\n              return Math\.min\(94, Math\.max\(22, Math\.round\(prev \+ shift\)\)\);\n            \}\);\n'
replacement3 = r''
content = re.sub(pattern3, replacement3, content, flags=re.DOTALL)

# Remove liveTickTimer
pattern4 = r'    // Live tick simulator interval to ensure continuous chart motion regardless of network\n    const liveTickTimer = setInterval\(\(\) => \{\n      if \(isCancelled\) return;\n      const delta = \(Math\.random\(\) - 0\.47\) \* 3\.8;\n      setCurrentPrice\(\(prevP\) => \{\n        const nextP = Math\.round\(\(prevP \+ delta\) \* 100\) / 100;\n        setCandles\(\(prev\) => \{\n          if \(prev\.length === 0\) return prev;\n          const updated = \[\.\.\.prev\];\n          const last = \{ \.\.\.updated\[updated\.length - 1\] \};\n          last\.close = nextP;\n          last\.high = Math\.max\(last\.high, nextP\);\n          last\.low = Math\.min\(last\.low, nextP\);\n          last\.volume \+= Math\.random\(\) \* 0\.4;\n          updated\[updated\.length - 1\] = last;\n          return updated;\n        \}\);\n        return nextP;\n      \}\);\n    \}, 1200\);\n'
replacement4 = r''
content = re.sub(pattern4, replacement4, content, flags=re.DOTALL)

# Also remove clearInterval for liveTickTimer
pattern5 = r'      clearInterval\(liveTickTimer\);\n'
replacement5 = r''
content = re.sub(pattern5, replacement5, content, flags=re.DOTALL)

with open('src/components/ScalpDecisionChart.tsx', 'w') as f:
    f.write(content)
