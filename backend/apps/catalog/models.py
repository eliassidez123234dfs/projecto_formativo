"""
Módulo de modelos para el catálogo de productos.
Define Category (categorías), ProductCategory (relación N:M entre Product y Category),
SearchHistory (búsquedas por sesión), CatalogFilter (filtros dinámicos),
CatalogSession (sesiones de navegación) y PopularSearch (términos populares).

La relación N:M entre productos y categorías se implementa mediante la tabla
intermedia ProductCategory, lo que permite que un producto pertenezca a
múltiples categorías y una categoría contenga múltiples productos.
"""

from __future__ import annotations

from django.db import models
from django.db.models import Q


class Category(models.Model):
    """Categoría de productos para organización del catálogo.
    name debe ser único. is_active permite ocultar categorías sin eliminarlas.
    Se accede a los productos de la categoría mediante el related_name 'products'
    en la tabla intermedia ProductCategory."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name

    @property
    def product_count(self) -> int:
        return self.products.filter(product__is_active=True, product__is_approved=True).count()


class ProductCategory(models.Model):
    """Tabla intermedia para la relación muchos-a-muchos (N:M) entre productos y categorías.
    Permite que un producto tenga múltiples categorías y viceversa.
    unique_together garantiza que un producto solo se asigne una vez por categoría."""
    product = models.ForeignKey('products.Product', related_name='categories', on_delete=models.CASCADE)
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['product', 'category']
        verbose_name = 'Product Category'
        verbose_name_plural = 'Product Categories'

    def __str__(self) -> str:
        return f'{self.product.name} - {self.category.name}'


class SearchHistory(models.Model):
    """Historial de búsquedas realizadas por sesión anónima o usuario.
    Se usa para análisis, autocompletado y mejora de la experiencia de navegación.
    Almacena el texto buscado (query), los filtros aplicados en JSON y la
    cantidad de resultados obtenidos para métricas de relevancia."""
    session_key = models.CharField(max_length=64, db_index=True)
    query = models.CharField(max_length=200)
    filters = models.JSONField(default=dict, help_text='Filtros aplicados en la búsqueda (formato JSON)')
    results_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_key', '-created_at']),
        ]

    def __str__(self) -> str:
        return f'{self.query} ({self.session_key[:8]}...)'


class CatalogFilter(models.Model):
    """Filtro dinámico configurable para la navegación del catálogo.
    filter_type define el tipo de filtro:
      - price_range: rango de precios
      - size: talla de producto
      - color: color de producto
      - category: categoría
      - availability: disponibilidad (con/sin stock)
    config almacena los parámetros específicos del filtro en formato JSON."""
    name = models.CharField(max_length=100, unique=True)
    filter_type = models.CharField(
        max_length=20,
        choices=[
            ('price_range', 'Rango de precio'),
            ('size', 'Talla'),
            ('color', 'Color'),
            ('category', 'Categoría'),
            ('availability', 'Disponibilidad'),
        ]
    )
    config = models.JSONField(default=dict, help_text='Configuración del filtro en JSON')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:
        return self.name


class CatalogSession(models.Model):
    """Sesión de navegación en el catálogo con métricas de visualización
    (RF-052). Registra el número de productos vistos y la duración estimada
    para análisis de comportamiento. Se crea en cada consulta al catálogo."""
    user = models.ForeignKey('users.Usuario', null=True, blank=True, on_delete=models.SET_NULL)
    session_key = models.CharField(max_length=255, blank=True, null=True)
    accessed_at = models.DateTimeField(auto_now_add=True)
    products_viewed = models.PositiveIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-accessed_at']

    def __str__(self) -> str:
        return f'Session {self.session_key or self.user_id} — {self.accessed_at}'


class PopularSearch(models.Model):
    """Términos de búsqueda populares con contador de frecuencia.
    Se actualiza mediante el método de clase record_search() y se usa
    para sugerencias de autocompletado y tendencias del catálogo.
    Los términos con mayor search_count aparecen primero."""
    query = models.CharField(max_length=200, unique=True)
    search_count = models.PositiveIntegerField(default=0)
    last_searched = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-search_count', '-last_searched']

    def __str__(self) -> str:
        return f'{self.query} ({self.search_count} searches)'

    @classmethod
    def record_search(cls, query: str) -> None:
        """Registra o incrementa el contador de un término de búsqueda.
        Ignora términos menores a 2 caracteres. Convierte a minúsculas."""
        if not query or len(query.strip()) < 2:
            return
        
        query = query.strip().lower()
        obj, created = cls.objects.get_or_create(
            query=query,
            defaults={'search_count': 1}
        )
        if not created:
            obj.search_count += 1
            obj.save()
