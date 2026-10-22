import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,PanResponder,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import seed from './players-seed.json';
import teams from './teams.json';

const ELEVEN={
  '4-3-3':[[50,90],[13,75],[38,75],[62,75],[87,75],[20,55],[50,59],[80,55],[17,29],[50,23],[83,29]],
  '4-4-2':[[50,90],[13,75],[38,75],[62,75],[87,75],[13,54],[38,54],[62,54],[87,54],[35,29],[65,29]],
  '4-2-3-1':[[50,90],[13,75],[38,75],[62,75],[87,75],[37,58],[63,58],[18,41],[50,39],[82,41],[50,22]],
};
const SEVEN={
  '2-3-1':[[50,90],[31,73],[69,73],[17,51],[50,55],[83,51],[50,27]],
  '3-2-1':[[50,90],[18,73],[50,76],[82,73],[35,52],[65,52],[50,27]],
};
const colors={panel:'#151f2d',dark:'#0b121d',line:'#d9eee0',text:'#edf3fa',muted:'#aab8cb',blue:'#91adff',red:'#c52321',border:'#34475e'};
const defaultFormation=id=>String(teams.find(team=>team.id===id)?.gameType)==='2'?'2-3-1':'4-3-3';
const formationMap=isSeven=>isSeven?SEVEN:ELEVEN;
const slotPoint=point=>Array.isArray(point)?{x:point[0],y:point[1]}:point;
const emptyPlan=(teamId)=>({id:'plan-default',name:'Nuevo partido',formation:defaultFormation(teamId),starters:[],positions:{}});
const shirtNumber=p=>{const n=parseInt(p.number,10);return Number.isFinite(n)?n:999};
function normalized(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')}

function PlayerBadge({player,photo,compact=false}){
  return <View style={[styles.badge,compact&&styles.badgeCompact]}>
    {photo?<Animated.Image source={{uri:photo}} accessibilityLabel={'Foto de '+player.name} style={[styles.photo,compact&&styles.photoCompact]}/>:<View style={[styles.photo,styles.photoFallback,compact&&styles.photoCompact]}><Text style={styles.initial}>{(player.name||'?').trim().slice(0,1).toUpperCase()}</Text></View>}
    <View style={styles.numberBadge}><Text style={styles.numberText}>{player.number??'—'}</Text></View>
    <Text numberOfLines={compact?2:1} style={[styles.playerName,compact&&styles.playerNameCompact]}>{player.name}</Text>
  </View>;
}

function DraggablePlayer({player,photo,onDrop,children,style,compact=false}){
  const drag=useRef(new Animated.ValueXY()).current;
  const dropRef=useRef(onDrop);dropRef.current=onDrop;
  const pan=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)+Math.abs(g.dy)>8,
    onPanResponderGrant:()=>drag.setOffset({x:drag.x._value,y:drag.y._value}),
    onPanResponderMove:Animated.event([null,{dx:drag.x,dy:drag.y}],{useNativeDriver:false}),
    onPanResponderRelease:(_,g)=>{drag.flattenOffset();dropRef.current?.(player,g.moveX,g.moveY);Animated.spring(drag,{toValue:{x:0,y:0},useNativeDriver:true,speed:24,bounciness:3}).start()},
    onPanResponderTerminate:()=>{drag.flattenOffset();Animated.spring(drag,{toValue:{x:0,y:0},useNativeDriver:true}).start()},
  }),[drag,player]);
  return <Animated.View {...pan.panHandlers} style={[style,{transform:[{translateX:drag.x},{translateY:drag.y}]}]}>
    {children||<PlayerBadge player={player} photo={photo} compact={compact}/>}
  </Animated.View>;
}

export default function LineupSimulator({teamId,players=[],lineups=[],onChange}){
  const isSeven=String(teams.find(team=>team.id===teamId)?.gameType)==='2';
  const formations=formationMap(isSeven),maxPlayers=isSeven?7:11;
  const seeded=seed.teams.find(team=>team.id===teamId)?.players||[];
  const roster=useMemo(()=>{
    const merged=seeded.map(p=>{
      const live=players.find(row=>String(row.federationId||row.id)===String(p.id)||normalized(row.name)===normalized(p.name));
      return {...p,...(live||{}),id:String(p.id),name:live?.name||p.name,number:p.number??live?.number??null};
    });
    for(const p of players){const key=String(p.federationId||p.id);if(!merged.some(item=>item.id===key||normalized(item.name)===normalized(p.name)))merged.push({...p,id:key,number:p.number??null})}
    return merged.sort((a,b)=>shirtNumber(a)-shirtNumber(b)||a.name.localeCompare(b.name,'es'));
  },[teamId,players]);
  const [photos,setPhotos]=useState({}),[activeId,setActiveId]=useState(lineups[0]?.id||'plan-default'),[layout,setLayout]=useState(null),[error,setError]=useState(''),[picker,setPicker]=useState(false);
  const fieldRef=useRef(null),fieldRect=useRef(null);
  const plans=lineups.length?lineups:[emptyPlan(teamId)];
  const activePlan=plans.find(item=>item.id===activeId)||plans[0];
  const slots=formations[activePlan.formation]||Object.values(formations)[0];
  const placed=new Set(activePlan.starters||[]);
  const available=roster.filter(p=>!placed.has(p.id));

  useEffect(()=>{let active=true;setPhotos({});AsyncStorage.getItem('villalbilla.player-photos.'+teamId).then(raw=>{if(active&&raw)setPhotos(JSON.parse(raw))}).catch(()=>{if(active)setError('No se pudieron cargar las fotos guardadas.')});return()=>{active=false}},[teamId]);
  useEffect(()=>{fieldRef.current?.measureInWindow((x,y,width,height)=>{if(width&&height)fieldRect.current={x,y,width,height}})},[layout,teamId]);

  function updatePlan(patch){
    const base=plans;
    const next=base.map(item=>item.id===activePlan.id?{...item,...patch}:item);
    setError('');onChange?.(next);
  }
  function receiveDrop(player,screenX,screenY){
    const rect=fieldRect.current;if(!rect)return;
    const inside=screenX>=rect.x&&screenX<=rect.x+rect.width&&screenY>=rect.y&&screenY<=rect.y+rect.height;
    let starters=[...(activePlan.starters||[])],positions={...(activePlan.positions||{})};
    if(inside){
      if(!starters.includes(player.id)&&starters.length>=maxPlayers){setError('El campo admite '+maxPlayers+' jugadores en esta modalidad.');return}
      if(!starters.includes(player.id))starters.push(player.id);
      positions[player.id]={x:Math.max(7,Math.min(93,((screenX-rect.x)/rect.width)*100)),y:Math.max(8,Math.min(92,((screenY-rect.y)/rect.height)*100))};
    }else if(starters.includes(player.id)){
      starters=starters.filter(id=>id!==player.id);delete positions[player.id];
    }else return;
    updatePlan({starters,positions});
  }
  function addPlayer(player){
    if((activePlan.starters||[]).length>=maxPlayers){setError('El campo admite '+maxPlayers+' jugadores en esta modalidad.');return}
    const index=(activePlan.starters||[]).length;
    updatePlan({starters:[...(activePlan.starters||[]),player.id],positions:{...(activePlan.positions||{}),[player.id]:slotPoint(slots[index]||[50,50])}});
  }
  function autoFill(){
    const candidates=[...roster].sort((a,b)=>((/portero/i.test(a.position||'')?0:1)-(/portero/i.test(b.position||'')?0:1))||shirtNumber(a)-shirtNumber(b));
    const starters=candidates.slice(0,maxPlayers).map(p=>p.id);
    const positions=Object.fromEntries(starters.map((id,index)=>[id,slotPoint(slots[index])]));
    updatePlan({starters,positions});
  }
  function clearField(){updatePlan({starters:[],positions:{}})}
  function changeFormation(value){
    const nextSlots=formations[value],starters=activePlan.starters||[];
    const positions=Object.fromEntries(starters.map((id,index)=>[id,slotPoint(nextSlots[index]||slots[index]||[50,50])]));
    updatePlan({formation:value,positions});
  }
  function addPlan(){
    const id='plan-'+Date.now().toString(36),next=[...plans,{id,name:'Partido '+(plans.length+1),formation:defaultFormation(teamId),starters:[],positions:{}}];
    setActiveId(id);setPicker(false);setError('');onChange?.(next);
  }
  function renamePlan(name){updatePlan({name})}
  function removePlan(){
    if(plans.length<=1)return;
    const next=plans.filter(item=>item.id!==activePlan.id);setActiveId(next[0].id);onChange?.(next);setError('');
  }

  return <View style={styles.root}>
    <Text style={styles.title}>Simulador de alineación</Text>
    <Text style={styles.muted}>Organiza el once inicial de cada partido. Arrastra las fichas al campo y muévelas a la posición que quieras. Se guarda con el vestuario del equipo.</Text>
    <View style={styles.planBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Elegir alineación" onPress={()=>setPicker(!picker)} style={styles.planSelect}><Text numberOfLines={1} style={styles.planSelectText}>⚽ {activePlan.name||'Partido'}　⌄</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={addPlan} style={styles.action}><Text style={styles.actionText}>＋ Partido</Text></Pressable>
    </View>
    {picker&&<View style={styles.planList}>{plans.map(plan=><Pressable key={plan.id} accessibilityRole="button" onPress={()=>{setActiveId(plan.id);setPicker(false);setError('')}} style={[styles.planOption,plan.id===activePlan.id&&styles.planOptionActive]}><Text style={styles.planOptionText}>{plan.name||'Partido'}</Text></Pressable>)}</View>}
    <TextInput accessibilityLabel="Nombre del partido" value={activePlan.name||''} onChangeText={renamePlan} placeholder="Rival o nombre del partido" placeholderTextColor="#91a5be" style={styles.input}/>
    <View style={styles.formationRow}><Text style={styles.sectionTitle}>Sistema</Text>{Object.keys(formations).map(formation=><Pressable key={formation} accessibilityRole="button" accessibilityState={{selected:activePlan.formation===formation}} onPress={()=>changeFormation(formation)} style={[styles.formation,activePlan.formation===formation&&styles.formationActive]}><Text style={styles.formationText}>{formation}</Text></Pressable>)}</View>
    <View style={styles.counterRow}><Text style={styles.sectionTitle}>{isSeven?'Siete inicial':'Once inicial'}</Text><Text style={styles.counter}>{activePlan.starters?.length||0} / {maxPlayers}</Text></View>
    <View ref={fieldRef} collapsable={false} onLayout={event=>setLayout(event.nativeEvent.layout)} style={styles.field}>
      <View pointerEvents="none" style={styles.fieldBorder}/>
      <View pointerEvents="none" style={styles.halfLine}/><View pointerEvents="none" style={styles.centerCircle}/><View pointerEvents="none" style={styles.centerSpot}/>
      <View pointerEvents="none" style={[styles.box,styles.topBox]}/><View pointerEvents="none" style={[styles.smallBox,styles.topSmallBox]}/><View pointerEvents="none" style={[styles.box,styles.bottomBox]}/><View pointerEvents="none" style={[styles.smallBox,styles.bottomSmallBox]}/>
      {slots.map(([x,y],i)=><View pointerEvents="none" key={i} style={[styles.targetDot,{left:x+'%',top:y+'%'}]}/>)}
      {(activePlan.starters||[]).map(id=>{
        const player=roster.find(row=>row.id===id);if(!player)return null;
        const point=slotPoint(activePlan.positions?.[id]||slots[(activePlan.starters||[]).indexOf(id)]||[50,50]);
        return <DraggablePlayer key={id} player={player} photo={photos[id]} onDrop={receiveDrop} compact style={[styles.fieldPlayer,{left:point.x+'%',top:point.y+'%'}]}><PlayerBadge player={player} photo={photos[id]} compact/></DraggablePlayer>;
      })}
      {!activePlan.starters?.length&&<View pointerEvents="none" style={styles.fieldHint}><Text style={styles.hintTitle}>Arrastra aquí a tus jugadores</Text><Text style={styles.hintText}>También puedes usar «Colocar» en la lista</Text></View>}
    </View>
    {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <View style={styles.toolbar}><Pressable accessibilityRole="button" onPress={autoFill} style={styles.action}><Text style={styles.actionText}>Completar por dorsal</Text></Pressable><Pressable accessibilityRole="button" onPress={clearField} style={styles.secondary}><Text style={styles.secondaryText}>Vaciar campo</Text></Pressable>{plans.length>1&&<Pressable accessibilityRole="button" onPress={removePlan} style={styles.secondary}><Text style={styles.secondaryText}>Eliminar partido</Text></Pressable>}</View>
    <Text style={styles.sectionTitle}>Plantilla · arrastra o coloca</Text>
    {!available.length&&<Text style={styles.muted}>Todos los jugadores de la plantilla están en el campo.</Text>}
    <ScrollView style={styles.rosterList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
      {available.map(player=><DraggablePlayer key={player.id} player={player} photo={photos[player.id]} onDrop={receiveDrop} style={styles.rosterRow}>
        <View style={styles.rosterContent}><PlayerBadge player={player} photo={photos[player.id]} compact/><Pressable accessibilityRole="button" accessibilityLabel={'Colocar a '+player.name} onPress={()=>addPlayer(player)} style={styles.addButton}><Text style={styles.addButtonText}>Colocar</Text></Pressable></View>
      </DraggablePlayer>)}
      {(activePlan.starters||[]).map(id=>{const player=roster.find(row=>row.id===id);if(!player)return null;return <View key={id} style={[styles.rosterRow,styles.rosterChosen]}><View style={styles.rosterContent}><PlayerBadge player={player} photo={photos[id]} compact/><Pressable accessibilityRole="button" accessibilityLabel={'Quitar a '+player.name+' del campo'} onPress={()=>{const starters=activePlan.starters.filter(item=>item!==id),positions={...activePlan.positions};delete positions[id];updatePlan({starters,positions})}} style={styles.removeButton}><Text style={styles.removeText}>Quitar</Text></Pressable></View></View>})}
    </ScrollView>
    <Text style={styles.footnote}>Las alineaciones se guardan para los entrenadores aprobados de este equipo.</Text>
  </View>;
}

const styles=StyleSheet.create({root:{gap:13,padding:16,borderRadius:20,borderWidth:1,borderColor:'#2c3e54',backgroundColor:colors.panel},title:{fontSize:24,fontWeight:'800',color:colors.text},muted:{fontSize:13,lineHeight:20,color:colors.muted},planBar:{flexDirection:'row',gap:8},planSelect:{flex:1,justifyContent:'center',minHeight:42,paddingHorizontal:12,borderRadius:10,backgroundColor:'#101c2b',borderWidth:1,borderColor:colors.border},planSelectText:{color:colors.text,fontWeight:'700'},planList:{gap:6,padding:8,borderRadius:12,backgroundColor:colors.dark},planOption:{padding:10,borderRadius:8,backgroundColor:'#192a40'},planOptionActive:{backgroundColor:'#263a66'},planOptionText:{color:colors.text},action:{paddingHorizontal:12,paddingVertical:11,borderRadius:10,backgroundColor:'#1b2e69',alignItems:'center',justifyContent:'center'},actionText:{color:'#fff',fontSize:12,fontWeight:'800'},input:{minHeight:44,borderWidth:1,borderColor:colors.border,backgroundColor:'#101c2b',borderRadius:10,paddingHorizontal:12,color:colors.text},formationRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:7},sectionTitle:{color:colors.text,fontSize:15,fontWeight:'800'},formation:{paddingVertical:8,paddingHorizontal:11,borderRadius:9,backgroundColor:'#25364c'},formationActive:{backgroundColor:colors.red},formationText:{color:colors.text,fontSize:12,fontWeight:'800'},counterRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},counter:{color:colors.blue,fontSize:16,fontWeight:'900'},field:{width:'100%',maxWidth:430,aspectRatio:0.79,alignSelf:'center',position:'relative',overflow:'hidden',borderRadius:17,backgroundColor:'#197348',borderWidth:2,borderColor:'#9bd1a7'},fieldBorder:{position:'absolute',left:'3%',top:'2%',width:'94%',height:'96%',borderWidth:1.5,borderColor:colors.line,borderRadius:4},halfLine:{position:'absolute',left:'3%',top:'50%',width:'94%',borderTopWidth:1.5,borderColor:colors.line},centerCircle:{position:'absolute',left:'35%',top:'39%',width:'30%',aspectRatio:1,borderWidth:1.5,borderColor:colors.line,borderRadius:300},centerSpot:{position:'absolute',left:'49%',top:'49%',width:7,height:7,borderRadius:5,backgroundColor:colors.line},box:{position:'absolute',left:'20%',width:'60%',height:'13%',borderWidth:1.5,borderColor:colors.line},topBox:{top:'2%',borderTopWidth:0},bottomBox:{bottom:'2%',borderBottomWidth:0},smallBox:{position:'absolute',left:'36%',width:'28%',height:'5%',borderWidth:1.5,borderColor:colors.line},topSmallBox:{top:'2%',borderTopWidth:0},bottomSmallBox:{bottom:'2%',borderBottomWidth:0},targetDot:{position:'absolute',width:12,height:12,marginLeft:-6,marginTop:-6,borderRadius:8,borderWidth:1.5,borderColor:'#dcffe0',backgroundColor:'rgba(8,45,24,0.45)'},fieldPlayer:{position:'absolute',width:76,height:76,marginLeft:-38,marginTop:-38,zIndex:3,alignItems:'center',justifyContent:'center'},badge:{alignItems:'center',justifyContent:'center',width:86,minHeight:89,gap:2},badgeCompact:{width:72,minHeight:52,gap:1},photo:{width:48,height:48,borderRadius:25,borderWidth:2,borderColor:'#f4f5dd',backgroundColor:'#e7eee8'},photoCompact:{width:31,height:31,borderWidth:1.5},photoFallback:{alignItems:'center',justifyContent:'center',backgroundColor:'#dce6d4'},initial:{fontSize:18,fontWeight:'900',color:'#173a25'},numberBadge:{position:'absolute',top:0,right:18,minWidth:20,height:20,borderRadius:10,paddingHorizontal:4,alignItems:'center',justifyContent:'center',backgroundColor:'#c52321',borderWidth:1,borderColor:'#fff'},numberText:{fontSize:10,fontWeight:'900',color:'#fff'},playerName:{maxWidth:80,color:'#fff',fontSize:10,fontWeight:'900',textAlign:'center',textShadowColor:'#092417',textShadowOffset:{width:1,height:1},textShadowRadius:3},playerNameCompact:{maxWidth:70,fontSize:8},fieldHint:{position:'absolute',alignSelf:'center',top:'46%',alignItems:'center',gap:4,padding:10,borderRadius:10,backgroundColor:'rgba(8,45,24,0.68)'},hintTitle:{fontSize:15,fontWeight:'800',color:'#fff'},hintText:{fontSize:11,color:'#e5f3e7'},toolbar:{flexDirection:'row',flexWrap:'wrap',gap:7},secondary:{paddingHorizontal:11,paddingVertical:10,borderRadius:10,backgroundColor:'#25364c',alignItems:'center',justifyContent:'center'},secondaryText:{fontSize:12,fontWeight:'700',color:colors.text},error:{color:'#ffc1c9',backgroundColor:'#40202b',borderRadius:9,padding:10},rosterList:{maxHeight:350,flexGrow:0},rosterRow:{minHeight:56,paddingVertical:5,borderBottomWidth:1,borderColor:'#2d3e52'},rosterChosen:{opacity:0.85},rosterContent:{flexDirection:'row',alignItems:'center',gap:8},addButton:{marginLeft:'auto',paddingHorizontal:12,paddingVertical:8,borderRadius:9,backgroundColor:'#25364c'},addButtonText:{fontSize:11,fontWeight:'800',color:'#fff'},removeButton:{marginLeft:'auto',paddingHorizontal:11,paddingVertical:8,borderRadius:9,backgroundColor:'#40202b'},removeText:{fontSize:11,fontWeight:'800',color:'#ffc1c9'},footnote:{fontSize:11,lineHeight:17,color:colors.muted}});
