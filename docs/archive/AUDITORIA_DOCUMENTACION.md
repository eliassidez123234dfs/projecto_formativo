# Auditoria de Documentacion - RED Estampacion

> **Fecha:** 01/07/2026
> **Alcance:** Documentacion fuera de `/docs/` (excluyendo microservices) + archivos legacy dentro de `/docs/`

---

## Resumen

Se auditaron 13 archivos de documentacion ubicados fuera de la estructura oficial `/docs/`, mas 7 archivos legacy dentro de `/docs/`. Las acciones realizadas fueron: mover a la estructura oficial, fusionar contenido complementario, eliminar archivos obsoletos y dejar en su lugar aquellos con valor o por convencion.

---

## Archivos Movidos a la Estructura `/docs/`

| Origen | Destino | Accion |
|--------|---------|--------|
| `backend/apps/models3d/README.md` | `/docs/07-api/endpoints/models3d.md` | `git mv` (preserva historial) |
| `/docs/cloudinary.md` | `/docs/05-arquitectura/cloudinary.md` | Movido (no tracked) |
| `/docs/PRODUCTION_CHECKLIST.md` | `/docs/production-checklist.md` | Movido (no tracked) + renombrado a minusculas |

## Archivos Fusionados

| Origen | Destino | Accion |
|--------|---------|--------|
| `/DESIGN_GUIDE.md` | `/docs/05-arquitectura/diseno-visual.md` | Contenido migrado + nota de origen; archivo fuente eliminado |
| `/docs/DESIGN_GUIDE.md` | (duplicado) | Eliminado por ser copia exacta del raiz |

## Archivos Eliminados

| Archivo | Motivo |
|---------|--------|
| `/SETUP_GUIDE.md` | Informacion duplicada: ya cubierta en `/docs/08-instalacion-entorno-desarrollo/` |
| `/frontend/README.md` | Template generico de Vite+React; sin valor documental del proyecto |
| `/docs/INDICE.md` | Reemplazado por `/docs/README.md` como indice principal |
| `/docs/estructura_proyecto_completo.txt` | Informacion obsoleta (4.4MB); ya cubierta en `/docs/05-arquitectura/` |
| `/docs/red_estampacion.code-workspace` | Archivo de configuracion de VS Code, no documentacion |
| `/docs/DOCUMENTACION_TECNICA_RED_ESTAMPACION.md` | Version 01 (abril 2025); ya hay copia en `/docs/archive/` |
| `/docs/Ficha Proyecto RED.md` | Ficha tecnica SENA original; ya hay copia en `/docs/archive/` |

## Archivos Dejados en su Lugar

| Archivo | Motivo |
|---------|--------|
| `/README.md` | Convencion de repositorio; actualizado con contenido liviano y enlace a `/docs/` |
| `/CONTRIBUTING.md` | Guia de contribucion unica (GitFlow, estilo, PRs); no duplicada en `/docs/` |
| `/docs/archive/` (7 archivos) | Documentos historicos de analisis y diseno previo; se mantienen como referencia academica |
| `/docs/CONTRACTS.md` | Contratos API en YAML (CDD); complementario a `/docs/07-api/` |
| `.specify/` (5 archivos) | Especificacion SDD del proyecto; se dejan en su ubicacion natural |

## Archivos Actualizados

| Archivo | Cambio |
|---------|--------|
| `/README.md` | Contenido reducido a resumen + enlace a `/docs/README.md`; eliminadas referencias a archivos borrados |
| `/docs/README.md` | Agregadas entradas para: diseno-visual, cloudinary, models3d, production-checklist |
| `/docs/production-checklist.md` | Referencias actualizadas: SETUP_GUIDE.md -> `/docs/08-instalacion/`, DESIGN_GUIDE.md -> `/docs/05-arquitectura/diseno-visual.md` |

## Estado Final de la Documentacion

La documentacion del proyecto queda organizada exclusivamente bajo `/docs/` con la siguiente estructura:

```
docs/
├── 01-introduccion/          (4 archivos)
├── 02-alcance-y-metodologia/ (2 archivos)
├── 03-requisitos/            (2 archivos)
├── 04-diseno-uml/            (7 archivos)
├── 05-arquitectura/          (5 archivos: arquitectura, stack, carpetas, diseno-visual, cloudinary)
├── 06-base-de-datos/         (2 archivos)
├── 07-api/                   (7 archivos: intro, auth, 5 endpoints incluido models3d)
├── 08-instalacion-entorno-desarrollo/ (2 archivos)
├── archive/                  (7 archivos historicos)
├── CONTRACTS.md              (contratos CDD)
├── production-checklist.md   (checklist de produccion)
├── README.md                 (indice general)
└── AUDITORIA_DOCUMENTACION.md (este archivo)
```

Archivos documentales fuera de `/docs/`: solo `/README.md` y `/CONTRIBUTING.md` en la raiz (por convencion), y `.specify/` (especificacion SDD).
