const {chromium}=require('playwright');
(async()=>{
 const url=process.env.SMOKE_URL||'https://villalbilla-cf.albaresfernandez.workers.dev/';
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[],responses=[];
 page.on('pageerror',e=>errors.push('EXCEPTION '+String(e.stack||e.message).slice(0,1000)));
 page.on('console',msg=>{if(msg.type()==='error')errors.push('CONSOLE '+msg.text().slice(0,600))});
 page.on('requestfailed',req=>errors.push('REQUEST '+req.url()+' '+req.failure()?.errorText));
 page.on('response',res=>{if(res.status()>=400)responses.push(res.status()+' '+res.url())});
 let status='';
 try{
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});status='HTTP '+response?.status();
  await page.waitForTimeout(11000);
  const state=await page.evaluate(()=>({text:(document.querySelector('#root')?.innerText||'').slice(0,600),html:document.querySelector('#root')?.innerHTML?.slice(0,200),scripts:[...document.scripts].map(s=>s.src).slice(0,7),title:document.title,ready:document.readyState}));
  console.log('WEB_SMOKE',JSON.stringify({url,status,state,errors:errors.slice(0,15),responses:responses.slice(0,15)}));
  await page.screenshot({path:'web-smoke.png',fullPage:true});
  if(!state.text?.trim()||errors.some(s=>s.startsWith('EXCEPTION')))throw Error('La web está en blanco o hay un error JavaScript');
 }finally{await browser.close()}
})().catch(e=>{console.error('WEB_SMOKE_FAILURE',e.message);process.exitCode=1});
