from __future__ import annotations

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Category, PopularSearch, ProductCategory, SearchHistory
from apps.products.models import Product, Variant


class CategoryModelTests(TestCase):
    def test_create_category(self):
        c = Category.objects.create(name="Ropa", description="Prendas de vestir")
        self.assertEqual(c.name, "Ropa")
        self.assertTrue(c.is_active)

    def test_category_str(self):
        c = Category.objects.create(name="Accesorios")
        self.assertEqual(str(c), "Accesorios")

    def test_category_ordering(self):
        Category.objects.create(name="Zapatos")
        Category.objects.create(name="Camisas")
        qs = Category.objects.all()
        self.assertEqual(qs.first().name, "Camisas")

    def test_product_count_zero(self):
        c = Category.objects.create(name="Empty")
        self.assertEqual(c.product_count, 0)

    def test_product_count_with_products(self):
        c = Category.objects.create(name="With Products")
        p = Product.objects.create(name="Test", description="Desc", base_price="10.00", is_active=True, is_approved=True)
        ProductCategory.objects.create(product=p, category=c)
        self.assertEqual(c.product_count, 1)

    def test_product_count_only_active_approved(self):
        c = Category.objects.create(name="Mixed")
        p1 = Product.objects.create(name="Active", description="Desc", base_price="10.00", is_active=True, is_approved=True)
        p2 = Product.objects.create(name="Inactive", description="Desc", base_price="10.00")
        ProductCategory.objects.create(product=p1, category=c)
        ProductCategory.objects.create(product=p2, category=c)
        self.assertEqual(c.product_count, 1)


class ProductCategoryModelTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Cat1")
        self.product = Product.objects.create(name="Prod1", description="Desc", base_price="10.00")

    def test_create_product_category(self):
        pc = ProductCategory.objects.create(product=self.product, category=self.category)
        self.assertEqual(str(pc), "Prod1 - Cat1")

    def test_unique_together(self):
        ProductCategory.objects.create(product=self.product, category=self.category)
        with self.assertRaises(Exception):
            ProductCategory.objects.create(product=self.product, category=self.category)


class SearchHistoryModelTests(TestCase):
    def test_create_search_history(self):
        sh = SearchHistory.objects.create(
            session_key="abc123", query="camiseta",
            filters={"size": "M"}, results_count=5,
        )
        self.assertEqual(sh.query, "camiseta")
        self.assertEqual(sh.results_count, 5)

    def test_search_history_str(self):
        sh = SearchHistory.objects.create(session_key="abc123def456", query="gorra")
        self.assertIn("gorra", str(sh))
        self.assertIn("abc123", str(sh))

    def test_search_history_ordering(self):
        sh1 = SearchHistory.objects.create(session_key="key1", query="query1")
        sh2 = SearchHistory.objects.create(session_key="key1", query="query2")
        qs = SearchHistory.objects.all()
        self.assertEqual(qs.first(), sh2)


class PopularSearchModelTests(TestCase):
    def test_create_popular_search(self):
        ps = PopularSearch.objects.create(query="camiseta", search_count=10)
        self.assertEqual(ps.query, "camiseta")
        self.assertEqual(ps.search_count, 10)

    def test_popular_search_str(self):
        ps = PopularSearch.objects.create(query="zapatos", search_count=5)
        self.assertIn("zapatos", str(ps))
        self.assertIn("5", str(ps))

    def test_record_search_new(self):
        PopularSearch.record_search("camiseta")
        self.assertEqual(PopularSearch.objects.count(), 1)
        self.assertEqual(PopularSearch.objects.first().search_count, 1)

    def test_record_search_existing(self):
        PopularSearch.objects.create(query="camiseta", search_count=5)
        PopularSearch.record_search("camiseta")
        self.assertEqual(PopularSearch.objects.first().search_count, 6)

    def test_record_search_ignores_short_query(self):
        PopularSearch.record_search("a")
        self.assertEqual(PopularSearch.objects.count(), 0)

    def test_record_search_normalizes_case(self):
        PopularSearch.record_search("Camiseta")
        PopularSearch.record_search("CAMISETA")
        self.assertEqual(PopularSearch.objects.count(), 1)
        self.assertEqual(PopularSearch.objects.first().search_count, 2)

    def test_popular_search_defaults(self):
        ps = PopularSearch.objects.create(query="test")
        self.assertEqual(ps.search_count, 0)
        self.assertTrue(ps.is_active)
        self.assertIsNotNone(ps.last_searched)

    def test_popular_search_ordering(self):
        PopularSearch.objects.create(query="zapatos", search_count=100)
        PopularSearch.objects.create(query="camisas", search_count=50)
        PopularSearch.objects.create(query="gorras", search_count=200)
        qs = PopularSearch.objects.all()
        self.assertEqual(qs.first().query, "gorras")

    def test_record_search_strips_whitespace(self):
        PopularSearch.record_search("  camiseta  ")
        self.assertEqual(PopularSearch.objects.first().query, "camiseta")


# ─── API Tests ──────────────────────────────────────────────────────────────


class CatalogAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_catalog_list(self):
        p = Product.objects.create(name="Catalog Product", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        url = reverse("catalog-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

    def test_catalog_list_filters_included(self):
        p = Product.objects.create(name="Filter Test", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        url = reverse("catalog-list")
        response = self.client.get(url, format="json")
        self.assertIn("filters", response.data)
        self.assertIn("popular_searches", response.data)

    def test_catalog_only_shows_active_approved(self):
        Product.objects.create(name="Active", description="Desc", base_price="10.00", is_active=True, is_approved=True)
        Product.objects.create(name="Inactive", description="Desc", base_price="10.00")
        Product.objects.create(name="Not Approved", description="Desc", base_price="10.00", is_active=True)
        url = reverse("catalog-list")
        response = self.client.get(url, format="json")
        self.assertEqual(len(response.data["results"]), 1)

    def test_catalog_search_by_name(self):
        p = Product.objects.create(name="Busqueda Test", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        url = reverse("catalog-list")
        response = self.client.get(url, {"q": "Busqueda"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_catalog_search_no_results(self):
        url = reverse("catalog-list")
        response = self.client.get(url, {"q": "xyznotfound"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)

    def test_catalog_search_records_history(self):
        session = self.client.session
        session.save()
        p = Product.objects.create(name="Hist Test", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        url = reverse("catalog-list")
        self.client.get(url, {"q": "Hist"}, format="json")
        history_count = SearchHistory.objects.filter(session_key=session.session_key, query="Hist").count()
        self.assertEqual(history_count, 1)

    def test_catalog_search_records_popular(self):
        p = Product.objects.create(name="Popular Test", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        # Crear sesión para que se guarde el historial
        session = self.client.session
        session.save()
        url = reverse("catalog-list")
        self.client.get(url, {"q": "Popular"}, format="json")
        self.assertTrue(PopularSearch.objects.filter(query="popular").exists())

    def test_catalog_filter_by_category(self):
        cat = Category.objects.create(name="Electronics")
        p = Product.objects.create(name="Gadget", description="Desc", base_price="50.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        ProductCategory.objects.create(product=p, category=cat)
        url = reverse("catalog-list")
        response = self.client.get(url, {"category": cat.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_catalog_filter_by_size(self):
        p = Product.objects.create(name="Size Filter", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="XL", color="Negro", stock=5)
        url = reverse("catalog-list")
        response = self.client.get(url, {"size": "XL"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_catalog_filter_by_color(self):
        p = Product.objects.create(name="Color Filter", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Rojo", stock=5)
        url = reverse("catalog-list")
        response = self.client.get(url, {"color": "Rojo"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_catalog_filter_by_price_range(self):
        Product.objects.create(name="Cheap", description="Desc", base_price="5.00", is_active=True, is_approved=True)
        p2 = Product.objects.create(name="Expensive", description="Desc", base_price="50.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p2, size="M", color="Negro", stock=5)
        url = reverse("catalog-list")
        response = self.client.get(url, {"min_price": "10", "max_price": "100"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_catalog_filter_by_has_stock(self):
        p1 = Product.objects.create(name="In Stock", description="Desc", base_price="10.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p1, size="M", color="Negro", stock=5)
        p2 = Product.objects.create(name="No Stock", description="Desc", base_price="10.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p2, size="M", color="Rojo", stock=0)
        url = reverse("catalog-list")
        response = self.client.get(url, {"has_stock": "true"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result_names = [r["name"] for r in response.data["results"]]
        self.assertIn("In Stock", result_names)
        self.assertNotIn("No Stock", result_names)


class CatalogDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_retrieve_product(self):
        p = Product.objects.create(name="Detail Test", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        url = reverse("catalog-detail", args=[p.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Detail Test")

    def test_retrieve_nonexistent(self):
        url = reverse("catalog-detail", args=[9999])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CatalogFiltersEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_filters_endpoint(self):
        cat = Category.objects.create(name="Cat1")
        p = Product.objects.create(name="Filter Test", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        ProductCategory.objects.create(product=p, category=cat)
        url = reverse("catalog-filters")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("categories", response.data)
        self.assertIn("sizes", response.data)
        self.assertIn("colors", response.data)
        self.assertIn("price_range", response.data)

    def test_filters_empty_when_no_products(self):
        url = reverse("catalog-filters")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class PopularSearchesAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_popular_searches_endpoint(self):
        PopularSearch.objects.create(query="camiseta", search_count=100)
        PopularSearch.objects.create(query="zapatos", search_count=50)
        url = reverse("catalog-popular-searches")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_popular_searches_excludes_inactive(self):
        PopularSearch.objects.create(query="active", search_count=10, is_active=True)
        PopularSearch.objects.create(query="inactive", search_count=5, is_active=False)
        url = reverse("catalog-popular-searches")
        response = self.client.get(url, format="json")
        queries = [s["query"] for s in response.data]
        self.assertIn("active", queries)
        self.assertNotIn("inactive", queries)

    def test_popular_searches_ordering(self):
        PopularSearch.objects.create(query="top", search_count=200)
        PopularSearch.objects.create(query="mid", search_count=100)
        PopularSearch.objects.create(query="low", search_count=50)
        url = reverse("catalog-popular-searches")
        response = self.client.get(url, format="json")
        self.assertEqual(response.data[0]["query"], "top")


class SearchHistoryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_search_history_endpoint(self):
        session = self.client.session
        session.save()
        SearchHistory.objects.create(session_key=session.session_key, query="test", results_count=3)
        url = reverse("catalog-search-history")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_search_history_no_session(self):
        client = APIClient()
        url = reverse("catalog-search-history")
        response = client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])


class FeaturedDealsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_featured_endpoint(self):
        p = Product.objects.create(name="Featured", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        from apps.products.models import ProductImage
        ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img.png")
        url = reverse("catalog-featured")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_deals_endpoint(self):
        p = Product.objects.create(name="Deal", description="Desc", base_price="15.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        url = reverse("catalog-deals")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class CategoryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_category_list(self):
        Category.objects.create(name="Cat1")
        Category.objects.create(name="Cat2")
        url = reverse("category-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    def test_category_products(self):
        cat = Category.objects.create(name="Test Cat")
        p = Product.objects.create(name="Cat Product", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        ProductCategory.objects.create(product=p, category=cat)
        url = reverse("category-products", args=[cat.pk])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
