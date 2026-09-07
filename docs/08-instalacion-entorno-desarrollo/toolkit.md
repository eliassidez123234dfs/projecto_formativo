# Toolkit recomendado para desarrollo

> Herramientas, extensiones, IDEs y recursos de IA recomendados para trabajar con este proyecto.  
> Para el índice completo de documentación consulta [README.md](../README.md).

---

## Indice

- [IDEs y editores](#ides-y-editores)
- [Extensiones para VS Code / Cursor / Windsurf](#extensiones-para-vs-code--cursor--windsurf)
- [Asistentes de IA](#asistentes-de-ia)
- [Terminal y sistema](#terminal-y-sistema)
- [Gestion de secretos y seguridad](#gestion-de-secretos-y-seguridad)
- [Herramientas Python](#herramientas-python)
- [Herramientas Node.js](#herramientas-nodejs)
- [Contenedores y Docker](#contenedores-y-docker)
- [Utilidades de desarrollo](#utilidades-de-desarrollo)
- [Stack del proyecto](#stack-del-proyecto)

---

## IDEs y editores

| Herramienta | Propósito | Instalacion |
|-------------|-----------|-------------|
| [Cursor](https://cursor.com) | Editor con IA integrada (recomendado) | `cursor` (si instalado como RPM) |
| [Windsurf](https://codeium.com/windsurf) | Editor con IA nativa | `windsurf` |
| [VS Code](https://code.visualstudio.com) | Editor generico | `code` |
| [Antigravity IDE](https://antigravity.google) | IDE con agente autonomo | `antigravity-ide` |

> Todos los editores anteriores soportan el ecosistema de extensiones de VS Code.

## Extensiones para VS Code / Cursor / Windsurf

### Esenciales

| Extension | Por que |
|-----------|---------|
| [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) | Soporte Python: Intellisense, debugging, linting |
| [Pylance](https://marketplace.visualstudio.com/items?itemName=ms-python.vscode-pylance) | Analisis estatico de Python (type checking) |
| [Django](https://marketplace.visualstudio.com/items?itemName=batisteo.vscode-django) | Snippets y navegacion para Django |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | Linting para JavaScript/React |
| [Vite](https://marketplace.visualstudio.com/items?itemName=antfu.vite) | Integracion con Vite |
| [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | Formateador de codigo |
| [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens) | Visualizacion avanzada de Git |
| [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) | Muestra errores en linea |

### Django y Python

| Extension | Por que |
|-----------|---------|
| [Python Docstring Generator](https://marketplace.visualstudio.com/items?itemName=njpwerner.autodocstring) | Genera docstrings automaticamente |
| [Python Test Explorer](https://marketplace.visualstudio.com/items?itemName=LittleFoxTeam.vscode-python-test-adapter) | Descubre y ejecuta tests |
| [autoDocstring](https://marketplace.visualstudio.com/items?itemName=njpwerner.autodocstring) | Docstrings al vuelo |

### React y Frontend

| Extension | Por que |
|-----------|---------|
| [ES7+ React/Redux snippets](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets) | Snippets para React |
| [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) | Autocompletado de clases Tailwind |
| [CSS Modules](https://marketplace.visualstudio.com/items?itemName=clinyong.vscode-css-modules) | Soporte para modulos CSS |
| [Path Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense) | Autocompletado de rutas |

### Utilidades generales

| Extension | Por que |
|-----------|---------|
| [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) | Autocompletado de codigo por IA |
| [GitHub Pull Requests](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github) | Gestionar PRs desde el editor |
| [Docker](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) | Gestion de contenedores desde el editor |
| [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) | Desarrollo dentro de contenedores |
| [YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) | Soporte YAML (Docker, CI/CD) |
| [Markdown Preview Mermaid](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) | Diagramas Mermaid en markdown |
| [Thunder Client](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client) | Cliente HTTP para probar APIs |
| [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) | Pruebas de API desde archivos .http |
| [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) | Iconos descriptivos para archivos |
| [One Dark Pro](https://marketplace.visualstudio.com/items?itemName=zhuangtongfa.Material-theme) | Tema oscuro popular |

## Asistentes de IA

| Herramienta | Proposito | Instalacion / Uso |
|-------------|-----------|-------------------|
| [OpenCode](https://opencode.ai) | Agente de IA para terminal | `npm install -g opencode-ai` o `opencode` |
| [Aider](https://aider.chat) | Pair programming con IA en terminal | `curl -LsSf https://aider.chat/install.sh \| sh` o `aider` |
| [GitHub Copilot](https://github.com/features/copilot) | Autocompletado en el editor | Extension en VS Code/Cursor |
| [diff2ai](https://github.com/anomalyco/diff2ai) | Revisar cambios con IA | `npm install -g diff2ai` o `diff2ai review main` |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Agente de Anthropic en terminal | `npm install -g @anthropic-ai/claude-code` |
| [Codex CLI](https://github.com/openai/codex) | Agente de OpenAI en terminal | Via npm |
| [Auxly](https://auxly.ai) | Gestion de tareas con IA vía MCP | Integrado via `.cursor/rules/` y MCP |
| [Antigravity](https://antigravity.google) | Agente autonomo de Google | `agy login` + `agy "tarea"` |

### Recomendacion segun el caso

| Si necesitas... | Usa |
|-----------------|-----|
| Autocompletado en el editor | GitHub Copilot + Cursor AI |
| Refactorizar o depurar codigo | Aider, OpenCode o Claude Code |
| Revisar cambios antes de commit | diff2ai (ver `diff2ai review main --copy`) |
| Gestionar tareas con trazabilidad | Auxly (via MCP en Cursor) |
| Automatizar flujos complejos | Antigravity CLI |

## Terminal y sistema

| Herramienta | Uso | Instalacion |
|-------------|-----|-------------|
| [tmux](https://github.com/tmux/tmux) | Multiplexor de terminal (paneles, sesiones) | `sudo dnf install tmux -y` |
| [Terminator](https://gnome-terminator.org) | Terminal con paneles arrastrables | `sudo dnf install terminator -y` |
| [Tilix](https://gnunn1.github.io/tilix-web/) | Terminal GTK3 con diseno de ventanas | `sudo dnf install tilix -y` |
| [kitty](https://sw.kovidgoyal.net/kitty/) | Terminal GPU acelerada | `sudo dnf install kitty -y` |
| [htop](https://htop.dev) | Monitor de procesos interactivo | `sudo dnf install htop -y` |
| [btop](https://github.com/aristocratos/btop) | Monitor de recursos con graficos | `sudo dnf install btop -y` |
| [ncdu](https://dev.yorhel.nl/ncdu) | Analizador de espacio en disco | `sudo dnf install ncdu -y` |
| [fd](https://github.com/sharkdp/fd) | Busqueda de archivos rapida | `sudo dnf install fd-find -y` |
| [ripgrep](https://github.com/BurntSushi/ripgrep) | Busqueda en texto ultra rapida | `sudo dnf install ripgrep -y` |
| [exa](https://github.com/ogham/exa) | `ls` moderno con colores y arbol | `sudo dnf install exa -y` |
| [tldr](https://tldr.sh) | Ejemplos rapidos de comandos | `sudo dnf install tldr -y` |

### Aliases utiles para el proyecto

Agrega esto a tu `~/.bashrc` o `~/.zshrc`:

```bash
alias update-all='sudo dnf upgrade --refresh -y && flatpak update -y'
alias ram='smem -rk -t | head'
alias tree-proyecto='tree -L 3 -I "node_modules|.git|__pycache__|*.pyc|dist"'
alias docker-clean='docker system prune -a -f --volumes'
```

## Gestion de secretos y seguridad

| Herramienta | Proposito | Uso |
|-------------|-----------|-----|
| [ggshield](https://docs.gitguardian.com/ggshield-docs) | Escanea codigo en busca de secretos | `ggshield secret scan repo .` |
| Pre-commit hook de ggshield | Evita commits con secretos | `ggshield install -m local -t pre-commit` |
| [GitGuardian dashboard](https://dashboard.gitguardian.com) | Monitoreo de repos en GitHub | Via web |

### Flujo recomendado antes de cada commit

```bash
# 1. Verificar que no hay secretos en los cambios
ggshield secret scan pre-commit

# 2. Si hay falsos positivos, anadirlos a .gitguardian.yml
# 3. Hacer commit solo si el escaneo pasa
git add .
git commit -m "mensaje"
```

> **Importante:** Despues de exponer una credencial, revocarla inmediatamente y purgar el historial con `git filter-branch` o BFG Repo Cleaner.

## Herramientas Python

| Herramienta | Uso | Instalacion |
|-------------|-----|-------------|
| [pipx](https://github.com/pypa/pipx) | Instalar apps Python en entornos aislados | `sudo dnf install pipx -y` |
| [black](https://github.com/psf/black) | Formateador de Python | `pipx install black` |
| [ruff](https://github.com/astral-sh/ruff) | Linter y formateador ultra rapido | `pipx install ruff` |
| [mypy](https://mypy-lang.org) | Type checker para Python | `pipx install mypy` |
| [django-extensions](https://github.com/django-extensions/django-extensions) | Utilidades extra para Django | En `requirements.txt` |
| [virtualenv](https://virtualenv.pypa.io) | Entornos virtuales clasicos | `python3 -m venv venv` |
| [Python 3.12+](https://www.python.org) | Version del proyecto | `sudo dnf install python3.12` |

### Flujo diario Python

```bash
# Activar entorno virtual
source backend/venv/bin/activate

# Formatear codigo
black backend/

# Lintear
ruff check backend/

# Type check
mypy backend/
```

## Herramientas Node.js

| Herramienta | Uso | Instalacion |
|-------------|-----|-------------|
| [nvm](https://github.com/nvm-sh/nvm) | Gestor de versiones de Node | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh \| bash` |
| [Node.js LTS](https://nodejs.org) | Entorno de ejecucion | `nvm install --lts && nvm use --lts` |
| npm | Gestor de paquetes | Viene con Node.js |

## Contenedores y Docker

| Herramienta | Uso | Instalacion |
|-------------|-----|-------------|
| [Docker Engine](https://docs.docker.com/engine/install/fedora/) | Contenedores (via moby-engine) | `sudo dnf install moby-engine docker-cli containerd` |
| [Docker Compose](https://docs.docker.com/compose/) | Orquestacion multi-contenedor | Viene con Docker |
| [Podman](https://podman.io) | Alternativa sin demonio (nativa Fedora) | `sudo dnf install podman -y` |

### Comandos frecuentes

```bash
# Iniciar Docker (si esta enmascarado)
sudo systemctl unmask containerd docker.socket docker.service
sudo systemctl start docker

# Construir y levantar el proyecto
docker compose up --build

# Ver logs
docker compose logs -f

# Ejecutar migraciones
docker compose exec backend python manage.py migrate

# Podman (sin demonio)
podman compose up --build
```

## Utilidades de desarrollo

| Herramienta | Uso |
|-------------|-----|
| `tree` | Mostrar estructura de directorios |
| `jq` | Procesar JSON en terminal |
| `curl` | Probar APIs desde terminal |
| `httpie` | Alternativa a curl con colores |
| `pwgen` | Generar contrasenas seguras |
| `shellcheck` | Analizar scripts bash |
| `git-extras` | Comandos git adicionales |
| `gh` | GitHub CLI (para PRs, issues, etc.) |
| `diff-so-fancy` | Mejora visual de `git diff` |

### Instalacion rapida de utilidades

```bash
sudo dnf install -y tree jq httpie pwgen ShellCheck gh git-extras diff-so-fancy
```

## Stack del proyecto

| Capa | Tecnologia |
|------|------------|
| Backend | Python 3.12, Django 5.2, DRF 3.16, JWT (SimpleJWT), Celery |
| Frontend | React 19, Vite 8, Axios, React Router, Sass |
| Editor 3D | Three.js, @react-three/fiber, @react-three/drei |
| Estilos | Tailwind CSS, Sass |
| BD | SQLite (dev) / PostgreSQL (prod) |
| Cache / Colas | Redis + Celery |
| Almacenamiento | Cloudinary (imagenes, modelos 3D) |
| Contenedores | Docker + Docker Compose |
| Versionado | Git + GitHub (GitFlow progresivo) |

### Ramas del repositorio

```
main                    # Produccion
  └── integracion-total # Integracion
       ├── jose         # Rama personal
       ├── elias        # Rama personal
       ├── tomas        # Rama personal
       ├── manrique     # Rama personal
       └── fix/*        # Correcciones
```

---

## Referencias de Documentación del Proyecto

| Documento | Descripción |
|-----------|-------------|
| [`docs/diagrams/modelo-clases.puml`](diagrams/modelo-clases.puml) | Diagrama de clases PlantUML con todas las entidades del sistema |
| [`docs/diagrams/casos-uso.puml`](diagrams/casos-uso.puml) | Diagrama de casos de uso con actores y funcionalidades |
| [`docs/diagrams/secuencia-checkout.puml`](diagrams/secuencia-checkout.puml) | Diagrama de secuencia del flujo de checkout con Wompi |
| [`docs/diagrams/despliegue.puml`](diagrams/despliegue.puml) | Diagrama de despliegue con nodos y servicios externos |
| [`docs/PATRONES_DISENO.md`](PATRONES_DISENO.md) | Catálogo de patrones de diseño aplicados (MVC, Adapter, Strategy, etc.) |
| [`docs/BITACORA.md`](BITACORA.md) | Bitácora de trabajo con hitos semanales del desarrollo |
| [`docs/MODELO_ARQUITECTONICO.md`](MODELO_ARQUITECTONICO.md) | Descripción del modelo arquitectónico (monolito modular, capas, flujos) |

---

> Manten este documento actualizado a medida que el equipo adopte nuevas herramientas.
