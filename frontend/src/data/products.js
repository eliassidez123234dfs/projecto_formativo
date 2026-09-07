/**
 * Mock temporal para desarrollo offline y tests.
 * Con el backend listo, reemplazar por fetch a /api/catalog/.
 * La lógica pura en utils/catalog.js no cambia.
 */

export const SORT_OPTIONS = [
  { value: '-created_at',    label: 'Más recientes' },
  { value: 'base_price',     label: 'Precio: menor a mayor' },
  { value: '-base_price',    label: 'Precio: mayor a menor' },
  { value: '-name',          label: 'Nombre Z-A' },
  { value: 'name',           label: 'Nombre A-Z' },
  { value: 'popularity',     label: 'Más vendidos' },
];
