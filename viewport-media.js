const listeners=new Set();let pending=false;
export function notifyViewport(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;for(const fn of listeners)fn()})}
export function watchViewport(fn){listeners.add(fn);return()=>listeners.delete(fn)}
