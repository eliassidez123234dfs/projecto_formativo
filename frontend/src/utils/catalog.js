/**
 * Funciones puras para el catálogo.
 * Sin React ni efectos secundarios — testeables con Vitest.
 */

/** Agrega o quita un valor de un array sin mutar el original. */
export function toggleValue(list, value) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/** Frecuencias de un campo: countBy(products, 'color') → { negro: 2, … } */
export function countBy(list, field) {
  return list.reduce((acc, item) => {
    const key = item[field];
    if (key != null) acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

/** Devuelve los IDs seleccionados como string separado por comas, o '' si está vacío. */
export function toCsv(arr) {
  return arr.length ? arr.join(',') : '';
}

/** Parsea un string CSV a array limpio. */
export function fromCsv(str) {
  if (!str) return [];
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Formatea un número como COP sin decimales. */
export function formatCOP(value) {
  return `$${Number(value).toLocaleString('es-CO')}`;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Mapa de hex para colores conocidos.
 */
export const COLOR_HEX = {
  negro: '#161616', blanco: '#f4f4f5', rojo: '#c62828', gris: '#b9bcc2',
  azul: '#1f2a44', vino: '#6b1f2a', verde: '#5a6b3f', beige: '#d9c8a9',
  rosa: '#e91e8a', amarillo: '#f9a825', naranja: '#e65100', morado: '#6a1b9a',
};

/**
 * Normaliza la respuesta de /api/catalog/filters/ al shape que consume el UI.
 * Acepta items como string o como objeto {slug|value|id|name, count}.
 * ÚNICO punto de ajuste si el backend cambia nombres.
 */
export function normalizeFacets(raw) {
  if (!raw) return null;
  const list = (v) => (Array.isArray(v) ? v : []);
  const option = (item) => {
    if (typeof item === 'string') {
      const value = item.toLowerCase();
      return { value, label: capitalize(value), hex: COLOR_HEX[value], count: null };
    }
    const value = String(item.slug ?? item.value ?? item.id ?? item.name ?? '').toLowerCase();
    return {
      value,
      label: item.name ?? item.label ?? capitalize(value),
      hex: item.hex ?? COLOR_HEX[value],
      count: item.count ?? null,
    };
  };
  return {
    categories: list(raw.categories).map((c) => option(c)),
    sizes: list(raw.sizes).map((s) => (typeof s === 'string' ? s : String(s.value ?? s.name))),
    colors: list(raw.colors).map((c) => option(c)),
    priceRange: raw.price_range
      ? [raw.price_range.min ?? 0, raw.price_range.max ?? 150000]
      : null,
  };
}

/**
 * Cuenta cuántos campos de filtros difieren (para el badge "Aplicar (n)").
 * Compara CSV strings directamente para categories, sizes, colors.
 */
export function countFilterDiffs(draft, committed) {
  let n = 0;
  for (const k of ['category', 'size', 'color']) {
    if ((draft[k] || '') !== (committed[k] || '')) n++;
  }
  if ((draft.min_price || '') !== (committed.min_price || '')) n++;
  if ((draft.max_price || '') !== (committed.max_price || '')) n++;
  return n;
}
