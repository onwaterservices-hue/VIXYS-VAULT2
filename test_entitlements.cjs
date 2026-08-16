const { reconcileUserEntitlement } = require('./dist/server.cjs');

async function test() {
   const e = await reconcileUserEntitlement({ email: 'trelll2008@icloud.com' });
   console.log("TreLll Day Pass:", e.dayPass);
   
   const p = await reconcileUserEntitlement({ email: 'gifyzslide@gmail.com' });
   console.log("Gifyz Day Pass:", p.dayPass);
}

test();
