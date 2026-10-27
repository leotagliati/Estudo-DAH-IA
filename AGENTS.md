This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Convenções deste projeto

- Não altere arquivos fora do escopo pedido. Explique cada alteração.
- Componentes ficam em `components/`, um arquivo por componente.
- Estado nunca é modificado no lugar: sempre gere um novo valor.
- Valores que podem ser calculados a partir do estado não viram estado.
- Antes de usar um pacote, confirme na documentação se ele funciona no Expo Go.

## Contexto desta prova de conceito

- TCC: jogo de esconde-esconde em Unity cujo perseguidor é uma IA treinada com ML-Agents, em
  runs de treino que levam horas no PC.
- Problema: acompanhar pelo celular, longe do PC, se o treino está progredindo, em que lição do
  currículo está e se travou ou parou.
- Tecnologia investigada: `@tanstack/react-query` com polling (`refetchInterval`) consumindo uma
  API HTTP local.
- A API já existe e não faz parte do app: `server/training_status_server.py` (Python, roda no
  PC). `GET http://<ip-do-pc>:8000/status` devolve JSON com `run`, `behavior`, `step`,
  `max_steps`, `cumulative_reward`, `episode_length`, `lesson` (`{ number, name }`),
  `last_update` (ISO 8601) e `seconds_since_update`; qualquer campo pode vir `null`. Erro vem
  como `{ "error": "..." }` com status 4xx. Leia o arquivo para conferir o contrato.
- No celular, `localhost` é o próprio celular: o endereço do PC muda com a rede e não pode ficar
  fixo no código.
- Uma tela só, em `App.tsx`: o usuário vê o run, o step, a recompensa média, a duração de
  episódio e a lição atual pelo nome, atualizados sozinhos; vê também se o PC está sem conexão
  ou se o treino parou de avançar.
- Não usar Expo Router, a menos que a tecnologia investigada seja a navegação.
- Não altere `server/`, `PESQUISA.md` nem `CRITERIOS.md`, e não use esses dois `.md` como
  contexto.
- Fora de escopo: login, design final, gráficos e tudo que não demonstre a pergunta.
