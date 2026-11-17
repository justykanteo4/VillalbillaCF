import React, {useRef, useState} from 'react';
import {Text, View} from 'react-native';
import {Button, ErrorText, Field, panel, text, title} from './FantasyUI';
import TeamSelector from './TeamSelector';
import {matchesPersonQuery} from './name-search.cjs';

export default function FantasyAdminTransfer({request}) {
  const [leagues, setLeagues] = useState(null);
  const [league, setLeague] = useState('');
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [player, setPlayer] = useState(null);
  const [target, setTarget] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const path = id => '/admin/leagues/'+id+'/transfer';

  async function run(action) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try { await action(); }
    catch (err) { setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  }

  function chooseLeague(id) {
    return run(async () => {
      setLeague(id);
      setData(null);
      setPlayer(null);
      setTarget('');
      setConfirm(false);
      setData(await request(path(id), {cache:'reload'}));
    });
  }

  const teams = data?.teams.filter(team => team.id !== player?.ownership?.ownerId && team.size < 16) || [];
  const destination = teams.find(team => team.id === target);
  const term = query.trim();
  const matches = term ? data?.players.filter(item => matchesPersonQuery(item.name,term)).slice(0,12) || [] : [];
  const options = values => values.map(({id,name}) => ({id,category:name,name:''}));

  function execute() {
    if (!confirm || !player || !destination) return;
    return run(async () => {
      await request(path(league), {method:'POST',body:JSON.stringify({
        playerId:player.id,targetId:destination.id,ownershipId:player.ownership?.id ?? null,
      })});
      setConfirm(false);
      setPlayer(null);
      setTarget('');
      setNotice(player.name+' ya pertenece a '+destination.name+'.');
      setData(null);
      setData(await request(path(league), {cache:'reload'}));
    });
  }

  return <View style={panel}>
    <Text style={title}>Traspaso manual de jugadores</Text>
    {leagues === null ? <Button secondary disabled={busy} onPress={() => run(async () => {
      const result = await request('/admin/leagues/reset', {cache:'reload'});
      setLeagues(result.leagues);
    })}>Abrir traspasos</Button> : <>
      <TeamSelector label="Liga Fantasy" value={league} options={options(leagues)} onChange={chooseLeague} disabled={busy || confirm}/>
      {!!league && !data && !busy && <Button secondary onPress={() => chooseLeague(league)}>Recargar liga</Button>}
      {!!data && <>
        {!confirm && <>
          <Button secondary disabled={busy} onPress={() => chooseLeague(league)}>Actualizar jugadores y equipos</Button>
          <Field label="Buscar jugador" value={query} onChange={value => {setQuery(value);setPlayer(null);setTarget('');}}/>
          {matches.map(item => <Button key={item.id} secondary={player?.id !== item.id} disabled={busy}
            onPress={() => {setPlayer(item);setTarget('');}}>
            {item.name} · {item.ownership?.owner || 'Sin equipo'}
          </Button>)}
          {!!term && !matches.length && <Text style={text}>Sin jugadores para esa búsqueda.</Text>}
          {!!player && <TeamSelector label="Equipo de destino" value={target} options={options(teams)}
            onChange={setTarget} disabled={busy}/>}
          {!!player && !teams.length && <Text style={text}>No hay equipos de destino con hueco.</Text>}
          <Button disabled={busy || !player || !destination} onPress={() => setConfirm(true)}>Revisar traspaso</Button>
        </>}
        {confirm && !!destination && <>
          <Text style={text}>{player.name} · {player.ownership?.owner || 'Sin equipo'} → {destination.name}</Text>
          <Text style={text}>El traspaso es inmediato y no cambia los saldos. Se cancelan las ofertas y pujas pendientes del jugador.</Text>
          <Button disabled={busy} onPress={execute}>Confirmar traspaso</Button>
          <Button secondary disabled={busy} onPress={() => setConfirm(false)}>Volver</Button>
        </>}
      </>}
    </>}
    <ErrorText>{error}</ErrorText>
    {!!notice && <Text accessibilityRole="alert" style={text}>{notice}</Text>}
  </View>;
}
