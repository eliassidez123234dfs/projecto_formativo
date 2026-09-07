# Estrategia de Pruebas (TDD) — RED Estampación

> Test-Driven Development: pirámide de pruebas, frameworks, ejemplos

---

## 1. Pirámide de Pruebas

```
        ╱╲
       ╱ E2E ╲       ← 5%  — Playwright / Cypress
      ╱────────╲
     ╱Integración╲    ← 15% — pytest-django / Vitest + MSW
    ╱──────────────╲
   ╱   Unitarias     ╲  ← 80% — pytest / Vitest
  ╱────────────────────╲
```

## 2. Frameworks

| Capa | Framework | Configuración |
|------|-----------|---------------|
| Backend Unit | pytest + pytest-django | `pytest.ini` con `DJANGO_SETTINGS_MODULE` |
| Backend API | DRF's APITestCase + pytest | `APIClient` para requests |
| Frontend Unit | Vitest + React Testing Library | `vitest.config.js` en frontend/ |
| Frontend E2E | Playwright (futuro) | `playwright.config.js` |
| Contratos | DRF's APITestCase + schema | Validar request/response contra OpenAPI |
| Cobertura | pytest-cov / c8 | Mínimo 80% |

## 3. Estructura de Tests

```
backend/
  tests/
    unit/
      test_models.py
      test_serializers.py
      test_permissions.py
    integration/
      test_api_products.py
      test_api_cart.py
      test_api_checkout.py
      test_api_auth.py
    contract/
      test_product_contract.py
      test_cart_contract.py

frontend/
  src/
    __tests__/
      components/
        ProductCard.test.jsx
        CartItem.test.jsx
      pages/
        Catalog.test.jsx
        Cart.test.jsx
      context/
        CartContext.test.jsx
      services/
        api.test.js
```

## 4. Ejemplos TDD

### Backend: Test de Modelo Producto

```python
# backend/tests/unit/test_models.py
import pytest
from django.core.exceptions import ValidationError
from apps.products.models import Producto, Variante

pytestmark = pytest.mark.django_db

class TestProductoModel:
    def test_create_producto_minimal(self):
        """RED: debe fallar porque no implementamos create aún"""
        producto = Producto.objects.create(
            name="Camiseta Test",
            base_price=19.99
        )
        assert producto.name == "Camiseta Test"
        assert producto.base_price == 19.99
        assert producto.is_active is False  # default

    def test_producto_ready_to_publish(self):
        """GREEN: checklist completo = ready_to_publish True"""
        producto = Producto.objects.create(
            name="Test",
            base_price=10.00,
            is_active=True,
            is_approved=True
        )
        # REFACTOR: implementar lógica de checklist
        assert producto.ready_to_publish is True

    def test_producto_base_price_must_be_positive(self):
        """RED: precio negativo debe fallar"""
        with pytest.raises(ValidationError):
            producto = Producto(name="Test", base_price=-5)
            producto.full_clean()
```

### Backend: Test de API

```python
# backend/tests/integration/test_api_products.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.products.models import Producto

User = get_user_model()

class TestProductsAPI(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@test.com", password="admin123"
        )
        self.client.force_authenticate(user=self.admin)

    def test_create_product(self):
        """RED → GREEN: crear producto como admin"""
        data = {
            "name": "Camiseta Premium",
            "description": "Algodón 100%",
            "base_price": "29.99",
            "is_active": False
        }
        response = self.client.post("/api/products/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Camiseta Premium"

    def test_unauthenticated_cannot_create(self):
        """RED: usuario no autenticado no puede crear"""
        self.client.force_authenticate(user=None)
        data = {"name": "Test", "base_price": "10.00"}
        response = self.client.post("/api/products/", data, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

### Frontend: Test de Componente

```jsx
// frontend/src/__tests__/components/ProductCard.test.jsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../../components/ProductCard';

const mockProduct = {
  id: 1,
  name: 'Camiseta Test',
  base_price: '19.99',
  main_image: 'http://example.com/img.jpg',
  variants_count: 4,
};

describe('ProductCard', () => {
  it('renders product name and price', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );
    expect(screen.getByText('Camiseta Test')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
  });

  it('links to product detail page', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/product/1');
  });
});
```

## 5. Ciclo TDD (Red-Green-Refactor)

```
1. RED:   Escribir test que falla
2. GREEN: Implementar mínimo para que pase
3. REFACTOR: Mejorar código manteniendo tests verdes

Ejemplo con producto:
  RED:   test_producto_base_price_must_be_positive() → FAIL
  GREEN: Agregar validación `base_price >= 0` en modelo → PASS
  REFACTOR: Mover validación a serializer, usar MinValueValidator
```

## 6. Cobertura Mínima

| Módulo | Cobertura Mínima | Prioridad |
|--------|-----------------|-----------|
| Modelos | 90% | Alta |
| APIs (Views/ViewSets) | 85% | Alta |
| Serializers | 80% | Alta |
| Lógica de negocio (services) | 90% | Alta |
| Componentes frontend | 70% | Media |
| Contextos frontend | 75% | Media |

## 7. CI/CD con Tests

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: user
          POSTGRES_PASSWORD: pass
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest --cov=apps --cov-fail-under=80

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --coverage --coverageThreshold='{"global":{"lines":70}}'
```
