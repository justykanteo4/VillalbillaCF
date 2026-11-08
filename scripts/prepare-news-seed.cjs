const fs=require('node:fs'),pack=JSON.parse(fs.readFileSync('assets/offline/club.clubdata','utf8')),news=pack.entries.find(e=>e.key==='/api/news')?.data;
if(!Array.isArray(news?.teams)||!news.teams.length)throw Error('Falta la copia pública de resultados');
fs.writeFileSync('news-seed.json',JSON.stringify(news));console.log('Resultados iniciales incluidos:',news.teams.length,'equipos.');
