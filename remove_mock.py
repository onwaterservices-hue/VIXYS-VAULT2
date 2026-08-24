import re

with open('src/components/LiveDashboard.tsx', 'r') as f:
    content = f.read()

# Replace handleMarketChange entirely
pattern = r'  const handleMarketChange = \(marketKey: \'BTC15M\' \| \'BTC1H\' \| \'ETH15M\' \| \'SOL15M\'\) => \{.*?\};\n\n  // Handle Manual AI Re-Analysis'

replacement = r'''  const handleMarketChange = (marketKey: 'BTC15M' | 'BTC1H' | 'ETH15M' | 'SOL15M') => {
    setActiveMarket(marketKey);
    if (marketKey === 'BTC1H') {
      setTimeframe('1H');
    } else if (marketKey === 'BTC15M') {
      setTimeframe('15M');
    }
  };

  // Handle Manual AI Re-Analysis'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/components/LiveDashboard.tsx', 'w') as f:
    f.write(content)
