import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

// Contrato de server/training_status_server.py (GET /status).
export type TrainingStatus = {
  run: string;
  behavior: string;
  step: number | null;
  max_steps: number | null;
  cumulative_reward: number | null;
  episode_length: number | null;
  lesson: { number: number; name: string | null } | null;
  last_update: string;
  seconds_since_update: number;
};

export type Snapshot = { status: TrainingStatus; receivedAt: number };

// Um ponto novo sai a cada ~40 s; 10 s basta para a lição mudar na tela em até um intervalo.
export const POLL_INTERVAL_MS = 10_000;
// Pior intervalo medido entre dois pontos foi 1,8 min: 5 min não vira alarme falso.
export const STALLED_AFTER_SECONDS = 5 * 60;
const REQUEST_TIMEOUT_MS = 5_000;
const SNAPSHOT_KEY = 'lastSnapshot';

export class NoConnectionError extends Error {}

export function statusUrl(address: string) {
  const base = /^https?:\/\//.test(address) ? address : `http://${address}`;
  return `${base.replace(/\/+$/, '')}/status`;
}

async function fetchStatus(address: string, signal: AbortSignal): Promise<TrainingStatus> {
  // Com o PC desligado o fetch pode ficar pendurado por muito tempo antes de falhar.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  signal.addEventListener('abort', () => controller.abort());

  let response: Response;
  try {
    response = await fetch(statusUrl(address), { signal: controller.signal });
  } catch {
    throw new NoConnectionError('Sem conexão com o PC');
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `Erro ${response.status} do servidor`);
  }
  return body as TrainingStatus;
}

export function useTrainingStatus(address: string) {
  const [saved, setSaved] = useState<Snapshot | null>(null);

  const query = useQuery({
    queryKey: ['status', address],
    queryFn: ({ signal }) => fetchStatus(address, signal),
    enabled: address.length > 0,
    refetchInterval: POLL_INTERVAL_MS,
    // O padrão são 3 tentativas com espera crescente: o "sem conexão" demoraria segundos a mais para aparecer.
    retry: 1,
  });

  useEffect(() => {
    AsyncStorage.getItem(SNAPSHOT_KEY)
      .then((raw) => raw && setSaved(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.data) return;
    const snapshot = { status: query.data, receivedAt: query.dataUpdatedAt };
    AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)).catch(() => {});
  }, [query.data, query.dataUpdatedAt]);

  // No erro o react-query mantém o último data; sem nenhum ainda nesta sessão, vale o salvo da anterior.
  const snapshot: Snapshot | null = query.data
    ? { status: query.data, receivedAt: query.dataUpdatedAt }
    : saved;

  // O salvo é só a última leitura conhecida: não diz se o treino está andando agora.
  return { snapshot, isLive: query.data !== undefined, error: query.error };
}
