import appTheme from './app-theme';
import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {recordDiagnostic} from './diagnostics';

// Prevent an unexpected render error from leaving the application blank.
export default class AppErrorBoundary extends React.Component {
  state = {failed: false, attempts: 0};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({failed: false});
    }
  }
  componentDidCatch(error, info) {
    try {
      recordDiagnostic({category: 'aplicacion', code: 'RUNTIME'});
    } catch (_) {}
    if (typeof console !== 'undefined') {
      console.error('Villalbilla CF: fallo de pantalla', error, info?.componentStack);
    }
  }
  retry = () => this.setState(({attempts}) => ({failed: false, attempts: attempts + 1}));
  render() {
    if (!this.state.failed) {
      return <React.Fragment key={this.state.attempts}>{this.props.children}</React.Fragment>;
    }
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>No se ha podido mostrar esta pantalla</Text>
        <Text style={styles.subtitle}>Se ha producido un error temporal. Puedes volver a cargar la aplicación sin borrar tus datos.</Text>
        <Pressable accessibilityRole="button" onPress={this.retry} style={styles.button}>
          <Text style={styles.buttonText}>Volver a intentarlo</Text>
        </Pressable>
        {this.props.onExit && <Pressable accessibilityRole="button" onPress={this.props.onExit} style={styles.secondaryButton}><Text style={styles.secondaryText}>Volver a Noticias</Text></Pressable>}
      </View>
    );
  }
}
const styles = StyleSheet.create({
  screen: {flex: 1, minHeight: 260, backgroundColor: appTheme.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16},
  title: {color: '#fff', fontSize: 21, fontWeight: '800', textAlign: 'center'},
  subtitle: {color: '#b4bfd0', fontSize: 15, lineHeight: 23, textAlign: 'center'},
  button: {backgroundColor: '#c52321', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12},
  buttonText: {color: '#fff', fontWeight: '800', fontSize: 15},
  secondaryButton: {paddingHorizontal: 20, paddingVertical: 12},
  secondaryText: {color: appTheme.accent, fontWeight: '700', fontSize: 15}
});
