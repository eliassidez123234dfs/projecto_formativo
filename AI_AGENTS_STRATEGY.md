# Estrategia de Agentes IA — RED Estampación

> Cómo usar múltiples asistentes de IA con tokens gratuitos limitados

---

## 1. Agentes Disponibles

| Agente | Fortaleza Principal | Límite Gratuito | Mejor Para |
|--------|-------------------|-----------------|------------|
| **OpenCode** | Arquitectura, planificación, orquestación | ~100 requests/día | Orquestación, código completo, debug |
| **GitHub Copilot** | Autocompletado en IDE | Ilimitado (estudiante) | Código inline, funciones pequeñas |
| **Claude Code** | Análisis, refactor, documentación | ~45 requests/5h | Documentación, refactor, revisión |
| **Aider** | Edición de código en terminal | Ilimitado (local) | Ediciones rápidas en archivos |
| **Blackbox AI** | Búsqueda de código, snippets | ~20 requests/día | Consultas rápidas, ejemplos |
| **Windsurf** | Flujo de trabajo integrado | ~500 requests/mes | Desarrollo frontend React |

---

## 2. Asignación por Módulo

| Módulo | Agente Principal | Agente Secundario |
|--------|----------------|-------------------|
| **Backend (Django/DRF)** | OpenCode | Copilot |
| **Frontend (React/Vite)** | Windsurf | Copilot |
| **Editor 3D (Three.js)** | Claude Code | OpenCode |
| **Base de Datos** | OpenCode | Claude Code |
| **Pruebas (TDD)** | Aider | Copilot |
| **Documentación** | Claude Code | OpenCode |
| **DevOps/Docker** | OpenCode | — |
| **Revisión de código** | Claude Code | OpenCode |

---

## 3. Estrategia de Rotación por Tokens

### Regla de Oro
> Cuando un agente se quede sin tokens, cambiar al siguiente agente en la lista de rotación. Nunca esperar inactivo.

### Ciclo de Rotación (por sesión de trabajo)

```
1. OpenCode (límite: 100 requests/día)
   ↓ cuando se agota o se acerca al límite
2. Claude Code (límite: ~45 requests/5h)
   ↓ cuando se agota
3. Aider (ilimitado, local)
   ↓ cuando se necesita agente fresco
4. Volver a OpenCode (si se recargó)
   ↓ o continuar con Windsurf/Copilot
```

### Temporizadores Sugeridos

| Agente | Tiempo Máximo Continuo | Pausa Recomendada |
|--------|----------------------|-------------------|
| OpenCode | 2 horas | 30 min |
| Claude Code | 1 hora | 1 hora |
| Aider | Sin límite | — |
| Copilot | Sin límite | — |

### Commutación por Tarea

```
Para una tarea grande (ej. implementar checkout):
  1. OpenCode: Planificar estructura y contratos
  2. Claude Code: Escribir tests (TDD)
  3. Aider: Implementar código
  4. OpenCode: Revisar y corregir
  5. Claude Code: Documentar
```

---

## 4. Flujo de Trabajo Unificado (Kiro CLI)

Kiro CLI actúa como orquestador principal. Comandos clave:

```bash
# Iniciar nueva feature
kiro feature start <nombre>

# Especificar
kiro speckit:specify "descripción de la feature"

# Planificar
kiro speckit:plan

# Generar tareas
kiro speckit:tasks

# Implementar
kiro speckit:implement

# Revisar convergencia
kiro speckit:converge
```

### Integración con Agentes

```
Usuario → Kiro CLI → OpenCode (planificar)
                   → Claude Code (documentar)
                   → Aider (implementar)
                   → OpenCode (revisar)
                   → Kiro CLI (commit + PR)
```

---

## 5. Prompt Engineering por Agente

### Para OpenCode
```markdown
Contexto del proyecto: [breve descripción]
Archivo a modificar: [ruta exacta]
Tarea específica: [qué hacer]
Restricciones: [frameworks, patrones, estilo]
No hacer: [anti-patrones, librerías prohibidas]
```

### Para Claude Code
```markdown
Analiza este archivo: [path]
Identifica: [problemas de diseño, bugs, mejoras]
Propón: [solución con código]
Formato: [diff, explicación, o código completo]
```

### Para Aider
```markdown
Edita [archivo]:
- Agrega función [nombre] que hace [descripción]
- Sigue el patrón de [archivo similar]
- Añade tests en [archivo de tests]
```

---

## 6. Revisión y Validación

Todo código generado por IA debe pasar por:

1. **Revisión automática**: lint (ruff/ESLint) + typecheck (mypy/TypeScript)
2. **Revisión de pares**: mínimo 1 persona del equipo revisa el PR
3. **Tests**: el código no se mergea si los tests no pasan
4. **Comprensión**: cada miembro debe entender el código que mergea
   - No aceptar código que no se entiende
   - Pedir explicación al agente si es necesario
   - Refactorizar si es muy complejo

### Checklist de Validación de Código IA

- [ ] ¿Entiendo qué hace cada línea?
- [ ] ¿Sigue el patrón del proyecto?
- [ ] ¿Tiene tests?
- [ ] ¿Los tests pasan?
- [ ] ¿El lint y typecheck pasan?
- [ ] ¿No hay secretos hardcodeados?
- [ ] ¿Maneja errores correctamente?
- [ ] ¿Es mantenible?

---

## 7. Stack de Comandos Útiles

```bash
# Revisar cambios en rama
diff2ai origin/integracion-total..jose

# Fusionar con resolución asistida
weave origin/integracion-total jose

# Comandos Speckit en Kiro
/speckit-clarify        # Hacer preguntas de clarificación
/speckit-checklist      # Generar checklist
/speckit-converge       # Verificar implementación vs spec
/speckit-constitution   # Actualizar constitución

# GitFlow
git flow feature start <nombre>
git flow feature finish <nombre>
git flow hotfix start <nombre>
git flow release start <version>
```
