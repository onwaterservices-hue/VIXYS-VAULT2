// RUNTIME TEST — Discord claim must FAIL CLOSED on every infrastructure failure.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Path resolved RELATIVE to this file. This previously hardcoded an absolute
// path to a DIFFERENT checkout (~/Downloads/VIXYS-VAULT2-main/server.ts), so the
// suite silently validated that stale copy instead of the working tree.
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'server.ts'), 'utf8');
const i = src.indexOf('async function claimBroadcastAtomically');
const j = src.indexOf('__name(claimBroadcastAtomically', i);
const fnSrc = src.slice(i, j);

let pass = 0, fail = 0;
const check = (label, cond, d='') => cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

async function run(env) {
  const base = {
    console: { log:()=>{}, warn:()=>{}, error:()=>{} },
    Date, Math, String, Boolean,
    BROADCAST_CLAIM_STALE_MS: 300000,
    __name: (f)=>f,
    db: null, runTransaction: null, doc: null,
    ...env,
  };
  const keys = Object.keys(base);
  const fn = new Function(...keys, `${fnSrc}; return claimBroadcastAtomically('CYCLE-X#FREE');`);
  return await fn(...keys.map(k=>base[k]));
}

console.log('== claim fail-closed invariants ==');
check('no db configured -> BLOCKED', (await run({ db: null })) === false);
check('missing cycleId -> BLOCKED', (await (async()=>{ const base={console:{log:()=>{},warn:()=>{},error:()=>{}},Date,Math,String,Boolean,BROADCAST_CLAIM_STALE_MS:300000,__name:(f)=>f,db:{},runTransaction:async()=>true,doc:()=>({})}; const keys=Object.keys(base); return new Function(...keys, fnSrc+'; return claimBroadcastAtomically(null);')(...keys.map(k=>base[k])); })()) === false);
check('transaction throws PERMISSION_DENIED -> BLOCKED',
  (await run({ db: {}, doc: ()=>({}), runTransaction: async()=>{ throw new Error('7 PERMISSION_DENIED: Missing or insufficient permissions.'); } })) === false);
check('transaction throws network error -> BLOCKED',
  (await run({ db: {}, doc: ()=>({}), runTransaction: async()=>{ throw new Error('UNAVAILABLE: connection reset'); } })) === false);
check('claim already SENT -> BLOCKED (idempotent)',
  (await run({ db: {}, doc: ()=>({}), runTransaction: async(db_, cb)=>cb({ get: async()=>({ exists:()=>true, data:()=>({ status:'SENT', claimedAt:new Date().toISOString() }) }), set:()=>{} }) })) === false);
check('fresh claim acquired -> ALLOWED',
  (await run({ db: {}, doc: ()=>({}), runTransaction: async(db_, cb)=>cb({ get: async()=>({ exists:()=>false }), set:()=>{} }) })) === true);
check('stale SENDING claim reclaimed -> ALLOWED',
  (await run({ db: {}, doc: ()=>({}), runTransaction: async(db_, cb)=>cb({ get: async()=>({ exists:()=>true, data:()=>({ status:'SENDING', claimedAt:new Date(Date.now()-10*60*1000).toISOString() }) }), set:()=>{} }) })) === true);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
