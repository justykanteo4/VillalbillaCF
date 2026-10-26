import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Image,Modal,Platform,Pressable,ScrollView,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LineupPresentation from './LineupPresentation';
import {api} from './api';
import {trackLocalSave} from './update-save-guard.cjs';
import {makeLineupVideoHtml,saveLineupVideoInBrowser} from './LineupVideo';
import {makeSystem,shortPlayerName} from './lineup-systems.cjs';
import SimulatorBoard from './SimulatorBoard';
import seed from './players-seed.json';
import teams from './teams.json';
import {getPlayerPhoto} from './player-photos';
const photoSource=photo=>typeof photo==='string'?{uri:photo}:photo;
const photoUri=photo=>typeof photo==='string'?photo:photo?.uri||(photo?Image.resolveAssetSource?.(photo)?.uri||null:null);

const ELEVEN={
  '4-3-3':[[50,90],[13,75],[38,75],[62,75],[87,75],[20,55],[50,59],[80,55],[17,29],[50,23],[83,29]],
  '4-4-2':[[50,90],[13,75],[38,75],[62,75],[87,75],[13,54],[38,54],[62,54],[87,54],[35,29],[65,29]],
  '4-2-3-1':[[50,90],[13,75],[38,75],[62,75],[87,75],[37,58],[63,58],[18,41],[50,39],[82,41],[50,22]],
};
const SEVEN={'2-3-1':[[50,90],[31,73],[69,73],[17,51],[50,55],[83,51],[50,27]],'3-2-1':[[50,90],[18,73],[50,76],[82,73],[35,52],[65,52],[50,27]]};
const colors={panel:'#151f2d',dark:'#0b121d',line:'#e2f0df',text:'#edf3fa',muted:'#aab8cb',blue:'#91adff',red:'#c52321',border:'#34475e'};
const defaultFormation=id=>String(teams.find(team=>team.id===id)?.gameType)==='2'?'2-3-1':'4-3-3';
const formationMap=isSeven=>isSeven?SEVEN:ELEVEN;
const pointOf=point=>Array.isArray(point)?{x:point[0],y:point[1]}:point;
const emptyPlan=teamId=>({id:'plan-default',name:'Alineación',formation:defaultFormation(teamId),starters:[],positions:{},playPositions:{}});
const shirtNumber=p=>{const n=parseInt(p.number,10);return Number.isFinite(n)?n:999};
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function playerPosition(player,manual){return manual[player.id]||player.position||''}
function positionRank(value){const v=normalized(value);if(/portero|guardameta/.test(v))return 0;if(/defens|central|lateral|carriler|libero/.test(v))return 1;if(/medio|medioc|centrocamp|mediapunta|pivote|interior|volante/.test(v))return 2;if(/delanter|extremo|punta|atacante/.test(v))return 3;return 4}

function PlayerBadge({player,photo,compact=false,alias}){
  const visibleName=alias||player.name;
  return <View style={[styles.badge,compact&&styles.badgeCompact]}>
    {photo?<Image source={photoSource(photo)} accessibilityLabel={'Foto de '+player.name} style={[styles.photo,compact&&styles.photoCompact]}/>:<View style={[styles.photo,styles.photoFallback,compact&&styles.photoCompact]}><Text style={styles.initial}>{(player.name||'?').trim().slice(0,1).toUpperCase()}</Text></View>}
    <View style={styles.numberBadge}><Text style={styles.numberText}>{player.number??'—'}</Text></View>
    <Text numberOfLines={compact?2:1} style={[styles.playerName,compact&&styles.playerNameCompact]}>{visibleName}</Text>
  </View>;
}

export default function LineupSimulator({teamId,players=[],lineups=[],onChange,sharedDetails=null}){
  const isSeven=String(teams.find(team=>team.id===teamId)?.gameType)==='2',maxPlayers=isSeven?7:11;
  const seeded=seed.teams.find(team=>team.id===teamId)?.players||[];
  const roster=useMemo(()=>{
    const merged=seeded.map(p=>{const live=players.find(row=>String(row.federationId||row.id)===String(p.id)||normalized(row.name)===normalized(p.name));return {...p,...(live||{}),id:String(p.id),name:live?.name||p.name,number:p.number??live?.number??null}});
    for(const p of players){const key=String(p.federationId||p.id);if(!merged.some(item=>item.id===key||normalized(item.name)===normalized(p.name)))merged.push({...p,id:key,number:p.number??null})}
    return merged;
  },[teamId,players]);
  const presentationRef=useRef(null),releasePresentation=useRef(null);
  const [videoProgress,setVideoProgress]=useState(''),[videoNotice,setVideoNotice]=useState(''),[presentationReady,setPresentationReady]=useState(false);
  useEffect(()=>()=>releasePresentation.current?.(),[]);
  const [newSystem,setNewSystem]=useState(''),[lineupView,setLineupView]=useState('3d'),[playView,setPlayView]=useState('2d');
  const [photos,setPhotos]=useState({}),[localPositions,setManualPositions]=useState({}),[localAliases,setAliases]=useState({}),[activeId,setActiveId]=useState(lineups[0]?.id||'plan-default'),[error,setError]=useState(''),[planPicker,setPlanPicker]=useState(false),[fullScreen,setFullScreen]=useState(false),[videoHtml,setVideoHtml]=useState(''),[videoBusy,setVideoBusy]=useState(false);
  const manualPositions=sharedDetails===null?localPositions:Object.fromEntries(Object.entries(sharedDetails).map(([id,p])=>[id,p.position||'']));
  const aliases=sharedDetails===null?localAliases:Object.fromEntries(Object.entries(sharedDetails).map(([id,p])=>[id,p.alias||'']));
  const [tacticalMode,setTacticalMode]=useState(false);
  const plans=lineups.length?lineups:[emptyPlan(teamId)],activePlan=plans.find(item=>item.id===activeId)||plans[0];
  const formations={...formationMap(isSeven)};for(const plan of plans)for(const name of Object.keys(plan.customSystems||{})){try{formations[name]=makeSystem(name,maxPlayers).slots}catch{}}
  const slots=formations[activePlan.formation]||Object.values(formations)[0],starters=activePlan.starters||[],placed=new Set(starters);
  const orderedRoster=useMemo(()=>roster.slice().sort((a,b)=>positionRank(playerPosition(a,manualPositions))-positionRank(playerPosition(b,manualPositions))||shirtNumber(a)-shirtNumber(b)||a.name.localeCompare(b.name,'es')),[roster,manualPositions]);
  const available=orderedRoster.filter(player=>!placed.has(player.id));
  const photoFor=playerId=>photos[playerId]||getPlayerPhoto(playerId);const displayName=player=>shortPlayerName(player,aliases[player.id]);

  useEffect(()=>{let active=true;setPhotos({});setManualPositions({});setAliases({});Promise.all([AsyncStorage.getItem('villalbilla.player-photos.'+teamId),AsyncStorage.getItem('villalbilla.manual-positions.'+teamId),AsyncStorage.getItem('villalbilla.player-aliases')]).then(([rawPhotos,rawPositions,rawAliases])=>{if(!active)return;if(rawPhotos)setPhotos(JSON.parse(rawPhotos));if(rawPositions)setManualPositions(JSON.parse(rawPositions));if(rawAliases)setAliases(JSON.parse(rawAliases))}).catch(()=>{if(active)setError('No se pudieron cargar las fotos, posiciones o alias guardados.')});return()=>{active=false}},[teamId]);

  function updatePlan(patch){const next=plans.map(item=>item.id===activePlan.id?{...item,...patch}:item);setError('');onChange?.(next)}
  function resetPlay(){updatePlan({playPositions:{}})}
  function addPlayer(player){if(starters.length>=maxPlayers){setError('El campo admite '+maxPlayers+' jugadores en esta modalidad.');return}const index=starters.length;updatePlan({starters:[...starters,player.id],positions:{...(activePlan.positions||{}),[player.id]:pointOf(slots[index]||[50,50])},playPositions:{}})}
  function autoFill(){const candidates=orderedRoster.slice().sort((a,b)=>positionRank(playerPosition(a,manualPositions))-positionRank(playerPosition(b,manualPositions))||shirtNumber(a)-shirtNumber(b));const selected=candidates.slice(0,maxPlayers),positions=Object.fromEntries(selected.map((p,index)=>[p.id,pointOf(slots[index])]));updatePlan({starters:selected.map(p=>p.id),positions,playPositions:{}})}
  function clearField(){updatePlan({starters:[],positions:{},playPositions:{}})}
  function changeFormation(value){const nextSlots=formations[value],positions=Object.fromEntries(starters.map((id,index)=>[id,pointOf(nextSlots[index]||slots[index]||[50,50])]));updatePlan({formation:value,positions,playPositions:{}})}
  function addSystem(){try{const system=makeSystem(newSystem,maxPlayers);const positions=Object.fromEntries(starters.map((id,index)=>[id,pointOf(system.slots[index]||[50,50])]));updatePlan({customSystems:{...(activePlan.customSystems||{}),[system.name]:true},formation:system.name,positions,playPositions:{}});setNewSystem('')}catch(e){setError(e.message)}}
  function addPlan(){const id='plan-'+Date.now().toString(36),next=[...plans,{id,name:'Alineación '+(plans.length+1),formation:defaultFormation(teamId),starters:[],positions:{},playPositions:{}}];setActiveId(id);setPlanPicker(false);setError('');onChange?.(next)}
  function removePlan(){if(plans.length<=1)return;const next=plans.filter(item=>item.id!==activePlan.id);setActiveId(next[0].id);onChange?.(next);setError('')}
  function exportLineup(){
    const placedPlayers=starters.map(id=>roster.find(player=>player.id===id)).filter(Boolean),filename=(activePlan.name||'alineacion').trim().replace(/[^a-z0-9]+/gi,'-').toLowerCase();
    if(Platform.OS==='web'&&typeof document!=='undefined'){
      const width=700,height=1000,escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
      const badges=placedPlayers.map(player=>{const p=pointOf((tacticalMode?activePlan.playPositions?.[player.id]:null)||activePlan.positions?.[player.id]||slots[starters.indexOf(player.id)]||[50,50]),x=p.x/100*width,y=p.y/100*height,name=escape(displayName(player)),number=escape(player.number??'—'),photo=photoUri(photoFor(player.id));return `<g transform="translate(${x},${y})"><circle r="36" fill="#14243a" stroke="#f5f4df" stroke-width="4"/>${photo?`<image href="${photo}" x="-30" y="-30" width="60" height="60" clip-path="url(#clip)" preserveAspectRatio="xMidYMid slice"/>`:`<text text-anchor="middle" y="8" fill="white" font-size="25" font-weight="700">${escape(name.charAt(0))}</text>`}<rect x="18" y="-40" width="32" height="23" rx="11" fill="#c52321"/><text x="34" y="-24" fill="white" text-anchor="middle" font-size="13" font-weight="700">${number}</text><text text-anchor="middle" y="53" fill="white" font-size="15" font-weight="700" stroke="#0b121d" stroke-width="3" paint-order="stroke">${name}</text></g>`}).join('');
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><clipPath id="clip" clipPathUnits="userSpaceOnUse"><circle cx="0" cy="0" r="30"/></clipPath></defs><rect width="100%" height="100%" rx="24" fill="#197348"/><rect x="20" y="20" width="660" height="960" fill="none" stroke="#e2f0df" stroke-width="4"/><path d="M20 500H680M20 130H680V20M20 870H680V980" fill="none" stroke="#e2f0df" stroke-width="4"/><circle cx="350" cy="500" r="100" fill="none" stroke="#e2f0df" stroke-width="4"/><circle cx="350" cy="500" r="5" fill="#e2f0df"/>${badges}<text x="350" y="995" text-anchor="middle" fill="white" font-size="17">${escape(activePlan.name||'Alineación')} · ${escape(activePlan.formation)}</text></svg>`;
      const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),anchor=document.createElement('a');anchor.href=url;anchor.download=(filename||'alineacion')+'.svg';anchor.click();URL.revokeObjectURL(url);return;
    }
    const message=[(activePlan.name||'Alineación')+' · '+activePlan.formation,...placedPlayers.map(player=>`${player.number??'—'} · ${displayName(player)} · ${playerPosition(player,manualPositions)||'Sin posición'}`)].join('\n');Share.share({title:'Alineación '+(activePlan.name||''),message}).catch(()=>setError('No se pudo compartir la alineación.'));
  }
  function protectPresentation(){releasePresentation.current?.();const hold=new Promise(resolve=>{releasePresentation.current=resolve});trackLocalSave('lineup-presentation',hold)}
  function finishPresentation(){releasePresentation.current?.();releasePresentation.current=null}
  function closePresentation(){setVideoHtml('');setVideoBusy(false);releasePresentation.current?.();releasePresentation.current=null}
  async function generateVideo(){
    if(!starters.length){setError('Coloca primero a los jugadores que quieras presentar.');return}
    setPresentationReady(false);setVideoBusy(true);setError('');setVideoNotice('');setVideoProgress('Preparando fotos y estadísticas…');
    protectPresentation();
    try{
      let stats=[];try{const result=await api('/api/players?team='+encodeURIComponent(teamId));stats=result.players||[]}catch{}
      const videoPlayers=await Promise.all(starters.map(async(id,index)=>{
        const player=roster.find(row=>row.id===id);if(!player)return null;
        const pt=pointOf(activePlan.positions?.[id]||slots[index]||[50,50]),official=stats.find(p=>String(p.id)===String(player.federationId||id))||player;
        let photo=photoFor(id);
        if(photo&&Platform.OS==='web'){try{const uri=photoUri(photo);if(uri?.startsWith('data:'))photo=uri;else if(uri){const response=await fetch(uri);if(!response.ok)throw Error('Foto no disponible');const blob=await response.blob();photo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})}else photo=null}catch{photo=null}}
        else if(photo){if(typeof photo==='string'&&photo.startsWith('data:image/')){}else{try{const {Asset}=require('expo-asset'),Manipulator=require('expo-image-manipulator');let uri=photo;if(typeof photo==='number'){const asset=Asset.fromModule(photo);await asset.downloadAsync();uri=asset.localUri||asset.uri}else if(typeof photo==='object')uri=photo.uri||photoUri(photo);const result=await Manipulator.manipulateAsync(uri,[{resize:{width:480}}],{compress:.8,format:Manipulator.SaveFormat.JPEG,base64:true});photo=result.base64?'data:image/jpeg;base64,'+result.base64:null}catch{photo=null}}}
        return {id,name:displayName(player),number:player.number??official.number,photo,x:pt.x,y:pt.y,goals:official.goals,yellow:official.yellow,red:official.red,played:official.played};
      }));
      setVideoHtml(makeLineupVideoHtml({players:videoPlayers.filter(Boolean),title:'Alineación',formation:activePlan.formation}));setVideoBusy(false);setVideoProgress('');
    }catch(err){closePresentation();setError(err?.message||'No se pudo preparar la presentación.')}
  }
  async function receiveVideoMessage(message){
    try{
      if(message.type==='ready'){setPresentationReady(true);return}
      if(message.type==='finished'){finishPresentation();return}
      if(message.type==='error')throw Error(message.message||'No se pudo crear el vídeo.');
      if(message.type==='progress'){if(videoBusy)setVideoProgress('Grabando jugador '+message.current+' de '+message.total);return}
      if(message.type==='recording'){setVideoBusy(true);setVideoProgress('Grabando presentación…');return}
      if(message.type!=='video')return;
      if(Platform.OS==='web')await saveLineupVideoInBrowser(message,'villalbilla-alineacion');
      else {const FileSystem=require('expo-file-system/legacy'),Sharing=require('expo-sharing'),extension=message.mime==='video/mp4'?'mp4':'webm',folder=FileSystem.documentDirectory+'alineaciones/',uri=folder+'villalbilla-'+Date.now()+'.'+extension;await FileSystem.makeDirectoryAsync(folder,{intermediates:true});await FileSystem.writeAsStringAsync(uri,message.base64,{encoding:FileSystem.EncodingType.Base64});if(!await Sharing.isAvailableAsync())throw Error('Vídeo guardado, pero no hay aplicaciones disponibles para compartirlo.');await Sharing.shareAsync(uri,{mimeType:message.mime,dialogTitle:'Compartir alineación · WhatsApp',UTI:message.mime==='video/mp4'?'public.mpeg-4':'public.movie'})}
      finishPresentation();setVideoBusy(false);setVideoProgress('');setVideoNotice(message.mime==='video/mp4'?'Vídeo MP4 listo para compartir.':'Vídeo WebM guardado. Este dispositivo no genera MP4; WhatsApp puede necesitar otro formato.');
    }catch(err){finishPresentation();setVideoBusy(false);setVideoProgress('');setError(err?.message||'No se pudo guardar o compartir el vídeo.');setVideoNotice(err?.message||'No se pudo guardar o compartir el vídeo.')}
  }
  useEffect(()=>{if(!videoBusy||!videoHtml)return;const timer=setTimeout(()=>{closePresentation();setError('La grabación ha tardado demasiado. Vuelve a abrir la presentación e inténtalo de nuevo.')},90000);return()=>clearTimeout(timer)},[videoBusy,videoHtml]);

  function pitch(full=false,tactics=false){
    const boardPlayers=starters.map((id,index)=>{const player=roster.find(p=>p.id===id);if(!player)return null;const pt=pointOf((tactics?activePlan.playPositions?.[id]:null)||activePlan.positions?.[id]||slots[index]||[50,50]);return {id,name:displayName(player),number:player.number,x:pt.x,y:pt.y}}).filter(Boolean);
    return <SimulatorBoard key={activePlan.id+'-'+tactics+'-'+full} full={full} tactical={tactics} initialView={tactics?playView:lineupView} onViewChange={tactics?setPlayView:setLineupView} players={boardPlayers} items={tactics?activePlan.playItems||[]:[]} onChange={({positions,items})=>updatePlan(tactics?{playPositions:positions,playItems:items}:{positions})}/>;
  }


  return <View style={styles.root}>
    <Text style={styles.title}>Simulador de alineación</Text>
    <View style={styles.modeRow}>{[['lineup','Alineación'],['plays','Jugadas']].map(([mode,label])=><Pressable key={mode} accessibilityRole="button" accessibilityState={{selected:tacticalMode===(mode==='plays')}} onPress={()=>{setTacticalMode(mode==='plays');setError('')}} style={[styles.modeButton,tacticalMode===(mode==='plays')&&styles.modeButtonActive]}><Text style={[styles.modeText,tacticalMode===(mode==='plays')&&styles.modeTextActive]}>{label}</Text></Pressable>)}</View>
    <Text style={styles.muted}>{tacticalMode?'Medio campo · Coloca jugadores y objetos con precisión, edita flechas y comprueba la jugada en 3D.':'Estadio 3D · Gira el campo y acerca la cámara. Activa «Mover jugadores» para colocar el once. Añade titulares desde la lista o completa la alineación.'}</Text>
    <View style={styles.planBar}><Pressable accessibilityRole="button" accessibilityLabel="Elegir alineación" onPress={()=>setPlanPicker(!planPicker)} style={styles.planSelect}><Text numberOfLines={1} style={styles.planSelectText}>⚽ Alineación {plans.indexOf(activePlan)+1}　⌄</Text></Pressable><Pressable accessibilityRole="button" onPress={addPlan} style={styles.action}><Text style={styles.actionText}>＋ Alineación</Text></Pressable></View>
    {planPicker&&<View style={styles.planList}>{plans.map((plan,index)=><Pressable key={plan.id} accessibilityRole="button" onPress={()=>{setActiveId(plan.id);setPlanPicker(false);setError('')}} style={[styles.planOption,plan.id===activePlan.id&&styles.planOptionActive]}><Text style={styles.planOptionText}>Alineación {index+1}</Text></Pressable>)}</View>}
    {!tacticalMode&&<View style={styles.formationRow}><Text style={styles.sectionTitle}>Sistema</Text>{Object.keys(formations).map(formation=><Pressable key={formation} accessibilityRole="button" accessibilityState={{selected:activePlan.formation===formation}} onPress={()=>changeFormation(formation)} style={[styles.formation,activePlan.formation===formation&&styles.formationActive]}><Text style={styles.formationText}>{formation}</Text></Pressable>)}</View>}
    {!tacticalMode&&<View style={{gap:8}}><TextInput accessibilityLabel="Nuevo sistema" value={newSystem} onChangeText={setNewSystem} placeholder={isSeven?'Nuevo sistema, p. ej. 2-2-2':'Nuevo sistema, p. ej. 3-5-2'} placeholderTextColor="#91a5be" style={styles.input}/><Pressable accessibilityRole="button" onPress={addSystem} style={styles.secondary}><Text style={styles.secondaryText}>Añadir sistema</Text></Pressable></View>}
    <View style={styles.counterRow}><Text style={styles.sectionTitle}>{tacticalMode?'Jugadores en la jugada':isSeven?'Siete inicial':'Once inicial'}</Text><Text style={styles.counter}>{starters.length} / {maxPlayers}</Text></View>
    <View style={{width:'100%'}}>{!fullScreen&&pitch(false,tacticalMode)}</View>
    {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!tacticalMode&&<Pressable accessibilityRole="button" disabled={videoBusy} onPress={generateVideo} style={styles.action}><Text style={styles.actionText}>{videoBusy?'Preparando presentación…':'▶ Presentación de alineación'}</Text></Pressable>}
    <View style={styles.toolbar}>{tacticalMode?<Pressable accessibilityRole="button" onPress={resetPlay} style={styles.action}><Text style={styles.actionText}>Restablecer posiciones</Text></Pressable>:<><Pressable accessibilityRole="button" onPress={autoFill} style={styles.action}><Text style={styles.actionText}>Completar alineación</Text></Pressable><Pressable accessibilityRole="button" onPress={exportLineup} style={styles.secondary}><Text style={styles.secondaryText}>⇧ Exportar</Text></Pressable><Pressable accessibilityRole="button" onPress={clearField} style={styles.secondary}><Text style={styles.secondaryText}>Vaciar campo</Text></Pressable>{plans.length>1&&<Pressable accessibilityRole="button" onPress={removePlan} style={styles.secondary}><Text style={styles.secondaryText}>Eliminar alineación</Text></Pressable>}</>}<Pressable accessibilityRole="button" onPress={()=>{setFullScreen(true)}} style={styles.secondary}><Text style={styles.secondaryText}>⛶ Pantalla completa · 2D / 3D</Text></Pressable></View>
    {!tacticalMode&&<><Text style={styles.sectionTitle}>Jugadores · por posición y dorsal</Text>
    {!available.length&&<Text style={styles.muted}>Todos los jugadores de la plantilla están en el campo.</Text>}
    <ScrollView style={styles.rosterList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
      {available.map((player,index)=>{const pos=playerPosition(player,manualPositions)||'Sin posición asignada',previous=index?playerPosition(available[index-1],manualPositions)||'Sin posición asignada':null;return <React.Fragment key={player.id}>{pos!==previous&&<Text style={styles.groupTitle}>{pos.toUpperCase()}</Text>}<View style={styles.rosterRow}><View style={styles.rosterContent}><PlayerBadge player={player} photo={photoFor(player.id)} compact alias={displayName(player)}/><View style={styles.playerMeta}><Text style={styles.metaText}>#{player.number??'—'} · {pos}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={'Colocar a '+player.name} onPress={()=>addPlayer(player)} style={styles.addButton}><Text style={styles.addButtonText}>Colocar</Text></Pressable></View></View></React.Fragment>})}
      {starters.map(id=>{const player=roster.find(row=>row.id===id);if(!player)return null;return <View key={id} style={[styles.rosterRow,styles.rosterChosen]}><View style={styles.rosterContent}><PlayerBadge player={player} photo={photoFor(id)} compact alias={displayName(player)}/><View style={styles.playerMeta}><Text style={styles.metaText}>#{player.number??'—'} · {playerPosition(player,manualPositions)||'Sin posición asignada'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={'Quitar a '+player.name+' del campo'} onPress={()=>{const next=starters.filter(item=>item!==id),positions={...(activePlan.positions||{})};delete positions[id];updatePlan({starters:next,positions,playPositions:{}})}} style={styles.removeButton}><Text style={styles.removeText}>Quitar</Text></Pressable></View></View>})}
    </ScrollView>
    <Text style={styles.footnote}>Las alineaciones se guardan para los entrenadores aprobados de este equipo.</Text></>}

    <Modal visible={fullScreen} animationType="slide" supportedOrientations={['portrait','landscape']} onRequestClose={()=>setFullScreen(false)}><View style={styles.fullScreen}>
      <View style={styles.fullHeader}><View style={{flex:1}}><Text style={styles.title}>{tacticalMode?'Jugada':'Alineación'} · {activePlan.formation}</Text><Text style={styles.muted}>{tacticalMode?'Pizarra precisa y previsualización 3D':activePlan.formation+' · cámara libre y jugadores con volumen'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Cerrar pantalla completa" onPress={()=>setFullScreen(false)} style={styles.closeButton}><Text style={styles.closeText}>✕</Text></Pressable></View>
      <View style={{flex:1,width:'100%'}}>{fullScreen&&pitch(true,tacticalMode)}</View>
      <View style={styles.fullBottom}><Pressable accessibilityRole="button" disabled={videoBusy} onPress={generateVideo} style={[styles.action,videoBusy&&styles.disabledAction]}><Text style={styles.actionText}>{videoBusy?'Preparando presentación…':'▶ Presentación de alineación'}</Text></Pressable><Pressable accessibilityRole="button" onPress={exportLineup} style={styles.secondary}><Text style={styles.secondaryText}>⇧ Exportar imagen</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setFullScreen(false)} style={styles.secondary}><Text style={styles.secondaryText}>Volver</Text></Pressable></View>
    </View></Modal>
    <Modal visible={!!videoHtml} animationType="slide" supportedOrientations={['portrait','landscape']} onRequestClose={closePresentation}><View style={styles.fullScreen}><View style={styles.fullHeader}><Text style={{...styles.title,flex:1}}>Presentación de alineación</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar presentación" onPress={closePresentation} style={styles.closeButton}><Text style={styles.closeText}>✕</Text></Pressable></View>{!!videoHtml&&<LineupPresentation ref={presentationRef} html={videoHtml} onMessage={receiveVideoMessage}/>}<Text style={styles.muted}>{videoProgress||videoNotice||(!presentationReady?'Cargando tarjetas…':'Fotos y datos disponibles de la temporada. «—» indica un dato no publicado.')}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><Pressable accessibilityRole="button" disabled={videoBusy||!presentationReady} onPress={()=>{protectPresentation();presentationRef.current?.command('replay')}} style={styles.secondary}><Text style={styles.secondaryText}>Repetir presentación</Text></Pressable><Pressable accessibilityRole="button" disabled={videoBusy||!presentationReady} onPress={()=>{protectPresentation();setVideoBusy(true);setVideoProgress('Preparando vídeo…');setVideoNotice('');presentationRef.current?.command('record')}} style={styles.action}><Text style={styles.actionText}>{videoBusy?'Generando vídeo…':'Descargar vídeo · WhatsApp'}</Text></Pressable></View></View></Modal>
  </View>;
}

const styles=StyleSheet.create({
  root:{gap:13,padding:16,borderRadius:20,borderWidth:1,borderColor:'#2c3e54',backgroundColor:colors.panel},
  modeRow:{flexDirection:'row',padding:4,borderRadius:12,backgroundColor:colors.dark,gap:5},
  modeButton:{flex:1,paddingVertical:10,alignItems:'center',borderRadius:9},
  modeButtonActive:{backgroundColor:'#263a66'},
  modeText:{fontSize:13,fontWeight:'800',color:colors.muted},
  modeTextActive:{color:colors.text},
  title:{fontSize:24,fontWeight:'800',color:colors.text},
  muted:{fontSize:13,lineHeight:20,color:colors.muted},
  planBar:{flexDirection:'row',gap:8},
  planSelect:{flex:1,justifyContent:'center',minHeight:42,paddingHorizontal:12,borderRadius:10,backgroundColor:'#101c2b',borderWidth:1,borderColor:colors.border},
  planSelectText:{color:colors.text,fontWeight:'700'},
  planList:{gap:6,padding:8,borderRadius:12,backgroundColor:colors.dark},
  planOption:{padding:10,borderRadius:8,backgroundColor:'#192a40'},
  planOptionActive:{backgroundColor:'#263a66'},
  planOptionText:{color:colors.text},
  action:{paddingHorizontal:12,paddingVertical:11,borderRadius:10,backgroundColor:'#1b2e69',alignItems:'center',justifyContent:'center'},
  actionText:{color:'#fff',fontSize:12,fontWeight:'800'},
  disabledAction:{opacity:.55},
  input:{minHeight:44,borderWidth:1,borderColor:colors.border,backgroundColor:'#101c2b',borderRadius:10,paddingHorizontal:12,color:colors.text},
  formationRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:7},
  sectionTitle:{color:colors.text,fontSize:15,fontWeight:'800'},
  formation:{paddingVertical:8,paddingHorizontal:11,borderRadius:9,backgroundColor:'#25364c'},
  formationActive:{backgroundColor:colors.red},
  formationText:{color:colors.text,fontSize:12,fontWeight:'800'},
  counterRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  counter:{color:colors.blue,fontSize:16,fontWeight:'900'},
  badge:{alignItems:'center',justifyContent:'center',width:86,minHeight:89,gap:2},
  badgeCompact:{width:56,minHeight:52,gap:1},
  photo:{width:48,height:48,borderRadius:25,borderWidth:2,borderColor:'#f4f5dd',backgroundColor:'#e7eee8'},
  photoCompact:{width:29,height:29,borderWidth:1.5},
  photoFallback:{alignItems:'center',justifyContent:'center',backgroundColor:'#dce6d4'},
  initial:{fontSize:18,fontWeight:'900',color:'#173a25'},
  numberBadge:{position:'absolute',top:0,right:4,minWidth:19,height:19,borderRadius:10,paddingHorizontal:4,alignItems:'center',justifyContent:'center',backgroundColor:'#c52321',borderWidth:1,borderColor:'#fff'},
  numberText:{fontSize:9,fontWeight:'900',color:'#fff'},
  playerName:{maxWidth:80,color:'#fff',fontSize:10,fontWeight:'900',textAlign:'center',textShadowColor:'#092417',textShadowOffset:{width:1,height:1},textShadowRadius:3},
  playerNameCompact:{maxWidth:56,fontSize:7,lineHeight:9},
  toolbar:{flexDirection:'row',flexWrap:'wrap',gap:7},
  secondary:{paddingHorizontal:11,paddingVertical:10,borderRadius:10,backgroundColor:'#25364c',alignItems:'center',justifyContent:'center'},
  secondaryText:{fontSize:12,fontWeight:'700',color:colors.text},
  error:{color:'#ffc1c9',backgroundColor:'#40202b',borderRadius:9,padding:10},
  rosterList:{maxHeight:350,flexGrow:0},
  rosterRow:{minHeight:56,paddingVertical:5,borderBottomWidth:1,borderColor:'#2d3e52'},
  rosterChosen:{opacity:0.85},
  rosterContent:{flexDirection:'row',alignItems:'center',gap:8},
  playerMeta:{flex:1},
  metaText:{color:colors.muted,fontSize:11},
  groupTitle:{paddingTop:12,paddingBottom:5,color:colors.blue,fontSize:11,fontWeight:'900',letterSpacing:1},
  addButton:{marginLeft:'auto',paddingHorizontal:12,paddingVertical:8,borderRadius:9,backgroundColor:'#25364c'},
  addButtonText:{fontSize:11,fontWeight:'800',color:'#fff'},
  removeButton:{marginLeft:'auto',paddingHorizontal:11,paddingVertical:8,borderRadius:10,backgroundColor:'#40202b'},
  removeText:{fontSize:11,fontWeight:'800',color:'#ffc1c9'},
  footnote:{fontSize:11,lineHeight:17,color:colors.muted},
  fullScreen:{flex:1,paddingTop:Platform.OS==='web'?14:42,paddingBottom:Platform.OS==='web'?14:24,paddingHorizontal:14,gap:8,backgroundColor:colors.dark},
  fullHeader:{flexDirection:'row',alignItems:'center',gap:12},
  closeButton:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',backgroundColor:'#25364c'},
  closeText:{color:'#fff',fontSize:19,fontWeight:'800'},
  fullBottom:{flexDirection:'row',justifyContent:'center',gap:8},
});
