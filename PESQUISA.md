# Diário de pesquisa

## Contexto do TCC

Jogo de esconde-esconde em primeira pessoa feito em Unity, em que o perseguidor (Seeker) é
controlado por uma política treinada por reforço com ML-Agents (PPO), com currículo de três
lições (OpenRoom → Mixed → MazeHeavy). Cada run de treino leva horas no PC, e erros de
configuração não dão exceção: só aparecem como uma curva de recompensa que não sobe.

## Pergunta de pesquisa

Como o `@tanstack/react-query`, com polling, resolve o acompanhamento de um treino de
ML-Agents de várias horas, mostrando no celular a recompensa média, os steps e a lição do
currículo, na condição de o app estar fora do PC e o treino poder travar ou parar sem aviso?

## O que já foi verificado nos dados do projeto

- As curvas ficam no arquivo de eventos do TensorBoard, em
  `results/<run-id>/Seeker/events.out.tfevents.*`. Tags lidas num run de 1M steps
  (`seekertestenovo102`), com `tensorboard` 2.20.0:
  - `Environment/Cumulative Reward`: a recompensa média que o app deve mostrar.
  - `Environment/Episode Length`
  - `Environment/Lesson Number/maze_enabled`: a lição do currículo (0, 1, 2).
  - `Policy/Entropy`, `Policy/Learning Rate`, `Losses/Policy Loss`, `Losses/Value Loss`, entre outras.
- Há um ponto novo a cada `summary_freq: 20000` steps (`config/seeker_curriculum.yaml`), ou
  seja, 50 pontos em 1M steps. Um polling mais rápido do que um ponto a cada poucos minutos
  não mostra nada novo.
- `results/<run-id>/run_logs/training_status.json` tem `lesson_num` e os checkpoints com
  `reward`, **mas não existe durante o treino**. No run interrompido
  `seekerposdebugultimofinal2243`, a pasta `run_logs/` estava vazia. Ele não serve para
  acompanhar um run ao vivo (ver "Onde a IA errou").
- O mesmo vale para o `results/<run-id>/configuration.yaml`, de onde sairiam os nomes das
  lições. No código do ML-Agents (`mlagents/trainers/learn.py`, função `run_training`), os dois
  arquivos são gravados no `finally`, depois que o treino termina. Num run ao vivo, os nomes das
  lições vêm do yaml passado ao `mlagents-learn`.
- O arquivo de eventos só muda quando sai um ponto novo. Por isso, o "treino parado" do app
  precisa de um limite maior que o tempo entre dois `summary_freq`, senão todo intervalo
  normal vira alarme falso. Medido pelo `wall_time` dos pontos em 9 runs do Seeker: mediana de
  ~40 s entre pontos, máximo de 1,8 min. Limite escolhido: 5 minutos.

## Servidor do PC (feito)

`server/training_status_server.py`, rodando no env `mlagents`. Ele lê o `results/` do
repositório do jogo (por padrão, `PROJECT-IA` na mesma pasta que este repo; outro lugar com
`--project`):

```
python server/training_status_server.py      # porta 8000; mostra o IP para o celular
```

`GET /status` (ou `/status?run=<run-id>`; sem `run`, usa o mais recente) devolve:

```json
{
  "run": "seekertestenovo102",
  "behavior": "Seeker",
  "step": 1000000,
  "max_steps": 1000000,
  "cumulative_reward": -0.976,
  "episode_length": 255.7,
  "lesson": { "number": 1, "name": "Maze" },
  "last_update": "2026-08-29T16:33:14.494944+00:00",
  "seconds_since_update": 5040936.4
}
```

Run inexistente devolve 404 com `{"error": "..."}`. Qualquer campo pode vir `null` se o run
ainda não gravou o primeiro ponto. O IP muda com a rede, então o app precisa dele configurável.

## Alternativas consideradas

Como o celular consulta o treino:

| Opção                                        | Serve para                                          | Decisão |
|----------------------------------------------|-----------------------------------------------------|---------|
| `fetch` + `useEffect` com `setInterval`      | Polling simples, o que já foi visto em aula (apostila 2) | Não: limpeza do intervalo, tentativa de novo, estado de erro e "último valor bom" ficariam todos à mão |
| `@tanstack/react-query` com `refetchInterval` | Polling com cache, retry e estados de erro prontos  | **Sim.** `refetchInterval` faz o polling, `error` diz que o PC caiu sem apagar o `data` anterior, e `dataUpdatedAt` dá a hora do último sucesso |
| WebSocket                                    | O servidor empurra cada atualização                 | Não: sai um ponto a cada ~40 s, então tempo real não ajuda, e o servidor teria que vigiar o arquivo |

De onde saem os dados no PC:

| Opção                                                            | Serve para                                       | Decisão |
|------------------------------------------------------------------|--------------------------------------------------|---------|
| API HTTP do próprio TensorBoard (`tensorboard --logdir results`)  | Nada novo para rodar no PC                       | Não: as rotas são internas, sem documentação como API*, e o app teria que juntar várias chamadas e saber os nomes das tags |
| `training_status.json`                                           | Lição e recompensa por checkpoint                | Não: só aparece ao fim do run |
| Servidor mínimo em Python (env `mlagents`) lendo os eventos com `EventAccumulator` | Um JSON estável (`/status`) com só o que o app usa, mais a hora da última atualização | **Sim.** O contrato fica sob nosso controle |

\* Não encontrei documentação oficial da API HTTP do TensorBoard; por isso não foi usada.

Guardar o endereço do PC e a última leitura: `@react-native-async-storage/async-storage`, que
a documentação do Expo marca como incluso no Expo Go.

## Fontes oficiais lidas

Lidas e usadas:

- TanStack Query, `useQuery`: confirma `refetchInterval` ("refetch at this frequency in
  milliseconds"), `retry`, `error` e `dataUpdatedAt`.
  https://tanstack.com/query/latest/docs/framework/react/reference/useQuery
- TanStack Query, React Native: no React Native, voltar a buscar ao reconectar ou ao trazer o
  app para a frente **não** é automático (precisa de `onlineManager`/`focusManager`). A PoC não
  liga isso: o polling de 10 s já cobre o caso.
  https://tanstack.com/query/latest/docs/framework/react/react-native
- Expo, AsyncStorage: "Included in Expo Go"; instalação com `npx expo install`.
  https://docs.expo.dev/versions/latest/sdk/async-storage/
- Código do ML-Agents instalado no env (`mlagents/trainers/learn.py`, `run_training`): quando
  são gravados o `configuration.yaml` e o `training_status.json`.

Ainda a conferir:

- React Native, Networking: https://reactnative.dev/docs/network
- ML-Agents, Using TensorBoard: https://unity-technologies.github.io/ml-agents/Using-Tensorboard/

## Como a prova de conceito foi construída

Com agente de código (Claude Code), seguindo o AGENTS.md e os critérios do CRITERIOS.md,
escritos antes do código. Pacotes instalados com `npx expo install`, que escolheu as versões
do SDK 58: `@tanstack/react-query` 5.105 e `@react-native-async-storage/async-storage` 2.2.0.
`react-dom` e `react-native-web` entraram só para rodar no navegador (`npx expo start --web`).

Verificação no navegador, com o servidor rodando e um run de teste (cópia de um run real com a
data de modificação de agora), todos os critérios passaram:

- valores na tela iguais aos do arquivo de eventos (step 440.000, recompensa 2,794, lição Mixed);
- trocando o arquivo do run por um de outra lição, a tela mudou sozinha para MazeHeavy, step
  880.000, em ~4 s;
- servidor desligado: "Sem conexão com o PC" com os últimos valores e a hora; religado, volta
  sozinho para "Treinando";
- 5 min sem ponto novo: "Treino parado há 5 min";
- recarregando a página com o servidor desligado: o endereço continua no campo e os últimos
  valores aparecem com a hora em que foram recebidos.

Falta a verificação no celular (Expo Go), que é a que vale para o CRITERIOS.md.

## Onde a IA errou

- Pedido: encontrar uma fonte de dados para acompanhar o treino pelo celular.
- O que veio: a sugestão de usar o `training_status.json` porque "traz a lição atual do currículo".
- Como percebi: olhando a pasta de um run interrompido, `run_logs/` estava vazia. O arquivo só
  é gravado no fim do treino, justamente quando o acompanhamento já não importa.
- O certo: para um run em andamento, a fonte é o arquivo de eventos do TensorBoard
  (tag `Environment/Lesson Number/maze_enabled`).

- Pedido: montar o servidor que lê o treino e devolve o nome da lição.
- O que veio: a primeira versão tirava os nomes das lições do `configuration.yaml` do run.
- Como percebi: testando contra o run interrompido, `lesson.name` e `max_steps` vieram `null`.
  O arquivo não existia, e o código do ML-Agents mostra que ele só é gravado no fim do treino.
- O certo: usar o `configuration.yaml` quando ele existe e, num run em andamento, o yaml do
  `mlagents-learn` (opção `--config` do servidor).

- Pedido: o campo de endereço deveria mostrar o endereço salvo assim que ele fosse carregado.
- O que veio: um `useEffect` que copiava o endereço salvo para o estado do campo.
- Como percebi: o `npx expo lint` acusou `react-hooks/set-state-in-effect` ("Avoid calling
  setState() directly within an effect"), que causa renderizações em cascata.
- O certo: só montar o campo depois de o endereço sair do AsyncStorage, e usar o valor como
  estado inicial. Sem efeito nenhum.

- Pedido: ao reabrir o app com o PC desligado, mostrar os últimos valores salvos.
- O que veio: a tela mostrava os valores salvos com o aviso verde **"Treinando"** até o erro de
  conexão chegar, como se o valor antigo fosse atual.
- Como percebi: no teste no navegador, recarregando a página com o servidor desligado.
- O certo: valor salvo é só a última leitura conhecida. Enquanto não chega nenhuma resposta
  nova do PC, o aviso fica em "Conectando…".

## Resultado e próximos passos no TCC

- A PoC responde à pergunta: com `refetchInterval` e o `error` do react-query, o celular
  acompanha o run, distingue "PC fora do ar" de "treino parado" e não perde a última leitura.
  Faltou pouco código à mão, e o ponto difícil não estava no app: estava em achar uma fonte de
  dados que existe *durante* o treino.
- O que muda no TCC: os treinos longos podem ser acompanhados fora do PC, e um run que morreu
  (o caso que já custou treinos) aparece como "Treino parado" em 5 minutos, em vez de ser
  descoberto horas depois.
- Próximos passos: aviso por notificação (exige development build no Android, segundo a
  apostila) e gráfico da recompensa ao longo do run.
