const runtime=require('./roster-export-bundle.cjs');
function rosterHtml(data){const safe=encodeURIComponent(JSON.stringify(data)).replace(/'/g,'%27');return '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff"><script>window.ROSTER_EXPORT=JSON.parse(decodeURIComponent(\''+safe+'\'));'+runtime+'</script></body></html>'}
module.exports={rosterHtml};
