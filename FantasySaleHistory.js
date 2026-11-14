import React,{useEffect,useState} from 'react';
import {View,Text} from 'react-native';
import PlayerPortrait from './PlayerPortrait';
import {Button,ErrorText,text,panel,title,theme} from './FantasyUI';
const money=value=>Number(value).toLocaleString('es-ES',{maximumFractionDigits:2})+' M';
export default function FantasySaleHistory({leagueId,request,revision}){
 const [record,setRecord]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[loading,setLoading]=useState(false);
 const data=record?.leagueId===leagueId?record.data:null;
 useEffect(()=>{let active=true;setError('');setLoading(true);const apply=data=>{if(active)setRecord({leagueId,data})};request('/leagues/'+leagueId+'/transactions',{cache:'reload',onCached:apply}).then(apply).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[leagueId,revision,retry]);
 const sales=(data?.transactions||[]).filter(t=>t.kind==='sale'||t.id.startsWith('sale-')||t.id.startsWith('trade-')&&t.amount>0);
 return <View style={panel}><Text style={title}>Ventas realizadas</Text>{sales.map(sale=><View key={sale.id} style={{gap:10,paddingVertical:14,borderTopWidth:1,borderColor:theme.border}}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}>{sale.playerId&&<PlayerPortrait playerId={sale.playerId} name={sale.playerName} teamId={sale.teamId} size={58}/>}<View style={{flex:1,gap:5}}><Text style={{...text,fontWeight:'900'}}>{sale.playerName||sale.label}</Text><Text style={{...text,color:theme.accent,fontWeight:'900'}}>+{money(sale.amount)}</Text></View></View><Text style={{...text,fontSize:13,color:theme.muted}}>{new Date(sale.at).toLocaleString('es-ES')} · {sale.destination||'Venta completada'}</Text>{Number.isFinite(sale.marketValue)&&<Text style={text}>Valor de mercado al vender: {money(sale.marketValue)}</Text>}<Text style={text}>Saldo tras la operación: {money(sale.balance)}</Text><Text selectable style={{...text,fontSize:11,color:theme.muted}}>Referencia: {sale.id}</Text></View>)}{!data&&loading&&<Text style={text}>Cargando ventas…</Text>}{data&&!sales.length&&<Text style={text}>Todavía no has vendido jugadores en esta liga.</Text>}<ErrorText>{error}</ErrorText><Button secondary disabled={loading} onPress={()=>setRetry(n=>n+1)}>{loading?'Actualizando ventas…':'Actualizar ventas'}</Button></View>;
}
