import re

for filename in ['src/components/ScalpDecisionChart.tsx', 'src/components/NeuralRibbonChart.tsx']:
    with open(filename, 'r') as f:
        code = f.read()
    
    # We will remove the width/height setting from the render loop and add a ResizeObserver
    
    if filename == 'src/components/ScalpDecisionChart.tsx':
        code = code.replace("const width = (canvas.width = containerRef.current?.clientWidth || canvas.parentElement?.clientWidth || 600);\n        const height = (canvas.height = containerRef.current?.clientHeight || canvas.parentElement?.clientHeight || 380);", "const width = canvas.width;\n        const height = canvas.height;")
        
        hook = """
  // Resize Observer for robust canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current || canvas?.parentElement;
    if (!canvas || !container) return;
    
    const handleResize = () => {
      canvas.width = container.clientWidth || 600;
      canvas.height = container.clientHeight || 380;
    };
    
    handleResize(); // Initial sizing
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
"""
        code = code.replace("// High-frame-rate Canvas Render Engine", hook + "\n  // High-frame-rate Canvas Render Engine")

    if filename == 'src/components/NeuralRibbonChart.tsx':
        code = code.replace("const width = (canvas.width = canvas.parentElement?.clientWidth || 700);\n        const height = (canvas.height = canvas.parentElement?.clientHeight || 320);", "const width = canvas.width;\n        const height = canvas.height;")
        
        hook = """
  // Resize Observer for robust canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    
    const handleResize = () => {
      canvas.width = container.clientWidth || 700;
      canvas.height = container.clientHeight || 320;
    };
    
    handleResize(); // Initial sizing
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
"""
        code = code.replace("useEffect(() => {", hook + "\n  useEffect(() => {", 1)

    with open(filename, 'w') as f:
        f.write(code)

