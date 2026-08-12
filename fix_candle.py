import re

with open('src/components/CandleChart.tsx', 'r') as f:
    code = f.read()

# Replace useContainerWidth with useContainerSize
code = code.replace("function useContainerWidth() {", "function useContainerSize() {")
code = code.replace("const [width, setWidth] = useState<number>(800);", "const [width, setWidth] = useState<number>(800);\n  const [height, setHeight] = useState<number>(510);")
code = code.replace("if (entry.contentRect && entry.contentRect.width > 0) {", "if (entry.contentRect && entry.contentRect.width > 0) {\n          setHeight(Math.floor(entry.contentRect.height));")
code = code.replace("return { containerRef, width };", "return { containerRef, width, height };")
code = code.replace("const { containerRef, width: measuredWidth } = useContainerWidth();", "const { containerRef, width: measuredWidth, height: measuredHeight } = useContainerSize();")

# Update heights to be responsive
height_calc = """  // Make svgHeight responsive to the container
  const isWide = measuredWidth >= WIDE_BREAKPOINT;
  const sidePanelWidth = isWide ? 260 : 0;
  const gapX = isWide ? 16 : 0;
  const paddingX = 32;
  const chartSvgWidth = Math.max(280, measuredWidth - sidePanelWidth - gapX - paddingX);

  // Dynamic height calculation
  // Base fixed heights for bottom panels
  const volumeHeight = 60;
  const rsiHeight = showRSI ? 70 : 0;
  const marginTop = 25;
  const marginBottom = 30; // X-axis space
  
  // Total available for SVG (subtract HUD, controls, etc. which take roughly 120px)
  const availableSvgHeight = Math.max(300, measuredHeight - 140); 
  const svgHeight = availableSvgHeight;
  
  // Chart height takes remainder
  const chartHeight = Math.max(150, svgHeight - volumeHeight - rsiHeight - marginTop - marginBottom);
"""

# Replace the fixed height calculations
pattern = r"  const svgHeight = showRSI \? 510 : 410;\n  const chartHeight = 270;\n  const volumeHeight = 60;\n  const rsiHeight = 70;\n  const marginTop = 25;"
code = re.sub(pattern, "  const volumeHeight = 60;\n  const rsiHeight = showRSI ? 70 : 0;\n  const marginTop = 25;\n  const marginBottom = 30;\n  const svgHeight = Math.max(400, measuredHeight - 180);\n  const chartHeight = Math.max(200, svgHeight - volumeHeight - rsiHeight - marginTop - marginBottom);", code)

# Fix timestamps in buildChartSignals
code = code.replace("time: String(c.time || `Bar #${i + 1}`)", "time: typeof c.time === 'number' ? new Date(c.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : String(c.time || `Bar #${i + 1}`)")

# Ensure the main container in CandleChart has h-full so it grows in flex containers
code = code.replace("className=\"w-full bg-[#0d0a1a] rounded-2xl border border-[#2a2340] p-4 text-[#e5e0f5] font-mono shadow-2xl\"", "className=\"w-full h-full min-h-[450px] flex flex-col bg-[#0d0a1a] rounded-2xl border border-[#2a2340] p-4 text-[#e5e0f5] font-mono shadow-2xl\"")

# Ensure the grid row can take remaining height
code = code.replace("className={`grid gap-4 ${isWide ? 'grid-cols-[1fr_260px]' : 'grid-cols-1'}`}", "className={`flex-1 grid gap-4 overflow-hidden ${isWide ? 'grid-cols-[1fr_260px]' : 'grid-cols-1'}`}")
code = code.replace("className=\"w-full overflow-hidden flex justify-center\">{mainSvgContent}</div>", "className=\"w-full h-full overflow-hidden flex justify-center items-center\">{mainSvgContent}</div>")

with open('src/components/CandleChart.tsx', 'w') as f:
    f.write(code)

