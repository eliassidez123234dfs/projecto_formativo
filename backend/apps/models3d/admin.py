from django.contrib import admin
from .models import Model3D, Model3DImage

# Registro del gestor global de recursos de Cloudinary (CloudinaryResourceAdmin)
from . import cloudinary_admin  # noqa: F401


class Model3DImageInline(admin.TabularInline):
    model = Model3DImage
    extra = 1
    fields = ('cloudinary_url', 'cloudinary_public_id', 'is_main', 'order')
    readonly_fields = ('created_at',)


@admin.register(Model3D)
class Model3DAdmin(admin.ModelAdmin):
    list_display = ('name', 'file_type', 'is_active', 'is_approved', 'created_at')
    list_filter = ('file_type', 'is_active', 'is_approved', 'created_at')
    search_fields = ('name', 'description', 'cloudinary_public_id')
    readonly_fields = ('created_at', 'updated_at', 'cloudinary_public_id')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'description', 'file_type')
        }),
        ('Cloudinary', {
            'fields': ('cloudinary_url', 'cloudinary_public_id', 'file_size'),
            'classes': ('collapse',)
        }),
        ('Estado', {
            'fields': ('is_active', 'is_approved')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [Model3DImageInline]


@admin.register(Model3DImage)
class Model3DImageAdmin(admin.ModelAdmin):
    list_display = ('model_3d', 'is_main', 'order', 'created_at')
    list_filter = ('is_main', 'model_3d', 'created_at')
    search_fields = ('model_3d__name', 'cloudinary_public_id')
    readonly_fields = ('created_at', 'cloudinary_public_id')
    
    fieldsets = (
        ('Relación', {
            'fields': ('model_3d',)
        }),
        ('Cloudinary', {
            'fields': ('cloudinary_url', 'cloudinary_public_id')
        }),
        ('Presentación', {
            'fields': ('is_main', 'order')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
