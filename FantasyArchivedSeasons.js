import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {Button,ErrorText,panel,text,title,theme} from './FantasyUI';
export default function FantasyArchivedSeasons({leagueId,request}){
 const [archives,setArchives]=useState([]),[open,setOpen]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function load(active=()=>true){
  setLoading(true);setError('');
  try{const result=await request('/leagues/'+leagueId+'/seasons',{cache:'reload'});if(active())setArchives(result.archives||[])}
  catch(e){if(active())setError(e.message||'No se pudieron cargar las temporadas archivadas.')}
  finally{if(active())setLoading(false)}
 }
 useEffect(()=>{let live=true;setArchives([]);setOpen(null);load(()=>live);return()=>{live=false}},[leagueId]);
 if(!archives.length&&!error)return null;
 return <View style={panel}>
  <Text style={{...title,fontSize:20}}>Histórico oficial de temporadas</Text>
  <Text style={{...text,color:theme.muted}}>Clasificaciones archivadas por el Club; se conservan aunque la liga se reinicie.</Text>
  {archives.map(a=><View key={a.season} style={{gap:8,borderTopWidth:1,borderColor:theme.border,paddingTop:10}}>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:open===a.season}} onPress={()=>setOpen(open===a.season?null:a.season)}>
    <Text style={{...text,color:theme.accent,fontWeight:'900'}}>{a.season} {open===a.season?'−':'+'}</Text>
    <Text style={{...text,color:theme.muted,fontSize:12}}>Archivada el {new Date(a.closedAt).toLocaleDateString('es-ES')}</Text>
   </Pressable>
   {open===a.season&&<>
    {(a.standings||[]).map((row,i)=><View key={i} style={{flexDirection:'row',gap:8,paddingVertical:6,borderTopWidth:1,borderColor:theme.border}}>
     <Text style={{...text,color:theme.accent,minWidth:24}}>{row.rank}</Text>
     <Text style={{...text,flex:1}}>{row.nickname}</Text>
     <Text style={{...text,fontWeight:'900'}}>{row.points} pts</Text>
    </View>)}
    <Text style={{...text,color:theme.muted}}>{(a.rounds||[]).length} jornadas archivadas</Text>
   </>}
  </View>)}
  <ErrorText>{error}</ErrorText>
  <Button secondary disabled={loading} onPress={()=>load()}>{loading?'Actualizando…':'Actualizar históricos'}</Button>
 </View>;
}
