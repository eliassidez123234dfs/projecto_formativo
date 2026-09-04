# Tshirt3D

Este microservicio es la interfaz React/Vite para crear y visualizar diseños de camisetas en 3D.

## Qué hace este proyecto

- Renderiza una camiseta en 3D usando `three.js` y `@react-three/fiber`.
- Permite capturar el canvas y enviarlo a Cloudinary.
- Puede guardar un modelo 3D en el backend Django usando el endpoint `VITE_MODELS3D_API_URL`.

## Tecnologías

- Frontend: React, Vite
- 3D: three.js, @react-three/fiber, @react-three/drei
- Estado: valtio
- Estilo: Tailwind CSS

## Requisitos previos

- Node.js instalado (18+ recomendado)
- npm instalado
- Backend Django corriendo en `backend/` del monorepo
- Cuenta de Cloudinary con un `upload preset`

## Configuración para usar en otra PC

### 1. Clonar el repositorio

```sh
git clone <url-del-repositorio>
cd projecto_formativo/microservices/Tshirt3D
```

### 2. Instalar dependencias

```sh
npm install
```

### 3. Crear archivo `.env`

Crea un archivo `.env` en la carpeta `microservices/Tshirt3D` con estas variables:

```env
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_upload_preset
VITE_CLOUDINARY_URL=https://api.cloudinary.com/v1_1/tu_cloud_name/image/upload
VITE_MODELS3D_API_URL=http://127.0.0.1:8000/api/models3d/models/
VITE_API_URL=http://127.0.0.1:8000/api/orders/
```

> Nota: Si solo necesitas guardar diseños en `models3d`, el valor más importante es `VITE_MODELS3D_API_URL`.

### 4. Iniciar el backend Django

Desde la carpeta `backend/` del repositorio:

```sh
python manage.py runserver
```

Asegúrate de que el backend esté disponible en `http://127.0.0.1:8000/`.

### 5. Iniciar el frontend de Tshirt3D

Desde `microservices/Tshirt3D`:

```sh
npm run dev
```

Abre el navegador en la URL que muestre Vite, normalmente `http://127.0.0.1:5174/`.

## Flujo de uso

1. Diseña tu camiseta en el simulador 3D.
2. Usa la opción de subir a Cloudinary para enviar la imagen del canvas.
3. El backend puede recibir el URL seguro de Cloudinary y persistirlo en `models3d`.
4. Si necesitas guardar el diseño final, usa el endpoint `VITE_MODELS3D_API_URL`.

## Qué hacer cuando cambias de PC

1. Clona todo el repositorio.
2. Instala dependencias en `microservices/Tshirt3D` con `npm install`.
3. Copia o crea el `.env` con las variables de Cloudinary y el endpoint Django.
4. Asegúrate de iniciar primero el backend Django.
5. Luego inicia el frontend con `npm run dev`.

## Solución de problemas comunes

- Si no carga Cloudinary, revisa que `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET` estén bien.
- Si no guarda en el backend, revisa que `VITE_MODELS3D_API_URL` apunte a `http://127.0.0.1:8000/api/models3d/models/`.
- Si el backend devuelve error `Invalid HTTP_HOST`, usa `127.0.0.1` y no `localhost` en la URL.

## Comandos útiles

- `npm run dev` – iniciar servidor Vite
- `npm run build` – construir para producción
- `npm run preview` – previsualizar la build

## Licencia

Este proyecto está bajo la licencia MIT.
