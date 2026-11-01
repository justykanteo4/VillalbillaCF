// Retained only to retire previously deployed Durable Objects without deleting history.
export class ChatRoom {
 constructor(ctx){this.ctx=ctx}
 close(){for(const socket of this.ctx.getWebSockets())try{socket.close(1001,'El chat se ha eliminado')}catch{}}
 fetch(){this.close();return new Response('El chat se ha eliminado.',{status:410})}
 alarm(){this.close()}
 webSocketMessage(){this.close()}
 webSocketClose(){this.close()}
 webSocketError(){this.close()}
}
