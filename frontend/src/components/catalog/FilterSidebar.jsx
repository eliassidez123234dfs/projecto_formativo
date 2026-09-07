import { toggleValue, fromCsv, toCsv } from '../../utils/catalog';
import { SORT_OPTIONS } from '../../data/products';
import PriceRange from './PriceRange';

function FilterSection({ title, children, defaultOpen = true }) {
  return (
    <details className="filter-section" open={defaultOpen}>
      <summary className="filter-section__head">{title}</summary>
      <div className="filter-section__body">{children}</div>
    </details>
  );
}

function CheckList({ items, selected, onToggle, swatch }) {
  return items.map((it) => (
    <label key={it.value} className="filter-check">
      <input
        type="checkbox"
        checked={selected.includes(it.value)}
        onChange={() => onToggle(it.value)}
      />
      {swatch && (
        <span
          className="filter-swatch"
          style={{ backgroundColor: it.hex }}
          aria-hidden="true"
        />
      )}
      <span className="filter-check__label">{it.label}</span>
      {it.count != null && (
        <span className="filter-check__count">({it.count})</span>
      )}
    </label>
  ));
}

export default function FilterSidebar({
  filters,
  onChange,
  facets,
  bounds,
  onSearchChange,
  searchQuery,
  sort,
  onSortChange,
}) {
  const categories = facets?.categories ?? [];
  const sizes = facets?.sizes ?? [];
  const colors = facets?.colors ?? [];

  const selectedCategories = fromCsv(filters.category);
  const selectedSizes = fromCsv(filters.size);
  const selectedColors = fromCsv(filters.color);

  const set = (partial) => onChange({ ...filters, ...partial });

  return (
    <div className="filter-panel">
      <div className="filter-panel__head">
        <span className="filter-panel__title">FILTROS</span>
        <button
          type="button"
          className="filter-panel__clear"
          onClick={() =>
            onChange({
              q: '',
              category: '',
              size: '',
              color: '',
              min_price: '',
              max_price: '',
              ordering: filters.ordering,
            })
          }
        >
          Limpiar todo
        </button>
      </div>

      {/* Búsqueda */}
      <FilterSection title="Buscar" defaultOpen={!!searchQuery}>
        <div className="catalog-search-wrap">
          <svg
            className="catalog-search-ico"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </FilterSection>

      {/* Ordenamiento */}
      <FilterSection title="Ordenar por">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.45rem 0.6rem',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '0.85rem',
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Categorías */}
      {categories.length > 0 && (
        <FilterSection title="Categorías">
          <CheckList
            items={categories}
            selected={selectedCategories}
            onToggle={(v) => set({ category: toCsv(toggleValue(selectedCategories, v)) })}
          />
        </FilterSection>
      )}

      {/* Tallas */}
      {sizes.length > 0 && (
        <FilterSection title="Talla">
          <div className="chip-row">
            {sizes.map((s) => {
              const value = typeof s === 'string' ? s : s.value;
              const active = selectedSizes.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  className={`chip${active ? ' chip--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => set({ size: toCsv(toggleValue(selectedSizes, value)) })}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* Colores */}
      {colors.length > 0 && (
        <FilterSection title="Color">
          <CheckList
            swatch
            items={colors}
            selected={selectedColors}
            onToggle={(v) => set({ color: toCsv(toggleValue(selectedColors, v)) })}
          />
        </FilterSection>
      )}

      {/* Precio — bounds estáticos, commit al soltar */}
      <FilterSection title="Precio">
        <PriceRange
          min={bounds[0]}
          max={bounds[1]}
          value={[
            filters.min_price ? Number(filters.min_price) : bounds[0],
            filters.max_price ? Number(filters.max_price) : bounds[1],
          ]}
          onCommit={([lo, hi]) =>
            set({
              min_price: lo > bounds[0] ? String(lo) : '',
              max_price: hi < bounds[1] ? String(hi) : '',
            })
          }
        />
      </FilterSection>
    </div>
  );
}
