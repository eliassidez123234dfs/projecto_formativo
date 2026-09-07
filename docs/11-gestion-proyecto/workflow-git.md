# Workflow Git — RED Estampación

> Flujo de trabajo Git definido para evitar conflictos y pérdida de trabajo.
> Establecido después de incidente de sobreescritura de ramas.

---

## Principios Fundamentales

1. **main** — Solo recibe merges desde `integracion-total`. Nunca push directo.
2. **integracion-total** — Rama de integración. Solo recibe merges desde ramas personales.
3. **Ramas personales** (jose, elias, manrique, tomas) — Desarrollo individual.
4. **NUNCA** hacer `git push origin main` o `git push origin integracion-total` directamente.

---

## Flujo Diario

### 1. Trabajar en rama personal

```bash
# Asegurarse de estar en la rama personal
git checkout jose

# Traer cambios de integracion-total (por si alguien más mergeó)
git fetch origin
git merge origin/integracion-total
# Resolver conflictos si los hay

# Trabajar normalmente
git add .
git commit -m "feat: descripción clara del cambio"
git push origin jose
```

### 2. Antes de hacer merge a integracion-total

```bash
# 1. Verificar que todo funciona
cd backend && source venv/bin/activate
python manage.py check
python manage.py test apps.mi_app.tests --keepdb
cd ../frontend && npm run build

# 2. Volver a la rama personal
git checkout jose

# 3. Traer la última versión de integracion-total
git fetch origin
git merge origin/integracion-total

# 4. Resolver conflictos (si los hay)
# git mergetool  # o manualmente

# 5. Verificar que sigue funcionando después del merge
cd backend && source venv/bin/activate && python manage.py check
cd ../frontend && npm run build

# 6. Subir rama personal actualizada
git push origin jose
```

### 3. Merge a integracion-total (solo 1 persona coordinada)

```bash
# Desde la rama personal actualizada
git checkout integracion-total
git pull origin integracion-total  # asegurar última versión

# Hacer merge de la rama personal
git merge jose --no-ff  # --no-ff crea un commit de merge visible

# Resolver conflictos
# git mergetool

# Verificar integración completa
cd backend && source venv/bin/activate && python manage.py check
python manage.py test --keepdb  # TODOS los tests
cd ../frontend && npm run build

# Actualizar documentación
# vim docs/CHANGELOG.md
# vim docs/BITACORA.md

# Subir
git push origin integracion-total
```

### 4. Merge a main (solo releases estables)

```bash
git checkout main
git pull origin main
git merge integracion-total --no-ff
git tag -a v1.0.0 -m "Release v1.0.0: descripción"
git push origin main --tags
```

---

## Diagrama de Flujo

```
        jose ────┐
        elias ────┤
      manrique ───┤
        tomas ────┤
                  │
                  ▼
         integracion-total
                  │
        (pruebas + docs)
                  │
                  ▼
                main
                  │
            (producción)
```

---

## Política de Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:      Nueva funcionalidad
fix:       Corrección de bug
refactor:  Cambio de código sin cambio funcional
docs:      Cambios en documentación
test:      Cambios en tests
style:     Cambios de formato (CSS, espacios, etc.)
chore:     Cambios en build, herramientas, dependencias
perf:      Mejoras de rendimiento
security:  Parches de seguridad
```

Ejemplos:
```
feat(products): agregar filtro por rango de precio
fix(cart): corregir migración de carrito anónimo a autenticado
docs(api): documentar endpoint de checkout
test(users): agregar test para rate limiting en login
```

---

## Prevención de Conflictos Comunes

### ❌ Error: Push directo a integracion-total

```bash
# MAL
git push origin integracion-total  # Desde cualquier rama

# BIEN
git checkout integracion-total
git merge jose --no-ff
git push origin integracion-total
```

### ❌ Error: Fast-forward sin verificar

```bash
# MAL
git merge jose  # Fast-forward: no deja rastro del merge

# BIEN
git merge jose --no-ff  # Crea commit de merge explícito
```

### ❌ Error: No actualizar rama personal antes del merge

```bash
# MAL
git checkout integracion-total
git merge jose  # jose no tiene últimos cambios de integracion-total

# BIEN
git checkout jose
git merge origin/integracion-total  # Primero traer cambios
git push origin jose
git checkout integracion-total
git merge jose --no-ff
```

### ❌ Error: Sobreescritura de ramas

```bash
# MAL
git push origin main  # Sin PR, sin verificación

# BIEN
# Seguir el flujo: personal → integracion-total → main
```

---

## Resolución de Conflictos

### Pasos para resolver conflictos

```bash
# 1. Identificar archivos en conflicto
git status

# 2. Abrir cada archivo y buscar marcadores
# <<<<<<< HEAD  (versión actual)
# =======      (separador)
# >>>>>>> jose  (versión que se mergea)

# 3. Editar para quedarse con la versión correcta
# Eliminar los marcadores y dejar el código deseado

# 4. Marcar como resuelto
git add archivo_resuelto.py

# 5. Continuar el merge
git commit
```

### Estrategias de resolución

- **Si ambos cambiaron el mismo archivo pero diferentes secciones**: Tomar ambos cambios.
- **Si ambos cambiaron la misma línea**: Decidir cuál versión es correcta o combinar.
- **Si eliminaste un archivo que la otra rama modificó**: Decidir si restaurarlo o mantenerlo eliminado.

---

## Tags y Releases

```bash
# Listar tags
git tag -l

# Crear tag semántico
git tag -a v1.0.0 -m "Release v1.0.0"

# Subir tags
git push origin --tags
```

---

## Recuperación de Errores

### Si accidentalmente hiciste push a la rama equivocada:

```bash
# NO hacer git push --force (a menos que sea tu única opción y coordinado)

# Opción 1: Revertir el commit (seguro)
git revert HEAD  # Crea un commit que deshace los cambios
git push origin main

# Opción 2: Restablecer a un commit anterior (destructivo, coordinar)
git reset --hard <commit-hash>
git push --force-with-lease origin main  # --force-with-lease es más seguro que --force
```

### Si perdiste commits locales:

```bash
git reflog  # Muestra el historial de movimientos de HEAD
git reset --hard HEAD@{n}  # Volver a un estado anterior
```
