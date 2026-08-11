import re
with open('src/bot/discordBotService.ts', 'r') as f:
    content = f.read()

pattern = r'if \(res\.status === 403\) \{\n          console\.warn\(\'\[DiscordBot\] Direct REST fetch members failed with 403\. The bot likely lacks the GUILD_MEMBERS intent\. Returning empty member list\.\'\);\n        \} else \{\n          console\.error\(\'\[DiscordBot\] Direct REST fetch members failed with status:\', res\.status\);\n        \}'
replacement = r'''if (res.status === 403) {
          console.warn('[DiscordBot] Direct REST fetch members failed with 403. The bot likely lacks the GUILD_MEMBERS intent. Returning empty member list.');
        } else {
          console.error('[DiscordBot] Direct REST fetch members failed with status:', res.status);
        }'''
content = re.sub(pattern, replacement, content)

with open('src/bot/discordBotService.ts', 'w') as f:
    f.write(content)
