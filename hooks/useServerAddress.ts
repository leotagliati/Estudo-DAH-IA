import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADDRESS_KEY = 'serverAddress';

// O IP do PC muda com a rede: ele é digitado na tela e lembrado entre aberturas do app.
export function useServerAddress() {
  const [address, setAddress] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ADDRESS_KEY)
      .then((value) => value && setAddress(value))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function save(value: string) {
    const trimmed = value.trim();
    setAddress(trimmed);
    AsyncStorage.setItem(ADDRESS_KEY, trimmed).catch(() => {});
  }

  return { address, loaded, save };
}
