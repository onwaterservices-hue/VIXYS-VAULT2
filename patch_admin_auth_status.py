import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    code = f.read()

old_uid = """                            <td className="p-3">
                              <span className="text-[10px] font-mono text-slate-400">
                                {user.authStatus === 'DISCORD_PENDING' ? 'DISCORD_PENDING' : (user.uid ? user.uid.slice(0, 8) + '...' : 'LOCAL')}
                              </span>
                            </td>"""

new_uid = """                            <td className="p-3">
                              <span className="text-[10px] font-mono text-slate-400">
                                {user.uid ? user.uid.slice(0, 8) + '...' : 'LOCAL'}
                              </span>
                            </td>"""

old_status = """                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                  user.authStatus === 'DISCORD_PENDING'
                                    ? 'bg-slate-700/50 text-slate-400 border border-slate-700'
                                    : user.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : user.status === 'TRIALING'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {user.authStatus === 'DISCORD_PENDING' ? 'NOT CONNECTED' : user.status}
                              </span>
                            </td>"""

new_status = """                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                  user.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : user.status === 'TRIALING'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {user.status}
                              </span>
                            </td>"""

if old_uid in code:
    code = code.replace(old_uid, new_uid)
if old_status in code:
    code = code.replace(old_status, new_status)

with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(code)
print("Patched authStatus references")
