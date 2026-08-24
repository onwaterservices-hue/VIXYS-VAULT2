import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    content = f.read()

# Helper function string to embed in the component
helper = """
  // Helper to extract colors from semantic class
  const getGradients = (semanticClass: string) => {
    if (semanticClass.includes('00FF9D')) return { '--grad-a': '#34d399', '--grad-b': '#f5f0ff', '--grad-c': '#10b981', '--grad-glow': 'rgba(52,211,153,0.4)' };
    if (semanticClass.includes('FF3366')) return { '--grad-a': '#fb7185', '--grad-b': '#f5f0ff', '--grad-c': '#e11d48', '--grad-glow': 'rgba(244,63,94,0.5)' };
    if (semanticClass.includes('amber')) return { '--grad-a': '#fbbf24', '--grad-b': '#f5f0ff', '--grad-c': '#f59e0b', '--grad-glow': 'rgba(251,191,36,0.4)' };
    return { '--grad-a': '#d8b4fe', '--grad-b': '#f5f0ff', '--grad-c': '#a855f7', '--grad-glow': 'rgba(168,85,247,0.4)' };
  };
"""

content = re.sub(
    r'(const volatilityState = .*?;)',
    helper + r'\n  \1',
    content,
    count=1
)

content = re.sub(
    r'<div className={`text-xl font-black tracking-wider (\w+ )?\$\{([^\}]+)\} hud-gradient-text`}>',
    r'<div className={`text-xl font-black tracking-wider \1${\2} hud-gradient-text`} style={getGradients(\2) as React.CSSProperties}>',
    content
)

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(content)
