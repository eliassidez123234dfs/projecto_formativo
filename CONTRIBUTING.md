# Guia de contribucion y metodologia de trabajo

Este documento define como contribuir al proyecto, la estructura de ramas, el flujo de trabajo con GitFlow y las buenas practicas para el equipo.

---

## Metodologia de trabajo

Actualmente usamos un flujo basado en **GitFlow** progresivo. Cada persona tiene su propia rama personal y los cambios pasan por una rama de integracion antes de llegar a `main`.

### Estructura de ramas

```
main                    # Produccion: codigo estable y desplegado
  └── integracion-total # Integracion: union de todas las ramas personales
       ├── jose         # Rama personal de Jose
       ├── elias        # Rama personal de Elias
       ├── tomas        # Rama personal de Tomas
       ├── manrique     # Rama personal de Manrique
       └── fix/*        # Ramas temporales para correcciones de errores
```

| Rama                | Proposito                                              |
|---------------------|--------------------------------------------------------|
| `main`              | Codigo en produccion, siempre estable                  |
| `integracion-total` | Integracion de todos los modulos, pruebas conjuntas    |
| `jose`              | Rama personal de Jose (modulos asignados)              |
| `elias`             | Rama personal de Elias                                 |
| `tomas`             | Rama personal de Tomas                                 |
| `manrique`          | Rama personal de Manrique                              |
| `fix/<descripcion>` | Rama temporal para corregir un error urgente           |
| `feature/<nombre>`  | Rama temporal para una funcionalidad nueva (GitFlow puro)|

---

## Flujo de trabajo diario

### 1. Actualizar tu rama personal

Siempre antes de empezar a trabajar, actualiza tu rama con `integracion-total`:

```bash
# Estando en tu rama personal (ej: jose)
git checkout jose
git pull origin jose

# Trae los cambios mas recientes de integracion-total
git pull origin integracion-total
```

Si hay conflictos, resuelvelos antes de continuar.

### 2. Hacer cambios en tu rama

Trabaja en tu rama personal haciendo commits pequenos y descriptivos:

```bash
git add <archivos>
git commit -m "Tipo: descripcion breve del cambio"

# Ejemplos de mensajes de commit:
# "Feat: agregar filtro por precio en catalogo"
# "Fix: error 500 al registrar usuario sin email"
# "Refactor: simplificar logica de carrito"
# "Docs: actualizar SETUP_GUIDE con seed data"
```

### 3. Subir cambios a tu rama remota

```bash
git push origin jose
```

### 4. Crear Pull Request a integracion-total

Cuando tu modulo esta listo para integrarse:

1. Ve a https://github.com/eliassidez123234dfs/projecto_formativo
2. Crea un Pull Request desde `tu-rama` hacia `integracion-total`
3. Describe los cambios realizados y los modulos afectados
4. Asigna revisores al PR

### 5. Fusion (merge) y Pull Requests

**Fusion manual desde terminal:**

```bash
# Cambiar a integracion-total y actualizar
git checkout integracion-total
git pull origin integracion-total

# Fusionar tu rama
git merge jose

# Resolver conflictos si los hay
# git add <archivos-resueltos>
# git commit -m "Merge branch 'jose' into integracion-total"

# Subir los cambios
git push origin integracion-total
```

**Mediante Pull Request en GitHub:**
- Crea el PR desde tu rama a `integracion-total`
- Espera revision y aprobacion
- Haz "Merge pull request" desde la interfaz de GitHub

### 6. De integracion-total a main

Cuando `integracion-total` esta estable y probado:

1. Crea un Pull Request desde `integracion-total` hacia `main`
2. El equipo revisa los cambios
3. Se fusiona a `main`
4. Se hace un tag (opcional): `git tag v1.0.0 && git push origin v1.0.0`

```bash
git checkout main
git pull origin main
git merge integracion-total
git push origin main
```

---

## Ramas temporales

Puedes crear ramas temporales desde tu rama personal o desde `integracion-total` para:

- **Corregir errores urgentes:** `fix/error-login-google`
- **Probar una funcionalidad:** `feature/notificaciones-email`
- **Guardar cambios a medias:** `temp/respaldo-antes-refactor`

```bash
# Crear rama temporal desde integracion-total
git checkout -b fix/error-carrito-stock

# Hacer los cambios, commit, push
git add .
git commit -m "Fix: validar stock antes de agregar al carrito"
git push origin fix/error-carrito-stock

# Fusionar de vuelta
git checkout integracion-total
git merge fix/error-carrito-stock
git branch -d fix/error-carrito-stock                     # Borrar local
git push origin --delete fix/error-carrito-stock           # Borrar remota
```

---

## Commits: buenas practicas

### Estructura del mensaje

```
<Tipo>: <descripcion breve>

<Cuerpo opcional con detalles>
```

### Tipos de commit

| Tipo       | Cuando usarlo                                   |
|------------|-------------------------------------------------|
| `Feat:`    | Nueva funcionalidad                             |
| `Fix:`     | Correccion de error                             |
| `Refactor:`| Cambio de codigo que no agrega funcionalidad    |
| `Docs:`    | Cambios en documentacion                        |
| `Style:`   | Formato, lint, espacios                         |
| `Test:`    | Agregar o modificar tests                       |
| `Chore:`   | Tareas de mantenimiento (deps, configuracion)   |
| `Merge:`   | Fusion de ramas                                 |

### Ejemplos

```
Feat: agregar endpoint de busqueda por talla y color
Fix: error 500 al crear producto sin imagen
Refactor: extraer logica de validacion a servicio separado
Docs: actualizar SETUP_GUIDE con seed data y Docker
```

---

## Conflictos de merge

Cuando ocurren conflictos al hacer `git merge` o `git pull`:

```bash
# Ver archivos en conflicto
git status

# Resolver manualmente cada archivo
# Edita los archivos, busca las marcas <<<<<<<, =======, >>>>>>>
# Decide que codigo conservar

# Marcar como resuelto y continuar
git add <archivos-resueltos>
git commit -m "Resolve merge conflict in <archivo>"

# O abortar el merge si es necesario
git merge --abort
```

---

## Ver el estado actual del repositorio

```bash
# Estado del working tree
git status

# Historial de commits
git log --oneline --graph --all -20

# Ver ramas locales y remotas
git branch -a

# Diferencia entre dos ramas
git diff main..integracion-total

# Ver commits de una rama que no estan en main
git log main..integracion-total --oneline
```

### Estado en GitHub

1. Ve a https://github.com/eliassidez123234dfs/projecto_formativo
2. Para ver ramas: pestaña "Code" > "Branches"
3. Para Pull Requests activos: pestaña "Pull requests"
4. Para revisar commits: pestaña "Code" > "Commits" (o en cada rama)

---

## Estilo de codigo

### Python / Django

- Sigue PEP 8
- Usa `black` para formatear: `black .`
- Funciones y clases con responsabilidad unica
- Comentarios solo cuando el codigo no sea autoexplicativo
- Nombres de variables en `snake_case`

### JavaScript / React

- ES6+ moderno
- Componentes pequenos y reutilizables
- `const` y `let`, evitar `var`
- Evitar logica compleja dentro del JSX

### Commits y PRs

- Commits atomicos (un cambio por commit)
- Mensajes descriptivos en ingles o espanol
- PRs con descripcion clara del cambio y motivacion
- No incluir archivos `.env`, `venv/`, `node_modules/`, `__pycache__/`

---

## Archivos que no se suben al repositorio

`.gitignore` ya excluye:

```
.env
venv/
node_modules/
__pycache__/
*.pyc
db.sqlite3
media/
.DS_Store
```

Nunca subas credenciales, claves API o archivos de configuracion sensibles.

---

## Si trabajas en Windows

- Usa `python` en lugar de `python3`
- El entorno virtual se activa con `venv\Scripts\activate`
- Las rutas usan `\` en lugar de `/`
- Git Bash desde Git for Windows funciona bien para comandos git

---

## Referencia rapida de comandos git

```bash
# Ramas
git branch                              # Listar ramas locales
git branch -a                           # Listar todas (locales y remotas)
git checkout <rama>                     # Cambiar de rama
git checkout -b <rama>                  # Crear y cambiar a nueva rama
git branch -d <rama>                    # Borrar rama local

# Actualizar
git pull origin <rama>                  # Traer cambios de rama remota
git push origin <rama>                  # Subir cambios a rama remota

# Fusionar
git merge <rama>                        # Fusionar rama en la actual
git merge --abort                       # Abortar fusion con conflictos

# Pull Requests (requiere gh CLI)
gh pr create --base integracion-total   # Crear PR
gh pr list                              # Listar PRs
gh pr checkout <numero>                 # Revisar PR localmente

# Utilidades
git log --oneline --graph --all         # Ver historial grafico
git stash                               # Guardar cambios temporales
git stash pop                           # Recuperar cambios guardados
```
