import re

with open("src/App.tsx", "r") as f:
    text = f.read()

import_statement = "import { VixyLearningCenter } from './components/VixyLearningCenter';\n"
if "VixyLearningCenter" not in text:
    text = text.replace("import { DiscordBotHubView } from './components/DiscordBotHubView';", "import { DiscordBotHubView } from './components/DiscordBotHubView';\n" + import_statement)

replacement = """{activeTab === 'discord-bot' && (
                    userRole === 'ADMIN' ? (
                      <DiscordBotHubView />
                    ) : (
                      <NotFoundView onReturnToTerminal={() => setActiveTab('terminal')} />
                    )
                  )}

                  {activeTab === 'vixy-learning' && (
                    userRole === 'ADMIN' ? (
                      <VixyLearningCenter />
                    ) : (
                      <NotFoundView onReturnToTerminal={() => setActiveTab('terminal')} />
                    )
                  )}"""

text = text.replace("""{activeTab === 'discord-bot' && (
                    userRole === 'ADMIN' ? (
                      <DiscordBotHubView />
                    ) : (
                      <NotFoundView onReturnToTerminal={() => setActiveTab('terminal')} />
                    )
                  )}""", replacement)

with open("src/App.tsx", "w") as f:
    f.write(text)
