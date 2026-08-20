import re

with open("src/components/Sidebar.tsx", "r") as f:
    text = f.read()

replacement = """
        { id: "settings", label: "Settings", icon: Settings },
        {
          id: "discord-bot",
          label: "Discord Bot Service",
          icon: Bot,
          badge: "ADMIN",
        },
        {
          id: "vixy-learning",
          label: "VIXY Learning Center",
          icon: BrainCircuit,
          badge: "ADMIN",
        },
"""

text = re.sub(r'\{\s*id:\s*"settings".*?\},\s*\{\s*id:\s*"discord-bot".*?\},', replacement.strip(), text, flags=re.DOTALL)

with open("src/components/Sidebar.tsx", "w") as f:
    f.write(text)
