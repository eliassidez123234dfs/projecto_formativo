# Contributing

Gracias por contribuir al proyecto. Estas son las pautas para participar en el desarrollo de forma clara y ordenada.

## Cómo contribuir

1. Fork del repositorio y clona tu copia local.
2. Crea una rama descriptiva para tu trabajo:
   ```bash
git checkout -b feature/nombre-descriptivo
```
3. Realiza tus cambios en la rama.
4. Asegúrate de que el proyecto se ejecuta correctamente y que tus cambios no rompen la aplicación.
5. Empuja tu rama al repositorio remoto.
6. Abre un pull request describiendo el cambio y los motivos.

## Estilo de código

### Python

- Sigue el estilo PEP 8.
- Utiliza `black` para formatear el código cuando sea posible.
- Mantén funciones y clases con responsabilidad única.
- Añade comentarios claros solo cuando el código no sea autoexplicativo.

### JavaScript / React

- Usa sintaxis moderna de ES6+.
- Mantén componentes pequeños y reutilizables.
- Evita lógica compleja dentro de JSX.
- Usa `const` y `let`; evita `var`.

## Revisiones

- Comprueba que los endpoints del backend siguen funcionando.
- Asegúrate de que los cambios en el frontend no rompen las rutas existentes.
- Verifica que no se incluyan credenciales ni archivos de configuración sensibles.

## Archivo .env

No incluyas nunca archivos `.env` en el repositorio. Usa `.env.example` como plantilla y mantén tus datos privados fuera del control de versiones.

## Buenas prácticas

- Usa mensajes de commit descriptivos.
- Haz commits pequeños y centrados.
- Documenta cambios relevantes en la descripción del PR.
- Si el cambio afecta al flujo de usuario o a la configuración, actualiza `README.md` o `SETUP_GUIDE.md` según corresponda.
