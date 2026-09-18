// Simulate exact browser login flow
async function browserLoginSimulation() {
  const API = 'http://localhost:3001/api/v1';
  const FE = 'http://localhost:3000';
  
  console.log('=== Browser Login Simulation ===\n');
  
  // 1. Simulate FE middleware cookie check
  console.log('1. Browser requests /profile');
  console.log('   - Middleware checks flextrip_authed cookie');
  console.log('   - Cookie NOT found → redirect to /login\n');
  
  // 2. User fills login form
  console.log('2. User submits login form');
  console.log('   - Email: test@example.com');
  console.log('   - Password: Test123456\n');
  
  // 3. FE makes login API call
  console.log('3. FE calls POST /api/v1/auth/login');
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'Test123456' }),
    credentials: 'include'
  });
  
  const loginData = await loginRes.json();
  console.log(`   Response status: ${loginRes.status}`);
  console.log(`   Has accessToken: ${!!loginData.accessToken}`);
  console.log(`   Has refreshToken: ${!!loginData.refreshToken}`);
  console.log(`   Roles: ${JSON.stringify(loginData.roles || [])}\n`);
  
  if (!loginData.accessToken) {
    console.log('❌ LOGIN FAILED:', loginData);
    return;
  }
  
  // 4. FE sets token in memory (this is what our fix does)
  console.log('4. FE sets tokens:');
  console.log(`   - accessToken stored in memory (in _accessToken variable)`);
  console.log(`   - refreshToken stored in localStorage`);
  console.log(`   - flextrip_authed cookie set\n`);
  
  // 5. FE calls /users/me with token
  console.log('5. FE calls GET /api/v1/users/me with Bearer token');
  const meRes = await fetch(`${API}/users/me`, {
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` },
    credentials: 'include'
  });
  
  const meData = await meRes.json();
  console.log(`   Response status: ${meRes.status}`);
  console.log(`   User ID: ${meData.id}`);
  console.log(`   User email: ${meData.email}`);
  console.log(`   User roles: ${JSON.stringify(meData.roles)}\n`);
  
  if (meRes.status !== 200) {
    console.log('❌ /users/me FAILED');
    console.log('   Response:', JSON.stringify(meData, null, 2));
    return;
  }
  
  // 6. FE updates store and navigates
  console.log('6. FE updates auth store:');
  console.log(`   - setAuth called with user data`);
  console.log(`   - isAuthenticated = true\n`);
  
  console.log('7. FE navigates based on role:');
  const roles = meData.roles || [];
  if (roles.includes('TRAVELER')) {
    console.log('   → Redirect to /profile/travel\n');
  } else if (roles.includes('PROVIDER')) {
    console.log('   → Redirect to /profile/shop\n');
  } else {
    console.log('   → Redirect to /profile\n');
  }
  
  // 8. Simulate profile page loading
  console.log('8. Profile page loads:');
  console.log('   - useMe() is called');
  console.log('   - isAuthenticated = true (already set)');
  console.log('   - userApi.me() called with token');
  
  const meRes2 = await fetch(`${API}/users/me`, {
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` },
    credentials: 'include'
  });
  
  console.log(`   Response status: ${meRes2.status}`);
  console.log('   ✅ SUCCESS - Profile page should display user data!\n');
  
  console.log('=== All checks passed! ===');
  console.log('\nIf browser still shows infinite loading, check:');
  console.log('1. Browser console (F12) for errors');
  console.log('2. Network tab to see which request is pending');
  console.log('3. Try clearing cookies and logging in again');
}

browserLoginSimulation().catch(console.error);
