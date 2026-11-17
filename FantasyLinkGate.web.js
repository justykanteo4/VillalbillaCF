import React,{useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {destinationFromUrl} from './notification-destination.cjs';
import FantasyIcon from './FantasyIcon';
import theme from './fantasy-theme.cjs';

export default function FantasyLinkGate({children}) {
  const [destination]=useState(()=>destinationFromUrl(globalThis.location?.href));
  const [continueOnWeb,setContinueOnWeb]=useState(false);
  const android=typeof navigator!=='undefined'&&/Android/i.test(navigator.userAgent);
  if(!android||destination?.type!=='fantasy-league'||continueOnWeb)return children;
  const nativeUrl='villalbilla-cf://fantasy/league?id='+encodeURIComponent(destination.leagueId);
  return <View style={styles.screen}>
    <View style={styles.card}>
      <FantasyIcon size={72}/>
      <Text accessibilityRole="header" style={styles.title}>VillalbillaFantasy</Text>
      <Pressable accessibilityRole="button" style={styles.primary} onPress={()=>{globalThis.location.href=nativeUrl}}>
        <Text style={styles.primaryText}>Abrir en VillalbillaCF</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.secondary} onPress={()=>setContinueOnWeb(true)}>
        <Text style={styles.secondaryText}>Continuar en la web</Text>
      </Pressable>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:theme.background,alignItems:'center',justifyContent:'center',padding:24},
  card:{width:'100%',maxWidth:400,alignItems:'stretch',gap:16,padding:24,borderRadius:18,backgroundColor:theme.panel},
  title:{fontSize:26,fontWeight:'900',color:theme.text},
  primary:{minHeight:48,justifyContent:'center',padding:12,borderRadius:10,backgroundColor:theme.button},
  primaryText:{color:theme.buttonText,fontWeight:'800',textAlign:'center'},
  secondary:{minHeight:48,justifyContent:'center',padding:12,borderRadius:10,borderWidth:1,borderColor:theme.border},
  secondaryText:{color:theme.text,fontWeight:'800',textAlign:'center'}
});
