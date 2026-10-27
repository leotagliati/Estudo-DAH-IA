# Critérios de aceitação

- [ ] Com um treino rodando no PC, a tela mostra o nome do run, o step atual e a
      `Cumulative Reward` do último ponto, iguais aos que o TensorBoard mostra para o mesmo step.
- [ ] A tela mostra a lição atual pelo nome (OpenRoom, Mixed ou MazeHeavy). Quando o currículo
      avança, o nome muda sozinho, sem tocar em nada, em até um intervalo de polling.
- [ ] Desligando o servidor no PC, aparece "Sem conexão com o PC" junto com o último valor
      recebido e a hora dele. A tela não fica em branco e o app não fecha.
- [ ] Se o step não muda há mais de 5 minutos com o servidor respondendo, o app mostra
      "Treino parado". (Medido em 9 runs: entre dois pontos passam ~40 s, no pior caso 1,8 min.)
- [ ] O endereço do PC é digitado na própria tela; ao fechar e abrir o app, ele continua lá.
- [ ] Ao fechar e reabrir o app com o servidor desligado, os últimos valores aparecem com a
      hora de quando foram recebidos.

**Verificado em:** ( ) aparelho físico ( ) emulador
**Resultado:** ( ) passou ( ) reprovou
