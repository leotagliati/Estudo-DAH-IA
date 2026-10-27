import { StyleSheet, Text, View } from 'react-native';
import type { Snapshot } from '../hooks/useTrainingStatus';

// Formatação à mão: o suporte a Intl/toLocaleString varia entre motores JS do React Native.
function formatInt(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDecimal(value: number, digits: number) {
  return value.toFixed(digits).replace('.', ',');
}

function formatTime(ms: number) {
  const d = new Date(ms);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function StatusCard({ snapshot }: { snapshot: Snapshot }) {
  const { status, receivedAt } = snapshot;
  const dash = '—';
  const step =
    status.step === null
      ? dash
      : status.max_steps
        ? `${formatInt(status.step)} / ${formatInt(status.max_steps)}`
        : formatInt(status.step);
  const lesson = status.lesson ? (status.lesson.name ?? `Lição ${status.lesson.number}`) : dash;

  return (
    <View style={styles.card}>
      <Text style={styles.run}>{status.run}</Text>
      <Row label="Lição" value={lesson} />
      <Row label="Step" value={step} />
      <Row
        label="Recompensa média"
        value={status.cumulative_reward === null ? dash : formatDecimal(status.cumulative_reward, 3)}
      />
      <Row
        label="Duração do episódio"
        value={status.episode_length === null ? dash : formatDecimal(status.episode_length, 1)}
      />
      <Text style={styles.received}>Recebido às {formatTime(receivedAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, gap: 10 },
  run: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 16, color: '#4b5563' },
  value: { fontSize: 16, fontWeight: '600' },
  received: { fontSize: 13, color: '#6b7280', marginTop: 4 },
});
