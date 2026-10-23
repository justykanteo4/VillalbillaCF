import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { addClubAdmin, listClubAdmins } from './firebase';

const styles = {
  card: { padding: 20, borderRadius: 20, backgroundColor: '#151f2d', borderWidth: 1, borderColor: '#2c3e54', gap: 13 },
  title: { fontSize: 17, fontWeight: '700', color: '#f0f4fa' },
  text: { color: '#aab8cb', fontSize: 13, lineHeight: 20 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#34475e', backgroundColor: '#101c2b', borderRadius: 11, padding: 14, fontSize: 15, color: '#f0f4fa' },
  button: { padding: 14, borderRadius: 12, backgroundColor: '#c52321', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  admin: { paddingTop: 11, borderTopWidth: 1, borderColor: '#2d3e52', color: '#dce6f2', fontSize: 14 },
  error: { padding: 12, color: '#ffc1c9', backgroundColor: '#40202b', borderRadius: 10 },
  success: { color: '#8ce2a8', fontSize: 13 },
  secondary: { color: '#91adff', fontSize: 13, fontWeight: '700', textAlign: 'center', padding: 8 },
};

export default function AdminManagement() {
  const [email, setEmail] = useState('');
  const [admins, setAdmins] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try { setAdmins(await listClubAdmins()); }
    catch (e) { setError(e.message || 'No se pudo cargar la lista de administradores.'); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const add = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const addedEmail = await addClubAdmin(email);
      setEmail('');
      setNotice(`${addedEmail} ya tiene permisos de administrador. Deberá iniciar sesión con ese correo verificado.`);
      setAdmins(await listClubAdmins());
    } catch (e) {
      setError(e.message || 'No se pudo añadir el administrador.');
    } finally {
      setBusy(false);
    }
  };

  return <View style={styles.card}>
    <Text style={styles.title}>Administradores del club</Text>
    <Text style={styles.text}>Añade un correo verificado para darle acceso de administrador a toda la app. Solo los administradores actuales pueden gestionar esta lista.</Text>
    <TextInput
      accessibilityLabel="Correo del nuevo administrador"
      autoCapitalize="none"
      autoComplete="email"
      keyboardType="email-address"
      placeholder="correo@ejemplo.com"
      placeholderTextColor="#91a5be"
      style={styles.input}
      value={email}
      onChangeText={setEmail}
      editable={!busy}
      returnKeyType="done"
      onSubmitEditing={add}
    />
    <Pressable accessibilityRole="button" disabled={busy} onPress={add} style={[styles.button, busy && { opacity: 0.6 }]}>
      <Text style={styles.buttonText}>{busy ? 'Guardando…' : 'Añadir administrador'}</Text>
    </Pressable>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!!notice && <Text style={styles.success}>{notice}</Text>}
    <Text style={styles.title}>Cuentas con acceso</Text>
    {admins.map(admin => <Text key={admin.email} style={styles.admin}>{admin.email}{admin.primary ? ' · Administrador principal' : ''}</Text>)}
    <Pressable accessibilityRole="button" disabled={busy} onPress={refresh}>
      <Text style={styles.secondary}>{busy ? 'Actualizando…' : 'Actualizar lista'}</Text>
    </Pressable>
  </View>;
}
