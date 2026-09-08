import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCatalog, fetchCatalogFilters } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import ErrorState from '../components/ErrorState';
import FilterSidebar from '../components/catalog/FilterSidebar';
import { useCart } from '../context/CartContext';
import { Header } from '../components/Header';
import useMediaQuery from '../hooks/useMediaQuery';
import { normalizeFacets, countFilterDiffs } from '../utils/catalog';
import '../styles/Catalog.css';

const INITIAL_FILTERS = {
  q: '',
  category: '',
  min_price: '',
  max_price: '',
  size: '',
  color: '',
  ordering: '-created_at',
};

const DEFAULT_BOUNDS = [0, 150000];

export const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.q);
  const [sort, setSort] = useState('-created_at');

  // Facets: fetch una vez al montar, nunca del paginado
  const [facets, setFacets] = useState(null);
  const [bounds, setBounds] = useState(DEFAULT_BOUNDS);

  const isMobile = useMediaQuery('(max-width: 991.98px)');
  const [draft, setDraft] = useState(null); // borrador del drawer móvil
  const latest = useRef(0); // race-condition guard
  const searchTimer = useRef(null);
  const navigate = useNavigate();
  const { cart } = useCart();

  // ── Fetch facets una sola vez al montar ──
  useEffect(() => {
    let alive = true;
    fetchCatalogFilters()
      .then((raw) => {
        if (!alive) return;
        const f = normalizeFacets(raw);
        setFacets(f);
        if (f?.priceRange) setBounds(f.priceRange);
      })
      .catch(() => {}); // fallback a DEFAULT_BOUNDS
    return () => { alive = false; };
  }, []);

  // ── Cerrar drawer con Escape ──
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDraft(null);
        setFiltersOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtersOpen]);

  // ── Limpiar timer de debounce al desmontar ──
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  // ── Debounce de búsqueda ──
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: value }));
    }, 350);
  }, []);

  // ── Cargar productos con race-guard ──
  const loadProducts = useCallback(
    async (targetPage = 1) => {
      const id = ++latest.current;
      setLoading(true);
      setError(null);
      try {
        const params = { ...filters, page: Number(targetPage) || 1 };
        if (sort) params.ordering = sort;
        const data = await fetchCatalog(params);
        if (id !== latest.current) return; // respuesta vieja, descartar
        const results = data.results || data;
        setProducts(results);
        setPage(targetPage);
        setPageInfo(
          data.count != null
            ? { next: data.next, previous: data.previous, count: data.count }
            : null
        );
        // facets vienen del paginado, pero NO los usamos — los tenemos del fetch único
      } catch (err) {
        if (id !== latest.current) return;
        setError(err);
        setProducts([]);
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [filters, sort]
  );

  // ── Recargar al cambiar filtros/orden ──
  useEffect(() => {
    const timer = setTimeout(() => loadProducts(1), 0);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // ── Mobile drawer: abrir = crear borrador, aplicar = confirmar, cerrar/✕/Escape = cancelar ──
  const openFilters = () => {
    setDraft({ ...filters });
    setFiltersOpen(true);
  };
  const applyDraft = () => {
    setFilters(draft);
    setDraft(null);
    setFiltersOpen(false);
  };
  const closeFilters = () => {
    setDraft(null);
    setFiltersOpen(false);
  };

  // En desktop: escribir directo a filters. En móvil con draft: escribir al borrador
  const sidebarFilters = isMobile && draft ? draft : filters;
  const sidebarChange = isMobile && draft ? setDraft : setFilters;
  const diffs = draft ? countFilterDiffs(draft, filters) : 0;

  // ── Sort handler ──
  const handleSortChange = (value) => {
    setSort(value);
    setFilters((prev) => ({ ...prev, ordering: value }));
  };

  const filterCount =
    (filters.category ? 1 : 0) +
    (filters.size ? 1 : 0) +
    (filters.color ? 1 : 0) +
    (filters.min_price ? 1 : 0) +
    (filters.max_price ? 1 : 0) +
    (filters.q ? 1 : 0);

  return (
    <>
      <Header cartCount={cart?.total_items || 0} />

      <div className="catalog-page">
        <div className="catalog-hero">
          <h1 className="catalog-title">Catálogo</h1>
          {pageInfo && (
            <p className="catalog-subtitle">
              {pageInfo.count} producto
              {(pageInfo.count || products.length) !== 1 ? 's' : ''} encontrado
              {(pageInfo.count || products.length) !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="catalog-layout">
          {/* ── Sidebar ── */}
          <aside
            className={`catalog-sidebar${filtersOpen ? ' is-open' : ''}`}
            aria-label="Filtros"
          >
            <div className="catalog-sidebar-head">
              <span>Filtros{filterCount > 0 ? ` (${filterCount})` : ''}</span>
              <button
                type="button"
                className="catalog-sidebar-close"
                aria-label="Cerrar filtros"
                onClick={closeFilters}
              >
                ✕
              </button>
            </div>
            <FilterSidebar
              filters={sidebarFilters}
              onChange={sidebarChange}
              facets={facets}
              bounds={bounds}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              sort={sort}
              onSortChange={handleSortChange}
            />

            {/* Barra de commit: solo visible en móvil */}
            <div className="catalog__apply-bar">
              <button
                type="button"
                className="chip"
                onClick={() => setDraft(INITIAL_FILTERS)}
              >
                Limpiar
              </button>
              <button
                type="button"
                className="chip chip--active"
                onClick={applyDraft}
              >
                Aplicar{diffs ? ` (${diffs})` : ''}
              </button>
            </div>
          </aside>

          {filtersOpen && (
            <button
              type="button"
              className="catalog-backdrop"
              aria-label="Cerrar filtros"
              onClick={closeFilters}
            />
          )}

          {/* ── Contenido ── */}
          <section className="catalog-content" aria-label="Listado de productos">
            <div className="catalog-toolbar">
              <div className="catalog-heading">
                <h1>Productos</h1>
                {pageInfo && (
                  <span className="catalog-count">
                    {pageInfo.count} resultado{pageInfo.count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline catalog-open-filters"
                  aria-expanded={filtersOpen}
                  onClick={isMobile ? openFilters : () => setFiltersOpen(!filtersOpen)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                  Filtros
                </button>
              </div>
            </div>

            {loading ? (
              <div className="catalog-skeleton">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="sk-card" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="sk-img" />
                    <div className="sk-body">
                      <div className="sk-line" style={{ width: '70%' }} />
                      <div className="sk-line" style={{ width: '35%', height: 22 }} />
                      <div className="sk-actions">
                        <div className="sk-btn" />
                        <div className="sk-btn" />
                        <div className="sk-btn" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <ErrorState
                error={error}
                module="catálogo de productos"
                onRetry={() => loadProducts(1)}
              />
            ) : products.length === 0 ? (
              <div className="catalog-empty">
                <h3>No hay productos disponibles</h3>
                <p>Intenta con otros filtros o categorías.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setFilters(INITIAL_FILTERS);
                    setSearchQuery('');
                    setSort('-created_at');
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="catalog-grid">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={{
                        id: product.id,
                        name: product.name,
                        base_price: Number(product.base_price ?? 0),
                        price: Number(
                          product.min_price ?? product.base_price ?? 0
                        ),
                        min_price: product.min_price,
                        max_price: product.max_price,
                        total_stock: product.total_stock,
                        color_hexes: product.color_hexes || {},
                        badge: product.is_new ? 'Nuevo' : null,
                        image: product.main_image || null,
                      }}
                      onView={(id) => navigate(`/product/${id}`)}
                    />
                  ))}
                </div>

                {pageInfo && (
                  <div className="catalog-pagination">
                    <button className="btn btn-secondary" disabled={loading || !pageInfo.previous}
                      onClick={() => loadProducts(page - 1)}>
                      Anterior
                    </button>
                    <div className="catalog-page-numbers" aria-label="Páginas del catálogo">
                      {Array.from({ length: Math.ceil(pageInfo.count / 20) }, (_, index) => index + 1)
                        .filter((number) => number === 1 || number === Math.ceil(pageInfo.count / 20) || Math.abs(number - page) <= 2)
                        .map((number, index, visible) => (
                          <span key={number} className="catalog-page-number-wrap">
                            {index > 0 && number - visible[index - 1] > 1 ? <span className="catalog-page-ellipsis">...</span> : null}
                            <button className={`catalog-page-number${number === page ? ' is-active' : ''}`} disabled={loading || number === page}
                              onClick={() => loadProducts(number)}>{number}</button>
                          </span>
                        ))}
                    </div>
                    <button className="btn btn-secondary" disabled={loading || !pageInfo.next}
                      onClick={() => loadProducts(page + 1)}>
                      Siguiente
                    </button>
                    <span className="catalog-pagination-summary">
                      {products.length} productos mostrados · {pageInfo.count} totales · página {page} de {Math.max(1, Math.ceil(pageInfo.count / 20))}
                    </span>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
};
