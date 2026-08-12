import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    code = f.read()

old_wipe_ui = """  // Wipe Old/Beta Test Users
  const [isWipingUsers, setIsWipingUsers] = useState(false);
  const handleWipeBetaUsers = async () => {
    if (!window.confirm('Wipe all old/beta users? This will clear out non-Master-Admin test accounts so new users can create clean accounts.')) return;
    setIsWipingUsers(true);
    const res = await wipeBetaUsersApi();
    setIsWipingUsers(false);
    if (res?.success) {
      setActionSuccessMsg(res.message || 'Wiped old/beta users successfully!');
      loadAdminData();
    } else {
      setGlobalError(res?.message || 'Failed to wipe beta users');
    }
  };"""

new_wipe_ui = """  // Wipe Old/Beta Test Users
  const [isWipingUsers, setIsWipingUsers] = useState(false);
  const handleWipeBetaUsers = async () => {
    // 1. Filter out users that would be wiped (i.e. those without Stripe IDs and not Master Admins)
    const vulnerableUsers = filteredUsers.filter(u => {
      const isMasterAdmin = u.email === 'onwaterservices@gmail.com' || u.email === 'vixyvault0@gmail.com';
      const hasStripe = Boolean(u.stripeCustomerId || u.stripeSubscriptionId);
      return !isMasterAdmin && !hasStripe;
    });

    if (vulnerableUsers.length === 0) {
      alert("No vulnerable test accounts found. (Active Stripe customers are protected).");
      return;
    }

    const confirmPhrase = `wipe ${vulnerableUsers.length}`;
    const userInput = window.prompt(`WARNING: You are about to permanently delete ${vulnerableUsers.length} beta/test user accounts.\\n\\nActive Stripe customers (e.g. Sarah Quant, Alex Trader, Allan Yahir) are PROTECTED and will not be deleted.\\n\\nType "${confirmPhrase}" to proceed:`);
    
    if (userInput !== confirmPhrase) {
      alert("Confirmation phrase did not match. Aborting wipe.");
      return;
    }

    setIsWipingUsers(true);
    
    // Pass the target IDs to the backend just in case, but our backend also verifies Stripe protections natively
    const targetUserIds = vulnerableUsers.map(u => u.id);
    
    try {
      const res = await fetch('/api/admin/users/wipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': typeof localStorage !== 'undefined' ? (localStorage.getItem('vixy_user_email') || 'onwaterservices@gmail.com') : '',
          'x-admin-role': 'OWNER',
        },
        body: JSON.stringify({ targetUserIds })
      });
      const data = await res.json();
      
      if (data?.success) {
        setActionSuccessMsg(data.message || 'Wiped old/beta users successfully!');
        loadAdminData();
      } else {
        setGlobalError(data?.message || 'Failed to wipe beta users');
      }
    } catch (e) {
      setGlobalError('Network error while wiping users');
    }
    
    setIsWipingUsers(false);
  };"""

if old_wipe_ui in code:
    code = code.replace(old_wipe_ui, new_wipe_ui)
    with open('src/components/AdminPanel.tsx', 'w') as f:
        f.write(code)
    print("Patched wipe ui in AdminPanel.tsx")
else:
    print("Failed to find wipe ui")

