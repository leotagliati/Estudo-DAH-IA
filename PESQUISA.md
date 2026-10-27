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
  normal vira alarme falso.

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
| `fetch` + `useEffect` com `setInterval`      | Polling simples, o que já foi visto em aula (apostila 2) | [comparar: limpeza do intervalo, estado de erro e de carregamento feitos à mão] |
| `@tanstack/react-query` com `refetchInterval` | Polling com cache, retry e estados de erro prontos  | [candidata principal, a confirmar na documentação] |
| WebSocket                                    | O servidor empurra cada atualização                 | [provavelmente não: os dados mudam a cada ~20k steps, então tempo real não ajuda] |

De onde saem os dados no PC:

| Opção                                                            | Serve para                                       | Decisão |
|------------------------------------------------------------------|--------------------------------------------------|---------|
| API HTTP do próprio TensorBoard (`tensorboard --logdir results`)  | Nada novo para rodar no PC                       | [conferir: as rotas internas não são API documentada e podem mudar entre versões*] |
| `training_status.json`                                           | Lição e recompensa por checkpoint                | Não: só aparece ao fim do run |
| Servidor mínimo em Python (env `mlagents`) lendo os eventos com `EventAccumulator` | Um JSON estável (`/status`) com só o que o app usa, mais a hora da última atualização | [candidata: o contrato fica sob nosso controle] |

\* Informação ainda não confirmada em fonte oficial.

## Fontes oficiais lidas

A conferir: abrir cada uma antes de citar.

- TanStack Query, `useQuery` (`refetchInterval`, `refetchIntervalInBackground`):
  https://tanstack.com/query/latest/docs/framework/react/reference/useQuery
- React Native, Networking: https://reactnative.dev/docs/network
- Expo, Store data: https://docs.expo.dev/develop/user-interface/store-data
- Expo, Development builds × Expo Go: https://docs.expo.dev/develop/development-builds/introduction/
- ML-Agents, Using TensorBoard: https://unity-technologies.github.io/ml-agents/Using-Tensorboard/

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

- Pedido: [próximo]
- O que veio: [ ]
- Como percebi: [ ]
- O certo: [ ]

## Resultado e próximos passos no TCC

- [o que a prova de conceito demonstrou e o que muda no TCC]
