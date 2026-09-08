Perfecto, Cloudinary encaja de maravilla en vuestro proyecto de tienda de ropa con editor 3D. Os permitirá almacenar, transformar y servir todas las imágenes de forma profesional sin tener que gestionar un servidor de medios propio. Aquí os detallo cómo integrarlo en vuestra arquitectura con Django, React, Docker y los patrones que manejáis.

---

## 🧠 ¿Por qué Cloudinary en vuestro proyecto?

- **Almacenamiento centralizado en la nube**: catálogo de productos, diseños de usuarios, texturas y previsualizaciones del editor 3D.
- **Transformaciones en tiempo real**: redimensionar, recortar, aplicar filtros, cambiar formatos (WebP, AVIF) o añadir marcas de agua simplemente modificando la URL.
- **Optimización automática**: compresión, formato moderno según navegador, lazy loading, todo sin perder calidad visual.
- **Widget de subida listo para usar**: podéis integrarlo en React para que los usuarios suban sus propios diseños.
- **Escalabilidad y CDN**: las imágenes se sirven desde una red de distribución global, descargando al backend y acelerando la carga de la tienda y el editor 3D.

---

## 🧩 Casos de uso concretos en la tienda

1. **Imágenes del catálogo** (camisetas base, productos).
2. **Diseños de estampado subidos por el usuario** en el proceso de personalización.
3. **Previsualizaciones del editor 3D**: cuando el usuario termina de personalizar la camiseta, generáis una captura desde Three.js (canvas.toDataURL()) y la subís a Cloudinary para guardar el diseño o compartirlo.
4. **Texturas y mapas** que uséis en Three.js (Cloudinary puede servir imágenes con CORS y compresión).
5. **Avatares de perfil** de los usuarios.

---

## 🔧 Configuración e integración

### 1. Crear cuenta y obtener credenciales
Registraos en [cloudinary.com](https://cloudinary.com) y anotad:
- Cloud name
- API Key
- API Secret

**Nunca subáis estos valores al repositorio.** Usad variables de entorno.

### 2. Configuración en Docker (docker-compose.yml)
Añadid las variables al servicio `backend` y también al `frontend` si vais a usar el widget de subida (con unsigned uploads). Ejemplo:

```yaml
backend:
  ...
  environment:
    - CLOUDINARY_CLOUD_NAME=tu_cloud
    - CLOUDINARY_API_KEY=123456789
    - CLOUDINARY_API_SECRET=abcdefg
```

Podéis usar un archivo `.env` y la directiva `env_file` en compose.

---

## 🐍 Integración con Django (backend)

### Librerías necesarias
```bash
pip install cloudinary django-cloudinary-storage
```

### Configuración en `settings.py`
```python
import cloudinary
import cloudinary.uploader
import cloudinary.api

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.environ['CLOUDINARY_CLOUD_NAME'],
    'API_KEY': os.environ['CLOUDINARY_API_KEY'],
    'API_SECRET': os.environ['CLOUDINARY_API_SECRET'],
}

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
```

### Modelos con CloudinaryField
```python
from cloudinary.models import CloudinaryField

class Producto(models.Model):
    nombre = models.CharField(max_length=200)
    imagen = CloudinaryField('imagen', folder='productos/')
    ...

class DisenioUsuario(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    imagen = CloudinaryField('disenio', folder='disenios/')
    configuracion = models.JSONField()  # posición, escala, etc.
```

### API REST con Django REST Framework
En el serializador podéis devolver la URL transformada para el frontend:

```python
class ProductoSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Producto
        fields = ['id', 'nombre', 'imagen_url']

    def get_imagen_url(self, obj):
        # Transformación: 300x300, fondo automático, WebP
        return cloudinary.CloudinaryImage(obj.imagen.public_id).build_url(
            width=300, height=300, crop='fill', format='webp', quality='auto'
        )
```

### Subida manual desde una vista (si el backend recibe la imagen)
```python
from rest_framework import views, status
import cloudinary.uploader

class UploadDisenioView(views.APIView):
    def post(self, request):
        archivo = request.FILES['imagen']
        resultado = cloudinary.uploader.upload(
            archivo,
            folder='disenios/',
            public_id=f"usuario_{request.user.id}_{uuid.uuid4()}",
            overwrite=False,
            resource_type='image',
        )
        # Guardar URL en el modelo DisenioUsuario
        return Response({'url': resultado['secure_url']}, status=201)
```

---

## ⚛️ Integración con React (frontend)

### Opción recomendada: subir directamente desde el navegador con el Cloudinary Upload Widget
Esto evita que el backend tenga que recibir archivos pesados, reduciendo carga y latencia. El widget devuelve la URL que luego enviáis al backend.

1. Incluid el script del widget o usad el paquete `cloudinary-react` (aunque está algo obsoleto; mejor la librería `@cloudinary/url-gen` + el widget standalone).

2. Crear un botón que abra el widget usando un **unsigned upload preset** (configurado en la consola de Cloudinary, con carpeta destino y transformaciones automáticas permitidas).

Ejemplo con el Upload Widget global:
```jsx
// Añadir script en index.html: <script src="https://upload-widget.cloudinary.com/global/all.js" ...>
function SubirDisenio() {
  const cloudinaryRef = useRef();
  const widgetRef = useRef();

  useEffect(() => {
    cloudinaryRef.current = window.cloudinary;
    widgetRef.current = cloudinaryRef.current.createUploadWidget({
      cloudName: "tu_cloud",
      uploadPreset: "preset_disenios", // configurar en Cloudinary settings
      folder: "disenios",
      maxFiles: 1,
      cropping: true,
      styles: { palette: { ... } }
    }, (error, result) => {
      if (!error && result && result.event === "success") {
        const url = result.info.secure_url;
        // Enviar url al backend para asociar al usuario
        fetch('/api/disenios/', { method: 'POST', body: JSON.stringify({ url }) });
      }
    });
  }, []);

  return <button onClick={() => widgetRef.current.open()}>Subir diseño</button>;
}
```

**Ventaja**: el frontend se comunica directamente con Cloudinary (usando un preset que no expone la API secret), y solo mandáis la URL al backend. Esto desacopla completamente la subida de archivos pesados de vuestro servidor.

### Si preferís subir a través del backend
El componente React simplemente enviaría el archivo mediante una petición `multipart/form-data` a la API de Django que vimos antes. En ese caso, la librería `axios` o `fetch` bastan.

---

## 🎨 Transformaciones potentes para el editor 3D

### Generar una previsualización del estampado sobre la camiseta
Imaginad que tenéis una imagen base de una camiseta blanca (subida a Cloudinary). Mediante transformaciones podéis superponer el diseño del usuario **sin tocar el backend de procesamiento de imágenes**.

Ejemplo de URL generada:
```
https://res.cloudinary.com/tu_cloud/image/upload/
  w_600,h_600,c_fill/
  l_disenios/usuario1234_disenio.png,w_250,g_north_east,x_100,y_80/
  camiseta_base.jpg
```
Esto coloca el diseño del usuario sobre la camiseta en una posición determinada. Podéis construir la URL dinámicamente desde el frontend o devolverla desde Django.

**Para el editor 3D**: aunque Three.js renderiza en tiempo real en el navegador, cuando el usuario quiera guardar su diseño podéis hacer una captura del canvas (`canvas.toDataURL()`) y subir esa imagen a Cloudinary como `base64` o blob. Luego compartir esa previsualización.

---

## 🔒 Seguridad y patrones aplicados

- **Patrón Adapter/Facade**: creáis un servicio `cloudinary_service.py` en Django que encapsule todas las operaciones con Cloudinary (subida, generación de URLs, borrado). Así desacopláis el sistema de almacenamiento.
- **Environment variables**: las claves nunca en el código, inyectadas por Docker según el entorno.
- **Unsigned upload presets**: limitan la carpeta destino, el tamaño y evitan exponer la API secret. Para operaciones sensibles (borrar, modificar), sí usáis el backend con la API secret.

---

## 📦 Empaquetado y escalabilidad

- Los contenedores de Django y React no necesitan almacenar archivos localmente; toda la media va a Cloudinary. La base de datos solo guarda referencias (public_id o URLs).
- Al escalar con réplicas del backend, no hay conflicto con archivos compartidos; Cloudinary es el punto único externo.
- La CDN de Cloudinary sirve las imágenes mucho más rápido que vuestro servidor, y podéis implementar lazy loading y `srcset` en React para que el editor 3D cargue texturas optimizadas según dispositivo.

---

## 🧪 Resumen de flujo para un diseño personalizado

1. Usuario en React personaliza su camiseta en el visor 3D.
2. Cuando está satisfecho, puede subir su propio arte usando el Cloudinary Upload Widget → obtiene URL.
3. Alternativamente, pulsa “Guardar diseño” y el frontend envía al backend la configuración (JSON) + la URL del diseño (si subió uno) o una captura del canvas 3D.
4. El backend Django guarda en `DisenioUsuario` la referencia a la imagen de Cloudinary.
5. Para mostrar el diseño en el perfil o en la galería, usáis las URLs transformadas que devuelve la API.

Todo esto encaja perfectamente con vuestra arquitectura de contenedores (cada servicio con sus propias variables de entorno), con un balanceador Nginx sirviendo el frontend y las peticiones API al backend, y con Cloudinary como servicio externo de almacenamiento.

¿Queréis que os detalle cómo generar las previsualizaciones compuestas con las transformaciones de Cloudinary, o cómo manejar la subida de texturas 3D de forma eficiente?

Integrar Cloudinary en un proyecto con Django, React (Vite) y Docker, siguiendo una arquitectura de microservicios, capas y MVC, es un proceso que puede abordarse por partes. El objetivo es mantener un backend stateless y un frontend eficiente, usando Cloudinary como el sistema de almacenamiento y gestión de medios.

Aquí tienes una guía práctica para lograrlo.

### 🏗️ Arquitectura General

En una arquitectura de microservicios, es común que el backend (Django) y el frontend (React) se ejecuten como servicios independientes, cada uno en su propio contenedor Docker.

*   **Backend (Django + DRF)**: Actúa como una API REST. Es el encargado de la lógica de negocio, la interacción con la base de datos y, en este caso, de **gestionar las subidas a Cloudinary** para mantener la seguridad (usando claves API que no deben exponerse en el frontend).
*   **Frontend (React + Vite)**: Se comunica con la API del backend. Puede mostrar imágenes usando las URLs de Cloudinary y, opcionalmente, usar el **Cloudinary Upload Widget** para una experiencia de subida más rica y directa.
*   **Docker**: Orquestará todos los servicios (backend, frontend, base de datos, etc.) definiéndolos en un archivo `docker-compose.yml`.

### 🐍 Backend: Integración con Django

La forma más limpia y alineada con el patrón MVC es usar `django-cloudinary-storage`. Esta librería actúa como un "storage backend" para Django, lo que significa que puedes seguir usando los `ImageField` o `FileField` en tus modelos (la "M" de MVC) y el upload a Cloudinary ocurrirá de forma automática y transparente.

**1. Instalación**

En tu entorno virtual de Django, instala los paquetes necesarios:
```bash
pip install django-cloudinary-storage cloudinary pillow
```
*   `django-cloudinary-storage`: Integra Cloudinary con el sistema de archivos de Django.
*   `cloudinary`: El SDK oficial de Python.
*   `pillow`: Necesario para que Django maneje imágenes.

**2. Configuración en `settings.py`**

Añade las apps a `INSTALLED_APPS` (es importante el orden):

```python
INSTALLED_APPS = [
    'cloudinary_storage',  # Debe ir antes que 'django.contrib.staticfiles'
    'django.contrib.staticfiles',
    'cloudinary',
    # ... tus otras apps
    'rest_framework',
    'tu_app',
]
```

Luego, configura las credenciales de Cloudinary y el almacenamiento:

```python
# Configuración de Cloudinary
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': 'tu_cloud_name',
    'API_KEY': 'tu_api_key',
    'API_SECRET': 'tu_api_secret',
}

# Configura el almacenamiento por defecto para archivos media
STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
```

> **🔒 Seguridad:** Es crucial no hardcodear las credenciales. Úsalas desde variables de entorno (por ejemplo, con `python-dotenv`).

**3. Modelo (La Capa de Modelos en MVC)**

Tu modelo se define de la forma estándar, usando `models.ImageField`:

```python
# tu_app/models.py
from django.db import models

class Producto(models.Model):
    nombre = models.CharField(max_length=255)
    imagen = models.ImageField(upload_to='productos/') # 'upload_to' es opcional
```

**4. Vista y Serializador (La Capa de Controladores/Vistas en MVC)**

Django REST Framework (DRF) manejará la subida y devolverá la URL de Cloudinary en la respuesta JSON de forma nativa.

```python
# tu_app/serializers.py
from rest_framework import serializers
from .models import Producto

class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ['id', 'nombre', 'imagen']
```

```python
# tu_app/views.py
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Producto
from .serializers import ProductoSerializer

class ProductoViewSet(ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    parser_classes = [MultiPartParser, FormParser] # Necesario para manejar archivos
```

Con esto, el backend está listo para recibir archivos y subirlos automáticamente a Cloudinary, almacenando la URL en la base de datos.

### ⚛️ Frontend: Integración con React (Vite)

Tienes dos enfoques principales en el frontend:

1.  **Subida a través del Backend (Recomendado por seguridad)**: El frontend envía el archivo en una petición `multipart/form-data` a tu API de Django (el endpoint del `ModelViewSet` de arriba). Esta es la opción más sencilla y segura, ya que todas las credenciales de Cloudinary permanecen en el servidor.

2.  **Subida Directa con el Upload Widget**: Cloudinary ofrece un widget de subida que puedes integrar en React. Esto permite una subida más rápida y con mejor experiencia de usuario, ya que el archivo va directamente a Cloudinary sin pasar por tu servidor. Para esto, necesitarás generar **firmas (signatures)** desde tu backend para asegurar las subidas, o usar **upload presets** para subidas sin firmar (menos seguro).

#### Opción 2: Usar el Upload Widget de Cloudinary en React

**1. Instalación**

```bash
npm install @cloudinary/react @cloudinary/url-gen
```

**2. Crear un Componente de Subida**

Puedes crear un componente que abra el widget de Cloudinary.

```jsx
// src/components/CloudinaryUpload.jsx
import { useState } from 'react';

const CloudinaryUpload = ({ onUploadSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const openUploadWidget = () => {
    setIsLoading(true);
    // Elimina el script si ya existe para evitar duplicados
    const existingScript = document.getElementById('cloudinary-widget-script');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'cloudinary-widget-script';
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;
    script.onload = () => {
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
          uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
          // ... otras opciones
        },
        (error, result) => {
          setIsLoading(false);
          if (!error && result && result.event === 'success') {
            // La URL segura de la imagen subida está en result.info.secure_url
            onUploadSuccess(result.info.secure_url);
          }
        }
      );
      widget.open();
    };
    document.body.appendChild(script);
  };

  return (
    <button onClick={openUploadWidget} disabled={isLoading}>
      {isLoading ? 'Cargando...' : 'Subir Imagen'}
    </button>
  );
};

export default CloudinaryUpload;
```

**3. Mostrar Imágenes**

Para mostrar imágenes de Cloudinary con transformaciones, usa el componente `AdvancedImage`:

```jsx
// src/components/CldImage.jsx
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage, placeholder } from '@cloudinary/react';
import { thumbnail } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';

const cld = new Cloudinary({
  cloud: { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME },
});

const CldImage = ({ publicId }) => {
  const myImage = cld
    .image(publicId)
    .resize(thumbnail().width(300).height(300).gravity(autoGravity()))
    .delivery(format('auto'))
    .delivery(quality('auto'));

  return <AdvancedImage cldImg={myImage} plugins={[placeholder()]} />;
};

export default CldImage;
```

### 🐳 Docker: Contenerización y Orquestación

Para dockerizar tu proyecto, crea `Dockerfile` para el backend (Django) y el frontend (React/Vite). Luego, un archivo `docker-compose.yml` orquestará los servicios.

**1. Estructura de proyecto sugerida**
```
mi-proyecto/
├── backend/          # Código Django
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/         # Código React (Vite)
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

**2. `docker-compose.yml` (Ejemplo)**

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: mi_db
      POSTGRES_USER: mi_usuario
      POSTGRES_PASSWORD: mi_contraseña
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
      - DATABASE_URL=postgres://mi_usuario:mi_contraseña@db:5432/mi_db
    depends_on:
      - db
    networks:
      - app-network
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "5173:5173" # Puerto por defecto de Vite
    environment:
      - VITE_CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - VITE_API_URL=http://backend:8000/api # URL de la API interna
    depends_on:
      - backend
    networks:
      - app-network
    volumes:
      - ./frontend:/app
      - /app/node_modules

networks:
  app-network:

volumes:
  postgres_data:
```

**3. Variables de entorno**
Crea un archivo `.env` en la raíz del proyecto para las variables sensibles:
```
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### 🔧 Consideraciones para Microservicios + Capas + MVC

Para mantener una buena arquitectura, ten en cuenta:

*   **Separación de Responsabilidades**: Cloudinary es un servicio externo. Tu lógica de negocio (capas de servicio) debe abstraer la interacción con Cloudinary. Por ejemplo, crea un servicio `MediaService` que tenga métodos como `upload_file()` y `delete_file()`. Esto facilita cambiar de proveedor en el futuro sin afectar a los controladores (vistas de DRF).
*   **Mantenibilidad**: Sigue el patrón MVC. Los modelos solo definen la estructura de datos. Las vistas (controladores) manejan las peticiones y respuestas. Los serializadores formatean los datos. La lógica de integración con Cloudinary (como generar URLs firmadas) debe residir en servicios o utilidades, no en los modelos o vistas directamente.
*   **Seguridad**:
    *   **Nunca** expongas tu `API_SECRET` en el frontend.
    *   Para subidas directas desde el frontend, genera las firmas en el backend y envíalas al frontend de forma segura.
    *   Usa **upload presets** en Cloudinary para configurar transformaciones, carpetas de destino y permisos de subida sin necesidad de firmas en casos de uso público.
*   **Escalabilidad**: Al ser un microservicio, tu backend de Django puede escalar horizontalmente. Cloudinary se encarga de la gestión de archivos, por lo que tu backend no tiene que manejar el almacenamiento, solo la lógica de negocio.

### 📚 Recursos y Ejemplos

*   **Repositorio de ejemplo**: El proyecto `django-react-typescript` en GitHub es un excelente punto de partida que ya incluye Cloudinary configurado.
*   **Documentación oficial**:
    *   [Cloudinary Python SDK](https://cloudinary.com/documentation/python_integration)
    *   [Cloudinary React SDK](https://cloudinary.com/documentation/react_integration)
    *   [django-cloudinary-storage](https://github.com/cloudinary/django-cloudinary-storage)

Siguiendo estos pasos y principios, tendrás una integración robusta, segura y mantenible de Cloudinary en tu proyecto con Django, React, Vite y Docker.

Si tienes alguna duda específica sobre alguna parte del proceso, no dudes en consultarme.

Integrar Cloudinary con Django y React (Vite) es una excelente manera de gestionar imágenes y videos en la nube. La clave está en usar el backend (Django) para manejar la lógica de negocio y la base de datos, y el frontend (React) para una experiencia de usuario fluida, especialmente con el widget de carga.

Aquí tienes una guía paso a paso para lograrlo.

### 1. Configuración del Backend (Django)

El backend será el encargado de autenticar las solicitudes y almacenar las referencias (URLs) de los archivos en tu base de datos. No es recomendable que el frontend suba archivos directamente a Cloudinary sin control, ya que esto podría ser inseguro.

**Paso 1: Instalar el SDK de Cloudinary para Python**

En tu entorno virtual de Django, instala la librería oficial:

```bash
pip install cloudinary
```

**Paso 2: Configurar Cloudinary en `settings.py`**

Importa los módulos necesarios y configura el SDK con tus credenciales. Es **fundamental** usar variables de entorno para no exponer tus claves secretas en el código.

```python
# settings.py
import os
import cloudinary
import cloudinary.uploader
import cloudinary.api

cloudinary.config(
    cloud_name = os.getenv("CLOUD_NAME"),
    api_key = os.getenv("CLOUD_API_KEY"),
    api_secret = os.getenv("CLOUD_SECRET_KEY"),
)
```

Luego, crea un archivo `.env` en la raíz de tu proyecto con tus credenciales, que puedes obtener desde el [Panel de Configuración de Cloudinary](https://console.cloudinary.com/app/settings/api-keys):

```
CLOUD_NAME=tu_cloud_name
CLOUD_API_KEY=tu_api_key
CLOUD_SECRET_KEY=tu_api_secret
```

**Paso 3: Crear un modelo para almacenar las imágenes**

Para usar el campo especial de Cloudinary en tus modelos, impórtalo y úsalo en lugar del `ImageField` estándar. Esto hará que Django gestione automáticamente la subida a Cloudinary.

```python
# models.py
from django.db import models
from cloudinary.models import CloudinaryField

class Post(models.Model):
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=250)
    # CloudinaryField se encarga de la subida y almacena la URL
    image = CloudinaryField('image') 

    def __str__(self):
        return self.title
```

> **Nota:** Si prefieres más control, también puedes usar el `uploader` de Cloudinary directamente en tu lógica de vistas o API.

**Paso 4: Crear una API (Opcional pero Recomendado)**

Para conectar con React, lo ideal es crear una API con Django REST Framework. Puedes crear un `ViewSet` o vistas basadas en funciones que reciban la imagen y la procesen, devolviendo la URL de Cloudinary para guardarla en tu modelo.

### 2. Configuración del Frontend (React + Vite)

Hay varias formas de subir archivos desde React. La más sencilla y poderosa es usar el **Cloudinary Upload Widget**, que te da una interfaz lista para usar con soporte para arrastrar y soltar, cámara, etc..

**Paso 1: Crear un proyecto e instalar dependencias**

Puedes empezar con un proyecto React + Vite estándar. Para una configuración aún más rápida, Cloudinary ofrece un scaffold oficial que ya viene todo preconfigurado:

```bash
npx create-cloudinary-react
```

Si prefieres hacerlo manualmente, instala el SDK de React y el paquete de URL de Cloudinary:

```bash
npm install @cloudinary/react @cloudinary/url-gen
```

**Paso 2: Configurar variables de entorno en el Frontend**

Crea un archivo `.env` en la raíz de tu proyecto React y añade tu `cloud_name` (sin la clave secreta, ya que es información pública):

```
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
```

**Paso 3: Crear un componente para el Upload Widget**

Este es el corazón de la subida desde el frontend. El siguiente código muestra cómo implementar un widget de carga que se abre al hacer clic en un botón.

```jsx
// src/components/CloudinaryUploadWidget.jsx
import React, { useEffect, useRef } from 'react';

const CloudinaryUploadWidget = ({ onUploadSuccess }) => {
  const widgetRef = useRef(null);
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = 'tu_upload_preset'; // Crea uno en el panel de Cloudinary

  useEffect(() => {
    // Cargar el script del widget de Cloudinary solo una vez
    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      // Inicializar el widget cuando el script esté cargado
      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName: cloudName,
          uploadPreset: uploadPreset,
          // Aquí puedes añadir más opciones: cropping, múltiples archivos, etc.
        },
        (error, result) => {
          if (!error && result && result.event === 'success') {
            // 'result.info.secure_url' es la URL de la imagen subida
            onUploadSuccess(result.info.secure_url);
          }
        }
      );
    };

    return () => {
      // Limpieza: destruir el widget al desmontar el componente
      if (widgetRef.current) {
        widgetRef.current.destroy();
      }
    };
  }, [cloudName, uploadPreset, onUploadSuccess]);

  const openWidget = () => {
    if (widgetRef.current) {
      widgetRef.current.open();
    }
  };

  return (
    <button onClick={openWidget} className="btn-upload">
      Subir Imagen
    </button>
  );
};

export default CloudinaryUploadWidget;
```

**Paso 4: Usar el componente en tu App**

Integra el widget en cualquier parte de tu aplicación y maneja la URL que devuelve (por ejemplo, enviándola a tu API de Django para guardarla en la base de datos).

```jsx
// src/App.jsx
import React from 'react';
import CloudinaryUploadWidget from './components/CloudinaryUploadWidget';

function App() {
  const handleUploadSuccess = (imageUrl) => {
    console.log('Imagen subida a Cloudinary:', imageUrl);
    // Aquí puedes hacer una llamada a tu API de Django con esta URL
    // fetch('/api/posts/', { method: 'POST', body: JSON.stringify({ image: imageUrl }) })
  };

  return (
    <div>
      <h1>Subir imagen con Cloudinary</h1>
      <CloudinaryUploadWidget onUploadSuccess={handleUploadSuccess} />
    </div>
  );
}

export default App;
```

**Paso 5: Mostrar imágenes optimizadas**

Para mostrar las imágenes, puedes usar el componente `AdvancedImage` que te permite aplicar transformaciones (redimensionar, recortar, optimizar, etc.) sobre la marcha.

```jsx
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage, placeholder } from '@cloudinary/react';
import { fill } from '@cloudinary/url-gen/actions/resize';

const cld = new Cloudinary({ cloud: { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME } });

function MiImagen({ publicId }) {
  const myImage = cld
    .image(publicId)
    .resize(fill().width(300).height(300)); // Transformación

  return <AdvancedImage cldImg={myImage} plugins={[placeholder()]} />;
}
```

### 3. Resumen del Flujo de Trabajo

1.  **Usuario** selecciona una imagen en el frontend (React).
2.  El **Upload Widget** de Cloudinary sube la imagen directamente a la nube de Cloudinary desde el navegador.
3.  El widget devuelve la **URL pública** de la imagen a tu componente React.
4.  Tu componente React envía esa URL a tu **API de Django**.
5.  Django valida la solicitud y guarda la URL en la base de datos usando el modelo con `CloudinaryField`.
6.  Para mostrar la imagen, tu frontend usa la URL almacenada y el SDK de React para aplicar transformaciones y optimizaciones.

### Consejos Adicionales

*   **Upload Presets:** Para subidas sin firma (más sencillas desde el frontend), crea un "Upload Preset" en el panel de Cloudinary y úsalo en el widget.
*   **Seguridad:** Para subidas más seguras, puedes generar firmas (signatures) desde tu backend de Django y usarlas en el widget.
*   **Explora más:** Revisa los [proyectos de ejemplo de Cloudinary para React](https://cloudinary.com/documentation/react_sample_projects) para ver más casos de uso.

Este enfoque separa las responsabilidades de manera clara y te permite aprovechar al máximo las capacidades de Cloudinary.


