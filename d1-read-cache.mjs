// Reuse identical reads only within one authenticated request. Never shared between accounts.
export function requestReadCache(db){if(!db)return db;const reads=new Map(),native=new WeakMap();let epoch=0;
 const clear=()=>{epoch++;reads.clear()};
 async function write(run){clear();try{return await run()}finally{clear()}}
 function statement(raw,sql,params=[]){const select=/^\s*SELECT\b/i.test(sql),wrapped={bind:(...values)=>statement(raw.bind(...values),sql,values),run:(...args)=>write(()=>raw.run(...args)),first:(...args)=>read('first',args),all:(...args)=>read('all',args)};
  function read(method,args){if(!select)return write(()=>raw[method](...args));const key=JSON.stringify([sql,params,method,args]);if(!reads.has(key)){if(reads.size>=128)clear();const version=epoch,job=Promise.resolve().then(()=>raw[method](...args));reads.set(key,job);job.catch(()=>{if(epoch===version&&reads.get(key)===job)reads.delete(key)})}return reads.get(key).then(value=>structuredClone(value))}
  native.set(wrapped,raw);return wrapped;
 }
 return {prepare:sql=>statement(db.prepare(sql),sql),batch:items=>write(()=>db.batch(items.map(item=>native.get(item)||item))),...(db.exec?{exec:sql=>write(()=>db.exec(sql))}:{})};
}
