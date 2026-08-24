import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    code = f.read()

old_col = """                            <td className="p-3">
                              {user.authStatus === 'DISCORD_PENDING' ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-500/10 text-indigo-400 rounded">
                                  DISCORD ONLY
                                </span>
                              ) : isDupRisk ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 rounded flex items-center space-x-1 w-fit">
                                  <AlertTriangle className="w-3 h-3 text-red-400" />
                                  <span>DUPLICATE RISK</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 rounded">
                                  VERIFIED
                                </span>
                              )}
                            </td>"""

new_col = """                            <td className="p-3">
                              {isDupRisk ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 rounded flex items-center space-x-1 w-fit">
                                  <AlertTriangle className="w-3 h-3 text-red-400" />
                                  <span>DUPLICATE RISK</span>
                                </span>
                              ) : user.verificationStatus === 'UNVERIFIED' || (!user.discordLinked && !user.discordId) ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-700/50 text-slate-400 border border-slate-700 rounded">
                                  UNVERIFIED
                                </span>
                              ) : user.verificationStatus === 'NEEDS_GUILD' ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-400 rounded">
                                  NEEDS GUILD
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 rounded">
                                  VERIFIED
                                </span>
                              )}
                            </td>"""

if old_col in code:
    code = code.replace(old_col, new_col)
    with open('src/components/AdminPanel.tsx', 'w') as f:
        f.write(code)
    print("Patched verification column")
else:
    print("Failed to find verification column")

