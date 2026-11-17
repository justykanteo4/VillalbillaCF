const ANGLE=35*Math.PI/180,DEPTH=900;
function project(point,height){const y=point.y/100-.5,k=height*Math.sin(ANGLE)/DEPTH,d=1-y*k;return {x:50+(point.x-50)/d,y:50+100*y*Math.cos(ANGLE)/d}}
function unproject(point,height){const v=(point.y-50)/100,k=height*Math.sin(ANGLE)/DEPTH,y=v/(Math.cos(ANGLE)+v*k),d=1-y*k;return {x:50+(point.x-50)*d,y:50+100*y}}
module.exports={project,unproject};
