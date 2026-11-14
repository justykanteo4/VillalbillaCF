import React, {useEffect, useRef, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import PlayerPortrait from './PlayerPortrait';
import {Button, ErrorText, theme, text, panel, title} from './FantasyUI';
import systems from './lineup-systems.cjs';

const formations = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2'];

export default function FantasyLineup({leagueId, request}) {
  const [data, setData] = useState(null);
  const [ids, setIds] = useState([]);
  const [formation, setFormation] = useState(formations[0]);
  const [captain, setCaptain] = useState('');
  const [slot, setSlot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const alive = useRef(false);
  const pending = useRef(false);
  const path = '/leagues/' + leagueId + '/lineup';

  async function run(action) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (err) {
      if (alive.current) setError(err.message);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function load() {
    return run(async () => {
      const result = await request(path);
      if (!alive.current) return;
      setData(result);
      const roster = new Set(result.players.map(player => player.id));
      setIds(Array.from({length: 11}, (_, index) => {
        const id = result.selected[index];
        return roster.has(id) ? id : '';
      }));
      setFormation(result.formation || formations[0]);
      setCaptain(roster.has(result.captainId) ? result.captainId : '');
    });
  }

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [leagueId]);

  const players = data?.players || [];
  const blocked = data?.blockedCaptains || [];
  const slots = systems.makeSystem(formation).slots;
  const editable = Boolean(data && !data.locked && !busy);
  const canSave = editable && ids.filter(Boolean).length === 11 && ids.includes(captain) && !blocked.includes(captain);

  function choosePlayer(id) {
    const previous = ids[slot];
    const oldSlot = ids.indexOf(id);
    setIds(ids.map((value, index) => {
      if (index === slot) return id;
      if (index === oldSlot) return previous;
      return value;
    }));
    if (oldSlot === -1 && captain === previous) setCaptain('');
    setSlot(null);
    setNotice('');
  }

  function save() {
    if (!canSave) return;
    return run(async () => {
      const result = await request(path, {
        method: 'POST',
        body: JSON.stringify({playerIds: ids, captainId: captain, formation, week: data.week, revision: data.revision}),
      });
      if (!alive.current) return;
      setData(current => ({...current, revision: result.revision}));
      setNotice('Once, formación y capitán guardados.');
    });
  }

  return <View style={panel}>
    <Text style={title}>11 inicial</Text>
    {!!data && <Text style={text}>{data.locked ? 'Jornada cerrada' :
      (data.upcoming ? 'Próxima jornada · Cierre: ' : 'Cierre: ') +
      new Date(data.closesAt).toLocaleString('es-ES', {timeZone: 'Europe/Madrid'}) + ' · Madrid'}</Text>}
    {editable && <Text style={text}>Toca un puesto del campo para elegir o mover a un jugador.</Text>}
    <Text style={text}>Formación</Text>
    <View style={styles.formations}>
      {[...new Set([...formations, formation])].map(option => <Pressable key={option}
        accessibilityRole="radio" accessibilityState={{selected: formation === option, disabled: !editable}}
        disabled={!editable} style={[styles.formation, formation === option && styles.selectedFormation]}
        onPress={() => { setFormation(option); setNotice(''); }}>
        <Text style={text}>{option}</Text>
      </Pressable>)}
    </View>
    <View accessibilityLabel="Campo de fútbol Fantasy" style={styles.pitch}>
      <View pointerEvents="none" style={[styles.box, {top: 0}]}/>
      <View pointerEvents="none" style={[styles.box, {bottom: 0}]}/>
      <View pointerEvents="none" style={styles.midline}/>
      <View pointerEvents="none" style={styles.circle}/>
      {slots.map(([x, y], index) => {
        const player = players.find(item => item.id === ids[index]);
        const label = index === 0 ? 'Portería' : 'Puesto ' + (index + 1);
        return <Pressable key={index} accessibilityRole="button" accessibilityLabel={label + ' · ' + (player?.name || 'Elegir jugador')}
          disabled={!editable} onPress={() => setSlot(index)}
          style={[styles.slot, {left: (x - 7.5) + '%', top: (y - 8) + '%'}]}>
          {player ? <PlayerPortrait playerId={player.id} name={player.name} teamId={player.teamId} size={34}/> :
            <View style={styles.empty}><Text style={styles.plus}>+</Text></View>}
          <Text numberOfLines={2} style={styles.playerName}>{player ? systems.shortPlayerName(player) : 'Elegir'}
            {player && captain === player.id ? ' · C' : ''}</Text>
        </Pressable>;
      })}
    </View>
    <Modal visible={slot !== null} animationType="slide" onRequestClose={() => setSlot(null)}>
      <SafeAreaView style={styles.modal}>
        <Text style={title}>{slot === 0 ? 'Elegir portero' : 'Elegir jugador'}</Text>
        <ScrollView>
          {players.map(player => <Pressable key={player.id} accessibilityRole="button"
            accessibilityLabel={'Alinear a ' + player.name} onPress={() => choosePlayer(player.id)} style={styles.choice}>
            <PlayerPortrait playerId={player.id} name={player.name} teamId={player.teamId} size={36}/>
            <Text style={[text, styles.choiceName]}>{player.name}
              {ids[slot] === player.id ? ' · Seleccionado' : ids.includes(player.id) ? ' · En el once' : ''}</Text>
          </Pressable>)}
        </ScrollView>
        <Button secondary onPress={() => setSlot(null)}>Cerrar selección</Button>
      </SafeAreaView>
    </Modal>
    <Text style={title}>Capitán · Puntos ×2</Text>
    {ids.filter(Boolean).map(id => {
      const player = players.find(item => item.id === id);
      const unavailable = blocked.includes(id);
      return <Button key={id} secondary={captain !== id} disabled={!editable || unavailable}
        onPress={() => { setCaptain(id); setNotice(''); }}>
        {captain === id ? '© ' : ''}{player?.name}{unavailable ? ' · Esperando 6 jornadas' : ''}
      </Button>;
    })}
    <ErrorText>{error}</ErrorText>
    {!!notice && <Text accessibilityRole="alert" style={[text, styles.notice]}>{notice}</Text>}
    <Button disabled={!canSave} onPress={save}>{busy ? 'Cargando…' : 'Guardar once y capitán'}</Button>
    <Button secondary disabled={busy} onPress={load}>Actualizar alineación</Button>
  </View>;
}

const styles = StyleSheet.create({
  formations: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  formation: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border},
  selectedFormation: {backgroundColor: theme.header, borderColor: theme.accent},
  pitch: {height: 460, position: 'relative', borderWidth: 3, borderColor: '#ecffe4', borderRadius: 12, backgroundColor: '#197b48'},
  box: {position: 'absolute', left: '25%', width: '50%', height: '15%', borderWidth: 2, borderColor: '#d7ffcd'},
  midline: {position: 'absolute', left: 0, right: 0, top: '50%', borderTopWidth: 2, borderColor: '#d7ffcd'},
  circle: {position: 'absolute', top: '40%', left: '33%', width: '34%', height: '20%', borderWidth: 2, borderColor: '#d7ffcd', borderRadius: 90},
  slot: {position: 'absolute', width: '15%', minHeight: 44, alignItems: 'center', gap: 2},
  empty: {width: 34, height: 34, borderRadius: 17, backgroundColor: theme.header, justifyContent: 'center', alignItems: 'center'},
  plus: {color: theme.text, fontSize: 24},
  playerName: {color: '#fff', fontWeight: '800', fontSize: 10, textAlign: 'center', backgroundColor: '#08412b', padding: 2},
  modal: {flex: 1, gap: 12, padding: 16, backgroundColor: theme.panel},
  choice: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, minHeight: 48},
  choiceName: {flex: 1},
  notice: {color: theme.accent},
});
