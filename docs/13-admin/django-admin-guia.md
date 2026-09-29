# Django Admin — Guía de Configuración y Uso en RED Estampación

> **RED (Ropa con Estampados Digitales)** — Guía para la verificación, configuración y uso del Panel de Administración nativo de Django (`Django Admin`).

---

## 1. ¿Qué es el Django Admin en RED?

El **Django Admin** es la interfaz gráfica integrada en Django para gestionar la base de datos a nivel ORM. A diferencia de clientes SQL externos (como phpMyAdmin o DBeaver), Django Admin lee tus modelos (`models.py`) y genera automáticamente una interfaz web segura y personalizable para crear, leer, actualizar y eliminar (CRUD) registros.

---

## 2. Instalación y Verificación

El panel viene activado por defecto en el proyecto RED Estampación:

1. **`INSTALLED_APPS`** en [`backend/config/settings.py`](file:///home/South_Knight/Documentos/projecto_final/projecto_formativo/backend/config/settings.py):
   ```python
   INSTALLED_APPS = [
       'django.contrib.admin',
       'django.contrib.auth',
       'django.contrib.contenttypes',
       'django.contrib.sessions',
       'django.contrib.messages',
       'django.contrib.staticfiles',
       # Apps del proyecto...
   ]
   ```

2. **Ruta Admin** en [`backend/config/urls.py`](file:///home/South_Knight/Documentos/projecto_final/projecto_formativo/backend/config/urls.py):
   ```python
   from django.contrib import admin
   from django.urls import path, include

   urlpatterns = [
       path('admin/', admin.site.urls),
       # ... resto de rutas
   ]
   ```

---

## 3. Crear el Acceso (Superusuario)

Para acceder al panel admin, necesitas una cuenta con privilegios de superusuario:

```bash
# 1. Asegurar que las migraciones estén al día
python backend/manage.py migrate

# 2. Crear el superusuario
python backend/manage.py createsuperuser
```

Sigue las instrucciones en la terminal e ingresa `username`, `email` y `password`.

---

## 4. Registro de Modelos en el Admin

En el proyecto RED, los modelos están registrados en los archivos `admin.py` de cada app del backend:

### Ejemplo de Registro Básico (`admin.site.register`):
```python
from django.contrib import admin
from .models import ProductImage, Variant, ProductAudit

admin.site.register(ProductImage)
admin.site.register(Variant)
admin.site.register(ProductAudit)
```

### Ejemplo de Registro Avanzado con Decorador (`@admin.register`):
```python
from django.contrib import admin
from .models import Usuario

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'nombre', 'rol', 'estado', 'date_joined')
    list_filter = ('rol', 'estado')
    search_fields = ('email', 'nombre')
    ordering = ('-date_joined',)
```

---

## 5. Acceder a la Interfaz Web

1. Inicia el servidor de desarrollo del backend:
   ```bash
   python backend/manage.py runserver
   ```
2. Abre tu navegador y navega a: [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)
3. Ingresa las credenciales del superusuario creado.

---

## 6. Estado Actual de Modelos Registrados en RED

Actualmente, los siguientes modelos están disponibles en el Django Admin:

- **Users:** `Usuario`, `Token_Verificacion`, `Historial_Estado_Usuario`, `Log_Auditoria`
- **Products:** `Product`, `ProductImage`, `Variant`, `ProductAudit`
- **Orders:** `Order`, `OrderItem`
- **Carts:** `Cart`, `CartItem`
- **Catalog:** `Category`, `CatalogFilter`, `PopularSearch`, `SearchHistory`
- **Models3D:** `Model3D`, `Model3DImage`, `CloudinaryResource`
- **Landing:** `Contacto`

## 7. Generación Automática de Diagramas (De Código a Diagrama)

Si ya tienes tus tablas definidas en los archivos `models.py` de tus aplicaciones (`users`, `products`, `orders`, `catalog`, etc.), no necesitas dibujar el modelo a mano. Puedes utilizar la librería `django-extensions`.

Esta herramienta lee la arquitectura ORM de tu proyecto y genera automáticamente un diagrama relacional completo de tu base de datos en formato PNG, PDF o SVG.

### Pasos para usarlo:

1. **Instalar las librerías necesarias:**
   ```bash
   pip install django-extensions pydot graphviz
   ```

2. **Añadir a `INSTALLED_APPS` en [`backend/config/settings.py`](file:///home/South_Knight/Documentos/projecto_final/projecto_formativo/backend/config/settings.py):**
   ```python
   INSTALLED_APPS = [
       # ...
       'django_extensions',
   ]
   ```

3. **Ejecutar el comando de generación:**
   ```bash
   python backend/manage.py graph_models -a -o docs/diagrams/diagrama_relacional.png
   ```

---

## 8. Diagramación como Código (Ideal para Documentación)

Para mantener los diagramas bajo control de versiones (Git) junto con el resto de la documentación Markdown del proyecto, el mejor enfoque es usar herramientas de **"Diagrama como Código"**:

* **Mermaid (`.mmd` / bloques ```mermaid):**  
  Es nativo en GitHub y plataformas markdown. Permite escribir diagramas Entidad-Relación y diagramas de clases usando texto simple. Es la herramienta oficial usada en los documentos de arquitectura de RED (como en [`modelo-entidad-relacion.md`](file:///home/South_Knight/Documentos/projecto_final/projecto_formativo/docs/04-diseno-uml/modelo-entidad-relacion.md)).

* **PlantUML (`.puml`):**  
  Excelente para diseñar diagramas de clases, secuencias y despliegue más complejos (por ejemplo `despliegue.puml` o `modelo-clases.puml`).

> **Tip de desarrollo:** Al integrar la extensión de PlantUML o Mermaid en tu editor de código (como VS Code u OpenCode), puedes previsualizar los gráficos en tiempo real mientras editas la estructura de la documentación.

---

> **Nota:** Adicionalmente a Django Admin, el proyecto cuenta con un panel administrativo personalizado en el frontend React (`/admin-users`, `/admin-products`, `/admin-orders`, etc.) documentado en [`panel-admin-estado-y-pendientes.md`](file:///home/South_Knight/Documentos/projecto_final/projecto_formativo/docs/13-admin/panel-admin-estado-y-pendientes.md).

