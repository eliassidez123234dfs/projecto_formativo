import os
from diagrams import Diagram, Cluster, Edge
from diagrams.onprem.client import User
from diagrams.onprem.network import Nginx
from diagrams.onprem.database import PostgreSQL, MongoDB
from diagrams.programming.framework import React, Django
from diagrams.saas.media import Cloudinary
from diagrams.onprem.inmemory import Redis
from diagrams.custom import Custom


os.chdir(os.path.dirname(os.path.abspath(__file__)))

with Diagram("Arquitectura RED Estampacion", filename="arquitectura_diagrams_python", show=False, direction="LR"):
    client = User("Cliente Web")
    admin = User("Administrador")

    with Cluster("Capa de Presentación (Frontend SPA)"):
        react_app = React("React 19 SPA (:5173)")
        editor_3d = React("Microservicio 3D (:5174)")

    with Cluster("Backend Monolito Modular (Django REST :8000)"):
        with Cluster("API Gateway & Security"):
            security = Django("JWT / CSP Middleware")
            drf = Django("DRF ViewSets & Routers")

        with Cluster("Módulos de Negocio"):
            users_mod = Django("Users App")
            products_mod = Django("Products App")
            carts_mod = Django("Carts App")
            orders_mod = Django("Orders & Checkout App")

    with Cluster("Persistencia & Datos"):
        postgres = PostgreSQL("PostgreSQL 16")
        mongodb = MongoDB("MongoDB NoSQL")

    with Cluster("Servicios Cloud & Externos"):
        cloudinary = Cloudinary("Cloudinary CDN")
        wompi = Nginx("Pasarela Wompi")
        smtp = Nginx("Servidor SMTP")


    # Conexiones
    client >> react_app
    client >> editor_3d
    admin >> react_app

    react_app >> Edge(label="HTTPS / JSON") >> security
    security >> drf

    drf >> users_mod
    drf >> products_mod
    drf >> carts_mod
    drf >> orders_mod

    users_mod >> postgres
    products_mod >> postgres
    carts_mod >> postgres
    orders_mod >> postgres

    users_mod >> mongodb
    carts_mod >> mongodb

    products_mod >> Edge(label="Media Upload") >> cloudinary
    orders_mod >> Edge(label="Transacciones / Webhook") >> wompi
    users_mod >> Edge(label="Correos Verificación") >> smtp

print("Diagrama generado exitosamente con Diagrams (Python)")
