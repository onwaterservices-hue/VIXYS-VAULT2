import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('                    </bu              ) : (\n                /* Logged in AND Active Subscription / Free Account -> Access Dashboard / Terminal Desks! */\n                <div className="relative">l Desks! */\n                <div className="relative">', '                    </button>\n                  </div>\n                </div>\n              ) : (\n                /* Logged in AND Active Subscription / Free Account -> Access Dashboard / Terminal Desks! */\n                <div className="relative">')

with open('src/App.tsx', 'w') as f:
    f.write(content)
