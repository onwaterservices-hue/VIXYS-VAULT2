import re

with open('src/components/brains/SignalBrain.tsx', 'r') as f:
    code = f.read()

code = code.replace("</div>\n            </div>\n          </div>\n          </div>\n        </div>\n\n        {/* Right Column", "</div>\n            </div>\n          </div>\n        </div>\n\n        {/* Right Column")

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(code)

