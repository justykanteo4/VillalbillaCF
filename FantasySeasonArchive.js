import React,{useRef,useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import {Button,ErrorText,panel,text,title,theme} from './FantasyUI';
const currentSeason=()=>{const now=new Date(),y=now.getFullYear(),start=now.getMonth()>=7?y:y-1;return start+'/'+String(start+1).slice(-2)};
export default function FantasySeasonArchive({request}){
 const [open,setOpen]=useState(false),[leagues,setLeagues]=useState([]),[selected,setSelected]=useState(null);
 const [season,setSeason]=useState(currentSeason),[confirmation,setConfirmation]=useState('');
 const [history,setHistory]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false);
 async function loadLeagues(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const data=await request('/admin/leagues/reset',{cache:'reload'});setLeagues(data.leagues||[]);setOpen(true)}
  catch(e){setError(e.message||'No se pudieron consultar las ligas.')}finally{lock.current=false;setBusy(false)}
 }
 async function choose(league){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');setConfirmation('');setSelected(league);
  try{const result=await request('/admin/leagues/'+league.id+'/seasons',{cache:'reload'});setHistory(result.archives||[])}
  catch(e){setError(e.message||'No se pudieron consultar las temporadas.')}finally{lock.current=false;setBusy(false)}
 }
 async function close(){
  if(lock.current||!selected||confirmation!=='CERRAR '+season)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   const result=await request('/admin/leagues/'+selected.id+'/seasons',{method:'POST',body:JSON.stringify({season,confirmation})});
   if(result.saved!==true)throw Error('No se confirmó el archivo.');
   const data=await request('/admin/leagues/'+selected.id+'/seasons',{cache:'reload'});
   setHistory(data.archives||[]);setConfirmation('');
   setNotice(result.alreadyClosed?'Esta temporada ya estaba archivada.':'Temporada archivada. Su clasificación se conserva aunque reinicies la liga después.');
  }catch(e){setError(e.message||'No se pudo cerrar la temporada.')}
  finally{lock.current=false;setBusy(false)}
 }
 return <View style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:19}}>Club · Historial de temporadas</Text>
  <Text style={text}>Archiva los puntos y las jornadas antes de iniciar otra temporada. Las clasificaciones archivadas no se sobrescriben ni se borran al reiniciar una liga.</Text>
  <Button secondary disabled={busy} onPress={()=>open?setOpen(false):loadLeagues()}>{open?'Ocultar temporadas':'Gestionar temporadas'}</Button>
  {open&&<>
   {leagues.map(league=><Button key={league.id} secondary disabled={busy} onPress={()=>choose(league)}>{selected?.id===league.id?'● ':''}{league.name}</Button>)}
   {selected&&<>
    <Text style={{...title,fontSize:16}}>Liga: {selected.name}</Text>
    {!!history.length&&<Text style={text}>Temporadas archivadas: {history.map(h=>h.season).join(', ')}</Text>}
    <Text style={text}>Temporada que quieres cerrar (por ejemplo, 2026/27)</Text>
    <TextInput accessibilityLabel="Temporada a archivar" value={season} editable={!busy} onChangeText={value=>{setSeason(value);setConfirmation('')}} style={{padding:12,backgroundColor:theme.header,color:theme.text,borderColor:theme.border,borderWidth:1,borderRadius:10}}/>
    <Text style={{...text,color:theme.muted}}>Comprueba antes que estén todas las actas. Se guardará una copia permanente de la clasificación y las jornadas, sin reiniciar jugadores ni presupuestos.</Text>
    <Text style={text}>Para confirmar, escribe exactamente CERRAR {season}</Text>
    <TextInput accessibilityLabel="Confirmación de cierre de temporada" value={confirmation} editable={!busy} onChangeText={setConfirmation} style={{padding:12,backgroundColor:theme.header,color:theme.text,borderColor:theme.border,borderWidth:1,borderRadius:10}}/>
    <Button disabled={busy||confirmation!=='CERRAR '+season} onPress={close}>{busy?'Archivando…':'Guardar histórico de la temporada'}</Button>
    <Text style={{...text,color:theme.muted}}>Después podrás usar «Reinicio de ligas de prueba» para preparar una temporada nueva. Este archivo se mantendrá.</Text>
   </>}
  </>}
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </View>;
}
