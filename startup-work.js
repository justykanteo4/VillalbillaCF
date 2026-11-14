import {AppState,InteractionManager} from 'react-native';
import {createStartupScheduler} from './startup-performance.cjs';
const scheduler=createStartupScheduler({isActive:()=>!AppState.currentState||AppState.currentState==='active'});
export const backgroundTurn=options=>scheduler.wait(options);
export const preferredStartupTeams=()=>scheduler.preferredTeams();
export function prioritizeScreen(teamIds){scheduler.noteNavigation(teamIds);const task=InteractionManager.runAfterInteractions(()=>scheduler.markReady());return()=>task.cancel()}

// Al volver a primer plano, da tiempo a repintar antes de reanudar descargas.
AppState.addEventListener('change',state=>{if(state==='active'){scheduler.noteNavigation();InteractionManager.runAfterInteractions(()=>scheduler.markReady())}});
