import { StyleSheet, Text, View } from 'react-native';

export type Connection =
  | { kind: 'no-address' }
  | { kind: 'waiting' }
  | { kind: 'offline'; message: string }
  | { kind: 'stalled'; minutes: number }
  | { kind: 'training' };

function describe(connection: Connection) {
  switch (connection.kind) {
    case 'no-address':
      return { color: '#6b7280', text: 'Digite o endereço do PC' };
    case 'waiting':
      return { color: '#6b7280', text: 'Conectando…' };
    case 'offline':
      return { color: '#b91c1c', text: connection.message };
    case 'stalled':
      return { color: '#b45309', text: `Treino parado há ${connection.minutes} min` };
    case 'training':
      return { color: '#15803d', text: 'Treinando' };
  }
}

export function ConnectionBanner({ connection }: { connection: Connection }) {
  const { color, text } = describe(connection);
  return (
    <View style={[styles.banner, { backgroundColor: color }]} accessibilityRole="alert">
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  text: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
