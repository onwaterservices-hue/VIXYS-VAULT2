import re

with open('src/services/api.ts', 'r') as f:
    code = f.read()

old_headers = """export function getAdminHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const currentEmail = typeof localStorage !== 'undefined' 
    ? (localStorage.getItem('vixy_user_email') || localStorage.getItem('vixy_admin_email') || 'onwaterservices@gmail.com')
    : 'onwaterservices@gmail.com';
  return {
    'Content-Type': 'application/json',
    'x-user-email': currentEmail,
    'x-user-role': 'OWNER',
    ...extraHeaders,
  };
}"""

new_headers = """export function getAdminHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  let currentEmail = '';
  let currentRole = 'OWNER'; // default for backwards compat
  
  if (typeof localStorage !== 'undefined') {
    try {
      const auth = localStorage.getItem('vixy_auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed?.user?.email) currentEmail = parsed.user.email;
        if (parsed?.user?.role) currentRole = parsed.user.role;
      }
    } catch (e) {}
    
    if (!currentEmail) {
      currentEmail = localStorage.getItem('vixy_user_email') || localStorage.getItem('vixy_admin_email') || 'onwaterservices@gmail.com';
    }
  }

  return {
    'Content-Type': 'application/json',
    'x-user-email': currentEmail,
    'x-user-role': currentRole,
    'x-admin-role': currentRole,
    ...extraHeaders,
  };
}"""

if old_headers in code:
    code = code.replace(old_headers, new_headers)
    with open('src/services/api.ts', 'w') as f:
        f.write(code)
    print("Patched getAdminHeaders")
else:
    print("Failed to find getAdminHeaders")
