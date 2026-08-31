// mock Admin SDK
const store: any = { users: { u1:{email:'a@x.com'}, u2:{email:'b@x.com'} }, claims:{} };
function mkDocRef(coll:string, id:string):any {
  return { id, async get(){ const d=store[coll]?.[id]; return { id, exists: d!==undefined, data:()=>d, ref:this }; },
    async set(data:any,opts:any){ store[coll]=store[coll]||{}; store[coll][id]=opts?.merge?{...store[coll][id],...data}:data; },
    async delete(){ delete store[coll]?.[id]; }, collection(sub:string){ return mkCollRef(sub); } };
}
function mkCollRef(coll:string):any {
  const self:any={ id:coll, _wh:[] as any[], _lim:null as any, doc(id:string){ return mkDocRef(coll,id); },
    where(f:string,op:string,v:any){ const r=mkCollRef(coll); r._wh=[...self._wh,[f,op,v]]; r._lim=self._lim; return r; },
    limit(n:number){ const r=mkCollRef(coll); r._wh=self._wh; r._lim=n; return r; },
    async get(){ let rows=Object.entries(store[coll]||{}).map(([id,data])=>({id,data:data as any}));
      for(const [f,op,v] of self._wh) rows=rows.filter((r:any)=> op==='=='? r.data[f]===v:true);
      if(self._lim) rows=rows.slice(0,self._lim);
      const docs=rows.map((r:any)=>({id:r.id, exists:true, data:()=>r.data, ref:mkDocRef(coll,r.id)}));
      return { size:docs.length, empty:docs.length===0, docs, forEach:(cb:any)=>docs.forEach(cb) }; } };
  return self;
}
const adminDb:any = { collection:(n:string)=>mkCollRef(n),
  async runTransaction(fn:any){ return fn({ get:async(ref:any)=>ref.get(), set:(ref:any,d:any,o:any)=>ref.set(d,o),
    update:(ref:any,d:any)=>ref.set(d,{merge:true}), delete:(ref:any)=>ref.delete() }); },
  batch(){ const ops:any[]=[]; return { set:(r:any,d:any,o:any)=>ops.push(r.set(d,o)), update:(r:any,d:any)=>ops.push(r.set(d,{merge:true})),
    delete:(r:any)=>ops.push(r.delete()), commit:async()=>Promise.all(ops) }; } };
const _adminActive = !!adminDb;
// client fallbacks (unused in this test)
const _clientCollection:any=()=>{}, _clientDoc:any=()=>{}, _clientGetDocs:any=()=>{}, _clientSetDoc:any=()=>{},
  _clientGetDoc:any=()=>{}, _clientDeleteDoc:any=()=>{}, _clientWriteBatch:any=()=>{}, _clientQuery:any=()=>{},
  _clientLimit:any=()=>{}, _clientWhere:any=()=>{}, _clientRunTransaction:any=()=>{};

function _wrapDocSnap(s: any) {
  return { id: s.id, exists: () => s.exists, data: () => s.data(), ref: s.ref };
}
function _wrapQuerySnap(s: any) {
  const docs = s.docs.map(_wrapDocSnap);
  return {
    size: s.size,
    empty: s.empty,
    docs,
    forEach: (cb: (d: any) => void) => docs.forEach(cb),
  };
}

function collection(dbRef: any, name: string): any {
  return _adminActive ? adminDb.collection(name) : _clientCollection(dbRef, name);
}
function doc(dbRef: any, ...segments: string[]): any {
  if (!_adminActive) return (_clientDoc as any)(dbRef, ...segments);
  let ref: any = adminDb.collection(segments[0]).doc(segments[1]);
  for (let i = 2; i < segments.length; i += 2) {
    ref = ref.collection(segments[i]).doc(segments[i + 1]);
  }
  return ref;
}
function where(field: string, op: any, value: any): any {
  return _adminActive ? { __vixyWhere: [field, op, value] } : _clientWhere(field, op, value);
}
function limit(n: number): any {
  return _adminActive ? { __vixyLimit: n } : _clientLimit(n);
}
function query(collOrRef: any, ...constraints: any[]): any {
  if (!_adminActive) return (_clientQuery as any)(collOrRef, ...constraints);
  let q: any = collOrRef;
  for (const c of constraints) {
    if (c && c.__vixyWhere) q = q.where(c.__vixyWhere[0], c.__vixyWhere[1], c.__vixyWhere[2]);
    else if (c && typeof c.__vixyLimit === "number") q = q.limit(c.__vixyLimit);
  }
  return q;
}
async function getDocs(qOrColl: any): Promise<any> {
  if (!_adminActive) return (_clientGetDocs as any)(qOrColl);
  const snap = await qOrColl.get();
  return _wrapQuerySnap(snap);
}
async function getDoc(ref: any): Promise<any> {
  if (!_adminActive) return (_clientGetDoc as any)(ref);
  const snap = await ref.get();
  return _wrapDocSnap(snap);
}
async function setDoc(ref: any, data: any, options?: any): Promise<void> {
  if (!_adminActive) return (_clientSetDoc as any)(ref, data, options);
  await (options && options.merge ? ref.set(data, { merge: true }) : ref.set(data));
}
async function deleteDoc(ref: any): Promise<void> {
  if (!_adminActive) return (_clientDeleteDoc as any)(ref);
  await ref.delete();
}
function writeBatch(dbRef: any): any {
  if (!_adminActive) return (_clientWriteBatch as any)(dbRef);
  const b = adminDb.batch();
  return {
    set: (ref: any, data: any, options?: any) =>
      options && options.merge ? b.set(ref, data, { merge: true }) : b.set(ref, data),
    update: (ref: any, data: any) => b.update(ref, data),
    delete: (ref: any) => b.delete(ref),
    commit: () => b.commit(),
  };
}
async function runTransaction(dbRef: any, updateFn: (tx: any) => Promise<any>): Promise<any> {
  if (!_adminActive) return (_clientRunTransaction as any)(dbRef, updateFn);
  return adminDb.runTransaction(async (t: any) => {
    const wrappedTx = {
      get: async (ref: any) => _wrapDocSnap(await t.get(ref)),
      set: (ref: any, data: any, options?: any) =>
        options && options.merge ? t.set(ref, data, { merge: true }) : t.set(ref, data),
      update: (ref: any, data: any) => t.update(ref, data),
      delete: (ref: any) => t.delete(ref),
    };
    return updateFn(wrappedTx);
  });
}

let pass=0,fail=0; const ck=(l:string,c:boolean,d='')=>c?(pass++,console.log('  PASS',l)):(fail++,console.log('  FAIL',l,d));
(async()=>{
  const s1=await getDoc(doc(null,'users','u1')); ck('getDoc exists() method', typeof s1.exists==='function'&&s1.exists()===true); ck('getDoc data', s1.data().email==='a@x.com');
  const s2=await getDoc(doc(null,'users','nope')); ck('missing exists() false', s2.exists()===false);
  await setDoc(doc(null,'users','u3'),{email:'c@x.com'}); ck('setDoc create', store.users.u3.email==='c@x.com');
  await setDoc(doc(null,'users','u3'),{tier:'pro'},{merge:true}); ck('setDoc merge', store.users.u3.email==='c@x.com'&&store.users.u3.tier==='pro');
  const qs=await getDocs(collection(null,'users')); ck('getDocs size', qs.size===3,'='+qs.size); let c=0; qs.forEach(()=>c++); ck('getDocs forEach', c===3);
  const q=query(collection(null,'users'), where('email','==','b@x.com'), limit(1)); const qr=await getDocs(q);
  ck('query where+limit', qr.size===1&&qr.docs[0].data().email==='b@x.com','='+qr.size);
  const claimed=await runTransaction(null, async(tx:any)=>{ const s=await tx.get(doc(null,'claims','c1')); if(s.exists()) return false; tx.set(doc(null,'claims','c1'),{status:'SENDING'}); return true; });
  ck('tx first claim true', claimed===true&&store.claims.c1.status==='SENDING');
  const claimed2=await runTransaction(null, async(tx:any)=>{ const s=await tx.get(doc(null,'claims','c1')); return s.exists()?false:true; });
  ck('tx idempotent false', claimed2===false);
  const b=writeBatch(null); b.set(doc(null,'users','u4'),{email:'d@x.com'}); b.delete(doc(null,'users','u2')); await b.commit();
  ck('batch set+delete', store.users.u4?.email==='d@x.com'&&store.users.u2===undefined);
  console.log(`\n=== SHIM RESULT: ${pass} passed, ${fail} failed ===`); process.exit(fail?1:0);
})();
