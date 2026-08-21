import re

with open('src/components/ScalpDecisionChart.tsx', 'r') as f:
    content = f.read()

# Fix the Visual Centerpiece wrapper
content = content.replace(
    '<div className="bg-[#0C0819]/95 border border-purple-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_35px_rgba(168,85,247,0.18)] space-y-3.5 relative overflow-hidden backdrop-blur-xl">',
    '<div className="w-full flex flex-col bg-[#0d0a1a] rounded-2xl border border-[#2a2340] p-3 sm:p-4 text-[#e5e0f5] font-mono shadow-2xl overflow-hidden relative">'
)

# Fix the header border inside it
content = content.replace(
    '<div className="flex flex-wrap items-center justify-between text-xs border-b border-purple-900/40 pb-2.5 gap-2">',
    '<div className="flex flex-wrap items-center justify-between text-xs pb-3 mb-3 gap-2 border-b border-[#2a2340]">'
)

# Fix the Canvas Visualizer Frame
content = content.replace(
    '<div className="relative rounded-2xl bg-[#05020F] border border-purple-500/30 p-2 overflow-hidden h-[500px] sm:h-[580px] lg:h-[660px] shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">',
    '<div className="w-full flex-1 min-h-[420px] sm:min-h-[480px] md:min-h-[540px] lg:min-h-[600px] flex flex-col overflow-hidden">\n        <div className="w-full flex-1 min-h-[380px] sm:min-h-[440px] md:min-h-[480px] lg:min-h-[540px] relative overflow-hidden rounded-xl bg-[#080512] border border-[#1f1933] flex items-center justify-center">'
)

# Close the new flex-1 wrapper (find the end of the canvas div)
# The canvas frame ends with:
#             </div>
#           </div>
#         </div>
# We need to add one more </div> for the wrapper.
content = content.replace(
    '''            <div className="absolute top-2 right-2 bg-[#0C0819]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-purple-500/40 text-[10px] text-purple-300 font-mono shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              CONFIDENCE: <strong className="text-white">{confidence}%</strong>
            </div>
          </div>
        </div>''',
    '''            <div className="absolute top-2 right-2 bg-[#0C0819]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-purple-500/40 text-[10px] text-purple-300 font-mono shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              CONFIDENCE: <strong className="text-white">{confidence}%</strong>
            </div>
          </div>
        </div>
      </div>'''
)

# Fix canvas wrapper classes (containerRef)
content = content.replace(
    '<div ref={containerRef} className="w-full h-full relative">',
    '<div ref={containerRef} className="absolute inset-0 w-full h-full">'
)

# Fix grid lines
content = content.replace("ctx.strokeStyle = 'rgba(147, 51, 234, 0.10)';", "ctx.strokeStyle = '#1a1236';")
content = content.replace("ctx.lineWidth = 1;", "ctx.lineWidth = 0.75;")

# Background color
content = content.replace("ctx.fillStyle = '#05020F';", "ctx.fillStyle = '#080512';")

# Candles styling
content = content.replace("const color = isUp ? '#00FF88' : '#FF3B30';", "const color = isUp ? '#10b981' : '#f43f5e';")
content = content.replace("const glowColor = isUp ? 'rgba(0, 255, 136, 0.9)' : 'rgba(255, 59, 48, 0.9)';", "const glowColor = 'transparent';")
content = content.replace("ctx.shadowBlur = 8;", "ctx.shadowBlur = 0;")
content = content.replace("ctx.shadowBlur = 12;", "ctx.shadowBlur = 0;")

with open('src/components/ScalpDecisionChart.tsx', 'w') as f:
    f.write(content)
