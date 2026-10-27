# Servidor mínimo para acompanhar um treino de ML-Agents pelo celular: o lado do PC da prova de conceito.
# GET /status devolve em JSON o último ponto do TensorBoard do run: step, recompensa, duração de episódio e lição.
#
# Uso (ambiente mlagents, que já tem tensorboard e pyyaml; na raiz deste repositório):
#   python server/training_status_server.py                # PROJECT-IA ao lado deste repo, porta 8000
#   python server/training_status_server.py --project C:\caminho\PROJECT-IA
#   python server/training_status_server.py --config C:\caminho\PROJECT-IA\config\free_v9.yaml   # o yaml do mlagents-learn
#   curl http://localhost:8000/status
#   curl "http://localhost:8000/status?run=seekertestenovo102"
#
# A fonte é o arquivo de eventos, e não o run_logs/training_status.json: esse só é gravado no fim do run, e um treino
# em andamento (ou interrompido com Ctrl+C) não tem.
# No celular, "localhost" é o próprio celular: use o IP que aparece no Console, com o PC na mesma rede. O Firewall do
# Windows pergunta na primeira vez; libere em rede privada.
import argparse, glob, json, math, os, socket, sys, time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# O treino roda no projeto Unity, em outro repositório; por padrão, o clone dele na mesma pasta que este.
DEFAULT_PROJECT = os.path.join(os.path.dirname(ROOT), "PROJECT-IA")
RESULTS = os.path.join(DEFAULT_PROJECT, "results")

REWARD = "Environment/Cumulative Reward"
EPISODE_LENGTH = "Environment/Episode Length"
LESSON_PREFIX = "Environment/Lesson Number/"

# Reler o arquivo de eventos inteiro a cada pedido custa caro num run longo, e o arquivo só muda a cada summary_freq.
_cache = {}


def event_files(run_dir):
    return glob.glob(os.path.join(run_dir, "*", "events.out.tfevents*"))


def latest_run():
    runs = [d for d in glob.glob(os.path.join(RESULTS, "*")) if event_files(d)]
    if not runs:
        return None
    return os.path.basename(max(runs, key=lambda d: max(os.path.getmtime(f) for f in event_files(d))))


def load_scalars(path):
    stat = os.stat(path)
    key = (stat.st_mtime, stat.st_size)
    cached = _cache.get(path)
    if cached and cached[0] == key:
        return cached[1]
    from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
    ea = EventAccumulator(path, size_guidance={"scalars": 0})
    ea.Reload()
    series = {tag: [(e.step, e.value) for e in ea.Scalars(tag)] for tag in ea.Tags()["scalars"]}
    _cache[path] = (key, series)
    return series


def last_point(series, tag):
    points = series.get(tag)
    if not points:
        return None, None
    step, value = max(points)
    # NaN/Infinity viram JSON inválido para o JSON.parse do app.
    return step, value if math.isfinite(value) else None


def run_config(run_dir, fallback):
    # O configuration.yaml do run é o currículo que ele usou de fato, mas o ML-Agents só o grava no fim (finally do
    # run_training, em mlagents/trainers/learn.py). Run em andamento usa o yaml passado em --config.
    path = os.path.join(run_dir, "configuration.yaml")
    if not os.path.isfile(path):
        path = fallback
    if not path or not os.path.isfile(path):
        return {}
    import yaml
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def lesson_names(config, parameter):
    curriculum = ((config.get("environment_parameters") or {}).get(parameter) or {}).get("curriculum") or []
    return [lesson.get("name") for lesson in curriculum]


def max_steps(config, behavior):
    return ((config.get("behaviors") or {}).get(behavior) or {}).get("max_steps")


def status(run, fallback_config):
    run_dir = os.path.join(RESULTS, run)
    files = event_files(run_dir)
    if not files:
        return None
    # Mais de um behavior no run: vale o que foi escrito por último.
    behavior_dir = os.path.dirname(max(files, key=os.path.getmtime))
    behavior = os.path.basename(behavior_dir)

    # Um --resume cria outro arquivo de eventos, e a curva fica espalhada entre eles.
    series = {}
    for path in sorted(glob.glob(os.path.join(behavior_dir, "events.out.tfevents*"))):
        for tag, points in load_scalars(path).items():
            series.setdefault(tag, []).extend(points)

    step, reward = last_point(series, REWARD)
    _, episode_length = last_point(series, EPISODE_LENGTH)

    config = run_config(run_dir, fallback_config)
    lesson = None
    lesson_tags = [tag for tag in series if tag.startswith(LESSON_PREFIX)]
    if lesson_tags:
        tag = lesson_tags[0]
        _, number = last_point(series, tag)
        if number is not None:
            number = int(round(number))
            names = lesson_names(config, tag[len(LESSON_PREFIX):])
            lesson = {"number": number, "name": names[number] if number < len(names) else None}

    updated = max(os.path.getmtime(f) for f in files)
    return {
        "run": run,
        "behavior": behavior,
        "step": step,
        "max_steps": max_steps(config, behavior),
        "cumulative_reward": reward,
        "episode_length": episode_length,
        "lesson": lesson,
        "last_update": datetime.fromtimestamp(updated, timezone.utc).isoformat(),
        "seconds_since_update": round(time.time() - updated, 1),
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        if url.path != "/status":
            return self.reply(404, {"error": "Rota inexistente. Use /status."})
        run = parse_qs(url.query).get("run", [None])[0] or latest_run()
        if run is None:
            return self.reply(404, {"error": "Nenhum run com arquivo de eventos em results/."})
        # run vem do celular: sem isso, "../" lê pastas fora de results/.
        if os.path.basename(run) != run:
            return self.reply(400, {"error": "run inválido."})
        body = status(run, self.server.fallback_config)
        if body is None:
            return self.reply(404, {"error": f"Run '{run}' não tem arquivo de eventos."})
        self.reply(200, body)

    def reply(self, code, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        # O Expo também roda no navegador (tecla w), e lá o fetch para outra porta exige CORS.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)


def lan_ip():
    # UDP não envia nada no connect; só faz o sistema escolher a interface de rede que sai para fora.
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        try:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
        except OSError:
            return "127.0.0.1"


def main():
    global RESULTS
    sys.stdout.reconfigure(errors="replace")
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--project", default=DEFAULT_PROJECT, help="pasta do projeto Unity, a que tem results/")
    parser.add_argument("--config", help="yaml do mlagents-learn, para runs que ainda não gravaram o configuration.yaml "
                                         "(padrão: config/seeker_curriculum.yaml do projeto)")
    args = parser.parse_args()

    RESULTS = os.path.join(args.project, "results")
    if not os.path.isdir(RESULTS):
        sys.exit(f"Não achei {RESULTS}. Aponte o projeto Unity com --project.")

    server = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    server.fallback_config = args.config or os.path.join(args.project, "config", "seeker_curriculum.yaml")
    print(f"Run padrão: {latest_run() or '(nenhum ainda)'}")
    print(f"No celular: http://{lan_ip()}:{args.port}/status   (Ctrl+C para parar)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
