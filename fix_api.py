import re

with open('src/services/api.ts', 'r') as f:
    content = f.read()

pattern = r'  \} catch \(e\) \{\n    // Fallback\n  \}\n\n  const now = Date\.now\(\);\n  const periodMs = interval === \'1h\' \? 60 \* 60 \* 1000 : 15 \* 60 \* 1000;\n  const candles: Candle\[\] = \[\];\n  const basePrice = symbol === \'BTC\' \? 63850 : symbol === \'ETH\' \? 3450 : symbol === \'SOL\' \? 180 : 10;\n  let currentClose = basePrice;\n\n  for \(let i = 29; i >= 0; i--\) \{\n    const time = now - i \* periodMs;\n    const open = currentClose;\n    const change = \(Math\.random\(\) - 0\.46\) \* \(basePrice \* 0\.003\);\n    const close = open \+ change;\n    const high = Math\.max\(open, close\) \+ Math\.random\(\) \* \(basePrice \* 0\.001\);\n    const low = Math\.min\(open, close\) - Math\.random\(\) \* \(basePrice \* 0\.001\);\n    const volume = 250 \+ Math\.random\(\) \* 500;\n\n    candles\.push\(\{\n      time,\n      open: Math\.round\(open \* 100\) / 100,\n      high: Math\.round\(high \* 100\) / 100,\n      low: Math\.round\(low \* 100\) / 100,\n      close: Math\.round\(close \* 100\) / 100,\n      volume: Math\.round\(volume \* 10\) / 10,\n    \}\);\n    currentClose = close;\n  \}\n\n  return candles;'

replacement = r'''  } catch (e) {
    console.error('Failed to fetch candles', e);
  }
  return [];'''

content = re.sub(pattern, replacement, content)

with open('src/services/api.ts', 'w') as f:
    f.write(content)
