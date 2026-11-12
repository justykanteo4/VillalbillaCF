import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TeamSelector from './TeamSelector';
import seed from './players-seed.json';

const STORAGE_KEY = 'villalbilla.vbfantasy.2026-27.v1';
const SQUAD_SIZE = 11;
const clubTeams = seed.teams.filter(team => team.players.some(player => player.available !== false));
const teams = clubTeams.map(team => ({id: team.id, name: team.name, category: team.category}));
const playersByTeam = new Map(clubTeams.map(team => [team.id, team.players
  .filter(player => player.available !== false)
  .map(player => ({...player, fantasyId: String(player.id)}))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))]));
const players = new Map();
for (const roster of playersByTeam.values()) {
  for (const player of roster) {
    const previous = players.get(player.fantasyId);
    if (!previous || (previous.error && !player.error)) players.set(player.fantasyId, player);
  }
}

function playerPoints(player) {
  if (!player || player.error || player.goalsAllowed === false || player.goals === null) return null;
  const {played, goals, yellow, red} = player;
  if (![played, goals, yellow, red].every(value => Number.isInteger(value) && value >= 0)) return null;
  return played * 2 + goals * 4 - yellow - red * 3;
}

function scoreSquad(squad) {
  const scores = squad.players.map(id => playerPoints(players.get(id)));
  return {total: scores.reduce((sum, value) => sum + (value ?? 0), 0), partial: scores.includes(null)};
}

export default function VBFantasy() {
  const [squads, setSquads] = useState(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [teamId, setTeamId] = useState(teams[0]?.id);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      const saved = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(saved) || saved.some(squad => typeof squad?.id !== 'string' ||
        typeof squad.name !== 'string' || !Array.isArray(squad.players))) throw new Error('Invalid fantasy squads');
      if (active) setSquads(saved);
    }).catch(() => {
      if (active) setNotice('No se han podido cargar los equipos guardados. Vuelve a abrir VBFantasy para reintentar.');
    });
    return () => { active = false; };
  }, []);

  function togglePlayer(id) {
    setSelected(current => {
      if (current.includes(id)) return current.filter(value => value !== id);
      return current.length < SQUAD_SIZE ? [...current, id] : current;
    });
  }

  function clearForm() {
    setEditing(null);
    setName('');
    setSelected([]);
  }

  async function saveSquad() {
    const trimmed = name.trim();
    if (savingRef.current || !squads || !trimmed || selected.length !== SQUAD_SIZE) return;
    if (squads.some(squad => squad.id !== editing && squad.name.toLocaleLowerCase('es') === trimmed.toLocaleLowerCase('es'))) {
      setNotice('Ya hay un equipo con ese nombre.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setNotice('');
    const squad = {id: editing ?? String(Date.now()), name: trimmed, players: selected};
    const updated = editing ? squads.map(item => item.id === editing ? squad : item) : [...squads, squad];
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSquads(updated);
      clearForm();
      setNotice('Equipo guardado.');
    } catch {
      setNotice('No se ha podido guardar el equipo. Puedes volver a intentarlo.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const ranking = (squads ?? []).map(squad => ({...squad, ...scoreSquad(squad)}))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'));
  const available = (playersByTeam.get(teamId) ?? [])
    .filter(player => player.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));

  return <View style={s.page}>
    <Text accessibilityRole="header" style={s.title}>VBFantasy</Text>
    <Text style={s.muted}>Liga local · Temporada 2026/27</Text>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>Clasificación</Text>
      <Text style={s.muted}>Equipos guardados en este dispositivo. Puntos acumulados según las estadísticas de la temporada incluidas en la app.</Text>
      {squads && !ranking.length && <Text style={s.text}>Crea un equipo para empezar la clasificación.</Text>}
      {ranking.map(squad => <View key={squad.id} style={s.row}>
        <View style={s.fill}>
          <Text style={s.text}>{ranking.findIndex(item => item.total === squad.total) + 1}. {squad.name}</Text>
          <Text style={s.muted}>{squad.total} pts{squad.partial ? ' · Parcial' : ''}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={'Editar ' + squad.name} disabled={saving} style={s.secondary} onPress={() => {
          setEditing(squad.id);
          setName(squad.name);
          setSelected(squad.players);
          setNotice('');
        }}><Text style={s.text}>Editar</Text></Pressable>
      </View>)}
    </View>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>{editing ? 'Editar equipo' : 'Crear equipo'}</Text>
      <TextInput accessibilityLabel="Nombre del equipo" style={s.input} editable={!saving}
        placeholder="Nombre del equipo" placeholderTextColor="#aab8cb" maxLength={40} value={name} onChangeText={setName}/>
      <Text style={s.text}>{selected.length}/{SQUAD_SIZE} jugadores</Text>
      {selected.map(id => <Pressable key={id} accessibilityRole="button" disabled={saving}
        accessibilityLabel={'Quitar a ' + (players.get(id)?.name ?? 'jugador')} onPress={() => togglePlayer(id)} style={s.row}>
        <Text style={[s.text, s.fill]}>{players.get(id)?.name ?? 'Jugador sin ficha'}</Text>
        <Text style={s.accent}>Quitar</Text>
      </Pressable>)}
      <TeamSelector label="Plantilla del club" value={teamId} onChange={setTeamId} options={teams}/>
      <TextInput accessibilityLabel="Buscar jugador" style={s.input} value={search} onChangeText={setSearch}
        placeholder="Buscar jugador" placeholderTextColor="#aab8cb"/>
      {!available.length && <Text style={s.muted}>No hay jugadores para esta búsqueda.</Text>}
      {available.map(player => {
        const checked = selected.includes(player.fantasyId);
        const disabled = saving || (!checked && selected.length >= SQUAD_SIZE);
        return <Pressable key={player.fantasyId} accessibilityRole="checkbox" accessibilityState={{checked, disabled}}
          disabled={disabled} onPress={() => togglePlayer(player.fantasyId)} style={s.row}>
          <Text style={[s.text, s.fill]}>{player.name}</Text>
          <Text style={s.muted}>{playerPoints(players.get(player.fantasyId)) ?? '—'} pts</Text>
          <Text style={s.accent}>{checked ? '✓' : '+'}</Text>
        </Pressable>;
      })}
      <Pressable accessibilityRole="button" onPress={saveSquad} style={[s.button, (!squads || saving || !name.trim() || selected.length !== SQUAD_SIZE) && s.disabled]}
        disabled={!squads || saving || !name.trim() || selected.length !== SQUAD_SIZE}>
        <Text style={s.text}>{saving ? 'Guardando…' : 'Guardar equipo'}</Text>
      </Pressable>
      {editing && <Pressable accessibilityRole="button" disabled={saving} onPress={clearForm} style={s.secondary}><Text style={s.text}>Cancelar edición</Text></Pressable>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
    </View>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>Puntuación</Text>
      <Text style={s.text}>Partido jugado +2 · Gol +4 · Amarilla −1 · Roja −3</Text>
      <Text style={s.muted}>Elige 11 jugadores distintos por equipo. Cuando falta una estadística se indica «—» y la puntuación del equipo figura como parcial.</Text>
    </View>
  </View>;
}

const s = StyleSheet.create({
  page: {gap: 12},
  title: {color: '#fff', fontSize: 30, fontWeight: '900'},
  heading: {color: '#fff', fontSize: 19, fontWeight: '800'},
  card: {gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#2d3e52', backgroundColor: '#151f2d'},
  row: {flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 6, borderTopWidth: 1, borderColor: '#2d3e52'},
  fill: {flex: 1, minWidth: 0},
  text: {color: '#edf5ff', fontWeight: '700'},
  muted: {color: '#aab8cb', fontSize: 13, lineHeight: 19},
  accent: {color: '#9ddcff', fontWeight: '800'},
  input: {color: '#fff', backgroundColor: '#101c2b', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#34475e'},
  button: {padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#b42122'},
  secondary: {padding: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#25364c'},
  disabled: {opacity: 0.5},
});
