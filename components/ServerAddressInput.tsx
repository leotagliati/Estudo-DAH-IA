import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  address: string;
  onSave: (value: string) => void;
};

export function ServerAddressInput({ address, onSave }: Props) {
  // Quem renderiza só monta este campo depois de o endereço salvo sair do AsyncStorage.
  const [draft, setDraft] = useState(address);

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => onSave(draft)}
        placeholder="IP do PC, ex.: 192.168.0.10:8000"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        accessibilityLabel="Endereço do PC"
      />
      <Pressable style={styles.button} onPress={() => onSave(draft)} accessibilityRole="button">
        <Text style={styles.buttonText}>Conectar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c4c4c4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
