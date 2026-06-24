from __future__ import annotations

from django.db import models
from django.db.models import Q


class Category(models.Model):
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
    session_key = models.CharField(max_length=64, db_index=True)
    query = models.CharField(max_length=200)
    filters = models.JSONField(default=dict)
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
    name = models.CharField(max_length=100, unique=True)
    filter_type = models.CharField(
        max_length=20,
        choices=[
            ('price_range', 'Price Range'),
            ('size', 'Size'),
            ('color', 'Color'),
            ('category', 'Category'),
            ('availability', 'Availability'),
        ]
    )
    config = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:
        return self.name


class CatalogSession(models.Model):
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
