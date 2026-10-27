import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ConnectionBanner, type Connection } from './components/ConnectionBanner';
import { ServerAddressInput } from './components/ServerAddressInput';
import { StatusCard } from './components/StatusCard';
import { useServerAddress } from './hooks/useServerAddress';
import {
  NoConnectionError,
  STALLED_AFTER_SECONDS,
  useTrainingStatus,
} from './hooks/useTrainingStatus';

const queryClient = new QueryClient();

function TrainingScreen() {
  const { address, loaded, save } = useServerAddress();
  const { snapshot, isLive, error } = useTrainingStatus(loaded ? address : '');

  let connection: Connection;
  if (!address) {
    connection = { kind: loaded ? 'no-address' : 'waiting' };
  } else if (error) {
    connection = {
      kind: 'offline',
      message: error instanceof NoConnectionError ? error.message : `Erro do servidor: ${error.message}`,
    };
  } else if (!snapshot || !isLive) {
    connection = { kind: 'waiting' };
  } else if (snapshot.status.seconds_since_update > STALLED_AFTER_SECONDS) {
    connection = { kind: 'stalled', minutes: Math.floor(snapshot.status.seconds_since_update / 60) };
  } else {
    connection = { kind: 'training' };
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Treino do Seeker</Text>
      {loaded && <ServerAddressInput address={address} onSave={save} />}
      <ConnectionBanner connection={connection} />
      {snapshot && <StatusCard snapshot={snapshot} />}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TrainingScreen />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 56, gap: 16, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700' },
});
