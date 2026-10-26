import runtime from './presentation-bundle.cjs';
import {preparePresentation} from './presentation-data.cjs';
const safeJson=value=>encodeURIComponent(JSON.stringify(value)).replace(/'/g,'%27');

export function makeLineupVideoHtml({players,title='Alineación',formation,autoRecord=false}){const data=safeJson({players:preparePresentation(players),title,formation,autoRecord});return `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body{margin:0;background:#071018;width:100%;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center}canvas{display:block;width:100%;height:100%;object-fit:contain}</style></head><body><canvas aria-label="Presentación de alineación" id="c" width="720" height="1280"></canvas><script>window.INITIAL_PRESENTATION=JSON.parse(decodeURIComponent('${data}'));${runtime}</script></body></html>`}
export async function saveLineupVideoInBrowser(data,filename='alineacion'){
 const raw=atob(data.base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const mime=data.mime==='video/mp4'?'video/mp4':'video/webm',blob=new Blob([bytes],{type:mime}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename+(mime==='video/mp4'?'.mp4':'.webm');document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
