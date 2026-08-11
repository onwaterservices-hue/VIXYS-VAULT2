import re

with open('src/components/NeuralRibbonChart.tsx', 'r') as f:
    content = f.read()

# Fix initial state
pattern = r'  const \[priceHistory, setPriceHistory\] = useState<PricePoint\[\]>\(\(\) => \{\n.*?    return points;\n  \}\);'
replacement = r'  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);'
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Fix fetch fallback prefill
pattern2 = r'        const initialPoints: PricePoint\[\] = \[\];\n        const now = Date\.now\(\);\n        let p = currentP - 25;\n\n        for \(let i = 50; i >= 0; i--\) \{\n          p \+= \(Math\.random\(\) - 0\.48\) \* 8;\n          initialPoints\.push\(\{\n            time: now - i \* 1000,\n            price: p,\n            buyVolume: Math\.random\(\) \* 2\.5,\n            sellVolume: Math\.random\(\) \* 2\.2,\n          \}\);\n        \}\n        setPriceHistory\(initialPoints\);'
replacement2 = r'        setPriceHistory([{ time: Date.now(), price: currentP, buyVolume: 0, sellVolume: 0 }]);'
content = re.sub(pattern2, replacement2, content)

with open('src/components/NeuralRibbonChart.tsx', 'w') as f:
    f.write(content)
