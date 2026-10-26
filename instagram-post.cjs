function instagramPostUrl(post){
 try{
  const url=new URL(post?.permalink);
  if(url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&['instagram.com','www.instagram.com'].includes(url.hostname)&&/^\/(?:p|reel|tv)\//.test(url.pathname))return url.href;
 }catch{/* Older saved publications may not contain a permalink. */}
 return 'https://www.instagram.com/villalbillacf/';
}
module.exports={instagramPostUrl};
