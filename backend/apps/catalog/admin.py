from django.contrib import admin
from .models import Category, CatalogFilter, PopularSearch, ProductCategory, SearchHistory


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'product_count', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')


class ProductCategoryInline(admin.TabularInline):
    model = ProductCategory
    extra = 1


@admin.register(CatalogFilter)
class CatalogFilterAdmin(admin.ModelAdmin):
    list_display = ('name', 'filter_type', 'is_active', 'created_at')
    list_filter = ('filter_type', 'is_active')
    search_fields = ('name',)


@admin.register(PopularSearch)
class PopularSearchAdmin(admin.ModelAdmin):
    list_display = ('query', 'search_count', 'last_searched', 'is_active')
    list_filter = ('is_active', 'last_searched')
    search_fields = ('query',)
    readonly_fields = ('last_searched',)


@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
    list_display = ('query', 'session_key', 'results_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('query', 'session_key')
    readonly_fields = ('created_at',)
