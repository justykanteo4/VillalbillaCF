// Decorative football miniatures; never imply a player's skill or rating.
export function drawEmblem(X,kind,{x=-182,y=-34,scale=1}={}){
 X.save();X.translate(x,y);X.scale(scale,scale);
 const gradient=(x,y,a,b,stops)=>{const g=X.createLinearGradient(x,y,a,b);stops.forEach(([at,color])=>g.addColorStop(at,color));return g};
 const metal=gradient(-20,-25,22,27,[[0,'#fff4c8'],[.25,'#e7c76d'],[.5,'#9b6c22'],[.7,'#fce6a0'],[1,'#ad7d30']]);
 const polygon=r=>{X.beginPath();for(let i=0;i<6;i++){const a=Math.PI*i/3;i?X.lineTo(Math.cos(a)*r,Math.sin(a)*r):X.moveTo(Math.cos(a)*r,Math.sin(a)*r)}X.closePath()};
 X.shadowColor='#2c1c15aa';X.shadowBlur=4;X.shadowOffsetY=2;polygon(30);X.fillStyle=metal;X.fill();X.shadowBlur=0;X.shadowOffsetY=0;X.strokeStyle='#79551e';X.lineWidth=1.5;X.stroke();polygon(26);X.fillStyle=gradient(-20,-20,20,20,[[0,'#7c571f'],[.5,'#e2c078'],[1,'#a87931']]);X.fill();X.strokeStyle='#fff1bd';X.lineWidth=.8;X.stroke();
 X.lineCap='round';X.lineJoin='round';X.shadowColor='#36240eb0';X.shadowBlur=2;X.shadowOffsetY=1;
 const path=(points,fill,stroke='#6d4d24',width=1)=>{X.beginPath();points.forEach(([x,y],i)=>i?X.lineTo(x,y):X.moveTo(x,y));X.closePath();X.fillStyle=fill;X.fill();X.strokeStyle=stroke;X.lineWidth=width;X.stroke()};
 const light=gradient(-10,-18,13,18,[[0,'#fffce6'],[.4,'#eee6cb'],[1,'#a99875']]);
 if(kind===0){ // Ball: curved panel seams, shaded sphere and specular highlight.
  const g=X.createRadialGradient(-7,-9,1,2,3,19);g.addColorStop(0,'#fffef3');g.addColorStop(.55,'#ede9da');g.addColorStop(1,'#8d846f');X.fillStyle=g;X.beginPath();X.arc(0,0,18,0,Math.PI*2);X.fill();X.save();X.clip();
  X.strokeStyle='#6c675d';X.lineWidth=.7;for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5;X.beginPath();X.moveTo(Math.cos(a)*7,Math.sin(a)*7);X.quadraticCurveTo(Math.cos(a+.2)*13,Math.sin(a+.2)*13,Math.cos(a)*19,Math.sin(a)*19);X.stroke();const cx=Math.cos(a)*18,cy=Math.sin(a)*18;path(Array.from({length:5},(_,j)=>[cx+Math.cos(a+j*Math.PI*2/5)*6,cy+Math.sin(a+j*Math.PI*2/5)*6]),'#35332d','#585247',.6)}
  path(Array.from({length:5},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/5;return [Math.cos(a)*8,Math.sin(a)*8]}),gradient(-5,-8,8,8,[[0,'#514f46'],[1,'#171916']]),'#565145',.7);X.restore();
  X.shadowBlur=0;X.fillStyle='#ffffff60';X.beginPath();X.ellipse(-7,-10,5,2.5,-.6,0,Math.PI*2);X.fill();
 }else if(kind===1){ // Boot: stitched upper, laces, sole and studs.
  path([[-16,-15],[-6,-13],[-5,-5],[2,0],[15,5],[19,10],[16,14],[-17,14]],gradient(-12,-14,11,15,[[0,'#e8ddba'],[.35,'#807057'],[1,'#292d29']]));
  path([[-17,10],[18,10],[16,15],[-17,15]],'#d5b66d');for(const x of [-12,-4,10]){X.fillStyle='#574a34';X.fillRect(x,15,4,4)}
  X.shadowBlur=0;X.strokeStyle='#f9edcc';X.lineWidth=1.1;for(let i=0;i<4;i++){X.beginPath();X.moveTo(-7+i*3,-5+i*2);X.lineTo(-2+i*3,-7+i*2);X.stroke()}
  X.strokeStyle='#d4bd8b';X.lineWidth=.6;X.beginPath();X.moveTo(-14,-9);X.lineTo(-12,5);X.quadraticCurveTo(0,8,12,8);X.stroke();
 }else if(kind===2){ // Padded goalkeeper glove.
  path([[-10,18],[-13,5],[-19,-3],[-19,-8],[-15,-10],[-10,-4],[-11,-17],[-7,-20],[-4,-18],[-3,-9],[-2,-21],[2,-22],[5,-19],[5,-9],[7,-19],[11,-18],[13,-14],[11,-5],[15,-13],[19,-11],[19,-5],[13,10],[9,18]],light);
  X.shadowBlur=0;X.strokeStyle='#8c7c59';X.lineWidth=1;for(const x of [-6,1,8]){X.beginPath();X.moveTo(x,-7);X.lineTo(x+1,6);X.stroke()}path([[-10,11],[11,11],[9,19],[-9,19]],metal);X.strokeStyle='#fff5d4';X.beginPath();X.moveTo(-7,14);X.lineTo(7,14);X.stroke();
 }else if(kind===3){ // Trophy: curved bowl, handles, stem and pedestal.
  X.strokeStyle='#e8cc7d';X.lineWidth=3;for(const side of [-1,1]){X.beginPath();X.moveTo(side*10,-13);X.bezierCurveTo(side*25,-18,side*22,3,side*8,3);X.stroke()}
  X.beginPath();X.moveTo(-12,-17);X.lineTo(12,-17);X.quadraticCurveTo(12,3,3,7);X.lineTo(3,13);X.lineTo(10,16);X.lineTo(10,19);X.lineTo(-10,19);X.lineTo(-10,16);X.lineTo(-3,13);X.lineTo(-3,7);X.quadraticCurveTo(-12,3,-12,-17);X.closePath();X.fillStyle=metal;X.fill();X.strokeStyle='#79551e';X.lineWidth=.9;X.stroke();X.shadowBlur=0;X.strokeStyle='#fff7d6';X.lineWidth=1.5;X.beginPath();X.moveTo(-7,-13);X.quadraticCurveTo(-7,-1,-2,2);X.stroke();path([[-12,19],[12,19],[13,22],[-13,22]],'#403b2d');
 }else if(kind===5){ // Sprinting boot and motion.
  path([[-8,-15],[0,-15],[1,-3],[16,4],[18,12],[-8,12],[-12,5]],light);X.strokeStyle='#f5df9c';X.lineWidth=2;for(const y of [-10,-3,4]){X.beginPath();X.moveTo(-22,y);X.lineTo(-13,y);X.stroke()}
 }else if(kind===6||kind===13){ // Compass / playmaking network.
  X.strokeStyle='#fff0bc';X.lineWidth=1.5;X.beginPath();X.arc(0,0,17,0,Math.PI*2);X.stroke();const pts=kind===6?[[0,-18],[8,0],[0,18],[-8,0]]:[[-13,10],[0,-12],[14,8]];path(pts,metal);if(kind===13)for(const [x,y]of pts){X.fillStyle=light;X.beginPath();X.arc(x,y,4,0,Math.PI*2);X.fill()}
 }else if(kind===7||kind===11){ // Goal frame and net.
  X.strokeStyle='#f5e7c4';X.lineWidth=3;X.strokeRect(-18,-12,36,27);X.lineWidth=.65;for(let i=-12;i<18;i+=6){X.beginPath();X.moveTo(i,-12);X.lineTo(i,15);X.stroke()}for(let y=-6;y<15;y+=6){X.beginPath();X.moveTo(-18,y);X.lineTo(18,y);X.stroke()}if(kind===7){X.fillStyle=light;X.beginPath();X.arc(7,8,7,0,Math.PI*2);X.fill();path([[7,3],[11,6],[9,11],[4,11],[3,6]],'#403e33')}else{path([[-9,-4],[0,-8],[9,-4],[8,7],[0,16],[-8,7]],metal)}
 }else if(kind===8||kind===9){ // Actual card colours distinguish the discipline count.
  X.save();X.rotate(-.15);X.fillStyle=kind===8?gradient(-10,-17,12,17,[[0,'#fff2a1'],[.4,'#efc536'],[1,'#b78b0d']]):gradient(-10,-17,12,17,[[0,'#ffb0a2'],[.4,'#d4392e'],[1,'#8a1815']]);X.beginPath();X.roundRect(-12,-18,24,36,3);X.fill();X.strokeStyle='#fce9b6';X.lineWidth=.8;X.stroke();X.restore();
 }else if(kind===10){ // No cards in the available played matches.
  path([[-13,-16],[0,-20],[13,-16],[11,6],[0,19],[-11,6]],metal);X.strokeStyle='#fff6d8';X.lineWidth=4;X.beginPath();X.moveTo(-7,0);X.lineTo(-1,6);X.lineTo(9,-7);X.stroke();
 }else if(kind===12){ // Cross from the flank.
  X.strokeStyle='#f9edc8';X.lineWidth=2;X.beginPath();X.moveTo(-17,17);X.lineTo(-17,-14);X.quadraticCurveTo(8,-18,15,2);X.stroke();path([[8,-1],[17,6],[19,-5]],metal);X.fillStyle=light;X.beginPath();X.arc(-17,17,4,0,Math.PI*2);X.fill();
 }else{ // Embossed shield and laurel.
  for(const side of [-1,1]){X.strokeStyle='#eddaa0';X.lineWidth=1;X.beginPath();X.moveTo(side*5,19);X.quadraticCurveTo(side*24,6,side*17,-14);X.stroke();for(let i=0;i<4;i++){X.fillStyle=metal;X.beginPath();X.ellipse(side*(16-i),9-i*6,5,2.3,side*-.9,0,Math.PI*2);X.fill()}}
  X.beginPath();X.moveTo(-12,-16);X.quadraticCurveTo(0,-22,12,-16);X.lineTo(10,3);X.quadraticCurveTo(7,12,0,17);X.quadraticCurveTo(-7,12,-10,3);X.closePath();X.fillStyle=metal;X.fill();X.strokeStyle='#6e4e21';X.lineWidth=1;X.stroke();X.shadowBlur=0;path([[0,-12],[3,-5],[10,-5],[5,0],[7,8],[0,4],[-7,8],[-5,0],[-10,-5],[-3,-5]],'#f9e8ae');
 }
 X.restore();
}
