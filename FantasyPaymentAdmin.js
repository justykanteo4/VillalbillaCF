import React,{useEffect,useRef,useState} from 'react';
import {View,Text} from 'react-native';
import {Button,ErrorText,text,panel,title,theme,money} from './FantasyUI';
const date=w=>new Date((w*7-3)*86400000).toLocaleDateString('es-ES',{timeZone:'UTC'});
const status={paid:'Pagada','pending-results':'Resultados pendientes','pending-awards':'MVP pendientes','not-processed':'Sin liquidar'};
export default function FantasyPaymentAdmin({request}){
 const [data,setData]=useState(null),[id,setId]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function load(leagueId,force=false){if(lock.current)return;lock.current=true;setBusy(true);setError('');setConfirm(false);try{const result=await request('/admin/payments'+(!force&&leagueId?'?leagueId='+encodeURIComponent(leagueId):''),force?{method:'POST',body:JSON.stringify({leagueId,confirm:true})}:{cache:'reload'});setData(result)}catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}}
 useEffect(()=>{load('')},[]);
 return <View style={panel}><Text style={title}>Control de pagos</Text><Text style={text}>Selecciona una liga. El recálculo comprueba los resultados y MVP y utiliza los premios oficiales, sin duplicarlos.</Text>
 {(data?.leagues||[]).map(l=><Button key={l.id} secondary={id!==l.id} disabled={busy} onPress={()=>{setId(l.id);load(l.id)}}>{l.name} · {l.managers} participantes</Button>)}
 <Button secondary disabled={busy} onPress={()=>load(id)}>{busy?'Comprobando…':'Actualizar diagnóstico'}</Button><ErrorText>{error}</ErrorText>
 {data?.league?.id===id&&<><Text style={title}>{data.league.name}</Text>{data.errors.map(e=><ErrorText key={e}>{e}</ErrorText>)}{data.busy&&<Text style={text}>Liquidación automática en ejecución.</Text>}
 {data.outcome?.map(r=><Text key={r.kind} style={text}>{r.kind}: {r.state==='ok'?'Recálculo completado; consulta los abonos':r.state==='busy'?'Proceso ocupado; vuelve a comprobar':'Error de liquidación'}</Text>)}
 {data.rounds.map(r=><View key={r.week} style={panel}><Text style={{...text,fontWeight:'900'}}>Semana del {date(r.week)} · {status[r.status]||r.status}</Text>{r.blockers.map((b,i)=><Text key={i} style={{...text,color:theme.negative}}>{b.team} · {b.date} · Partido {b.matchId}: {b.reason}</Text>)}{r.ready&&r.status!=='paid'&&<Text style={text}>Lista para recalcular.</Text>}{data.prizes.filter(p=>p.week===r.week).map((p,i)=><Text key={i} style={text}>{p.position}. {p.team} · {p.points} pts · Premio {money(p.amount)} · Movimientos {money(p.credited)}</Text>)}</View>)}
 {!confirm?<Button disabled={busy||data.busy||data.errors.length>0} onPress={()=>setConfirm(true)}>Recalcular y forzar pagos pendientes</Button>:<><Text style={text}>Se recalcularán los premios oficiales de esta liga, incluidos ajustes por correcciones. No se saltan resultados o MVP pendientes.</Text><Button disabled={busy} onPress={()=>load(id,true)}>Confirmar recálculo y abono</Button><Button secondary onPress={()=>setConfirm(false)}>Cancelar</Button></>}
 <Text style={title}>Historial de movimientos</Text>{!data.history.length&&<Text style={text}>Sin movimientos de premios de jornada.</Text>}{data.history.map((h,i)=><Text key={i} style={text}>{h.team||'Participante'} · {date(h.week)} · {money(h.amount)} · {new Date(h.at).toLocaleString('es-ES')}</Text>)}</>}
 </View>
}
