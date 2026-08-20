import re

with open('src/components/Header.tsx', 'r') as f:
    code = f.read()

# Replace the useState and useEffect with useLiveSignal
code = code.replace("import { fetchApiSignal, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';", "import { fetchApiSignal, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';\nimport { useLiveSignal } from '../hooks/useLiveSignal';")

hook_code = """  const { tzName: userTzName, abbr: userTzAbbr } = getLocalTimezone();

  const { signal: apiSignal, status: modelStatus } = useLiveSignal(selectedAsset || 'BTC', selectedTimeframe || '15M');
"""

# Replace the useState and useEffect
pattern = r"  const \[apiSignal, setApiSignal\] = useState.*?\}, \[selectedAsset, selectedTimeframe\]\);"
code = re.sub(pattern, hook_code, code, flags=re.DOTALL)

# Replace Math.round(apiSignal.modelProbability * 100) with Math.round(apiSignal.confidence)
code = code.replace("Math.round(apiSignal.modelProbability * 100)", "Math.round(apiSignal.confidence || 0)")
# Also change the condition apiSignal?.modelProbability !== null to apiSignal?.confidence !== null
code = code.replace("apiSignal?.modelProbability !== null && apiSignal?.modelProbability !== undefined", "apiSignal?.confidence !== null && apiSignal?.confidence !== undefined")

with open('src/components/Header.tsx', 'w') as f:
    f.write(code)

