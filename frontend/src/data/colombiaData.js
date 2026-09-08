/**
 * Datos oficiales de Departamentos y Municipios principales de Colombia.
 * Permite una selección fluida en el checkout sin depender de APIs externas propensas a caídas.
 */

export const COLOMBIA_DEPARTAMENTOS = [
  {
    id: 'Amazonas',
    nombre: 'Amazonas',
    ciudades: ['Leticia', 'Puerto Nariño']
  },
  {
    id: 'Antioquia',
    nombre: 'Antioquia',
    ciudades: ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Rionegro', 'Turbo', 'Caucasia', 'Sabaneta', 'Caldas', 'Copacabana', 'La Estrella', 'Girardota', 'Marinilla', 'Guarne', 'Santa Fe de Antioquia']
  },
  {
    id: 'Arauca',
    nombre: 'Arauca',
    ciudades: ['Arauca', 'Arauquita', 'Saravena', 'Tame']
  },
  {
    id: 'Atlántico',
    nombre: 'Atlántico',
    ciudades: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Baranoa', 'Puerto Colombia', 'Galapa']
  },
  {
    id: 'Bogotá D.C.',
    nombre: 'Bogotá D.C.',
    ciudades: ['Bogotá D.C. (Usaquén)', 'Bogotá D.C. (Chapinero)', 'Bogotá D.C. (Santa Fe)', 'Bogotá D.C. (Suba)', 'Bogotá D.C. (Kennedy)', 'Bogotá D.C. (Engativá)', 'Bogotá D.C. (Fontibón)', 'Bogotá D.C. (Teusaquillo)', 'Bogotá D.C. (Puente Aranda)', 'Bogotá D.C. (Bosa)', 'Bogotá D.C. (Ciudad Bolívar)', 'Bogotá D.C. (Usme)']
  },
  {
    id: 'Bolívar',
    nombre: 'Bolívar',
    ciudades: ['Cartagena', 'Magangué', 'El Carmen de Bolívar', 'Turbaco', 'Arjona', 'Mompox']
  },
  {
    id: 'Boyacá',
    nombre: 'Boyacá',
    ciudades: ['Tunja', 'Sogamoso', 'Duitama', 'Chiquinquirá', 'Puerto Boyacá', 'Paipa', 'Villa de Leyva', 'Moniquirá']
  },
  {
    id: 'Caldas',
    nombre: 'Caldas',
    ciudades: ['Manizales', 'La Dorada', 'Chinchiná', 'Villamaría', 'Anserma', 'Riosucio']
  },
  {
    id: 'Caquetá',
    nombre: 'Caquetá',
    ciudades: ['Florencia', 'San Vicente del Caguán', 'Cartagena del Chairá']
  },
  {
    id: 'Casanare',
    nombre: 'Casanare',
    ciudades: ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Paz de Ariporo']
  },
  {
    id: 'Cauca',
    nombre: 'Cauca',
    ciudades: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía (El Bordo)', 'Piendamó']
  },
  {
    id: 'Cesar',
    nombre: 'Cesar',
    ciudades: ['Valledupar', 'Aguachica', 'Agustín Codazzi', 'Bosconia', 'Curumaní']
  },
  {
    id: 'Chocó',
    nombre: 'Chocó',
    ciudades: ['Quibdó', 'Istmina', 'Condoto', 'Tadó', 'Acandí']
  },
  {
    id: 'Córdoba',
    nombre: 'Córdoba',
    ciudades: ['Montería', 'Cereté', 'Lorica', 'Sahagún', 'Montelíbano', 'Tierralta', 'Planeta Rica']
  },
  {
    id: 'Cundinamarca',
    nombre: 'Cundinamarca',
    ciudades: ['Soacha', 'Facatativá', 'Fusagasugá', 'Chía', 'Zipaquirá', 'Mosquera', 'Madrid', 'Funza', 'Girardot', 'Cajicá', 'Cota', 'Ubaté', 'Tocancipá', 'Sopó', 'Villeta', 'La Calera']
  },
  {
    id: 'Guainía',
    nombre: 'Guainía',
    ciudades: ['Inírida']
  },
  {
    id: 'Guaviare',
    nombre: 'Guaviare',
    ciudades: ['San José del Guaviare', 'El Retorno', 'Calamar']
  },
  {
    id: 'Huila',
    nombre: 'Huila',
    ciudades: ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'San Agustín']
  },
  {
    id: 'La Guajira',
    nombre: 'La Guajira',
    ciudades: ['Riohacha', 'Maicao', 'Uribia', 'Manaure', 'San Juan del Cesar', 'Fonseca']
  },
  {
    id: 'Magdalena',
    nombre: 'Magdalena',
    ciudades: ['Santa Marta', 'Ciénaga', 'Fundación', 'Plato', 'El Banco', 'Aracataca']
  },
  {
    id: 'Meta',
    nombre: 'Meta',
    ciudades: ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'San Martín', 'Cumaral']
  },
  {
    id: 'Nariño',
    nombre: 'Nariño',
    ciudades: ['Pasto', 'Tumaco', 'Ipiales', 'Samaniego', 'Tuquerres', 'La Unión']
  },
  {
    id: 'Norte de Santander',
    nombre: 'Norte de Santander',
    ciudades: ['Cúcuta', 'Ocaña', 'Villa del Rosario', 'Los Patios', 'Pamplona', 'Tibú']
  },
  {
    id: 'Putumayo',
    nombre: 'Putumayo',
    ciudades: ['Mocoa', 'Puerto Asís', 'Orito', 'Valle del Guamuez', 'Sibundoy']
  },
  {
    id: 'Quindío',
    nombre: 'Quindío',
    ciudades: ['Armenia', 'Calarcá', 'La Tebaida', 'Montenegro', 'Quimbaya', 'Circasia', 'Salento']
  },
  {
    id: 'Risaralda',
    nombre: 'Risaralda',
    ciudades: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Belén de Umbría']
  },
  {
    id: 'San Andrés y Providencia',
    nombre: 'San Andrés y Providencia',
    ciudades: ['San Andrés', 'Providencia']
  },
  {
    id: 'Santander',
    nombre: 'Santander',
    ciudades: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro', 'Barbosa', 'Vélez', 'Lebrija']
  },
  {
    id: 'Sucre',
    nombre: 'Sucre',
    ciudades: ['Sincelejo', 'Corozal', 'San Marcos', 'San Onofre', 'Tolú', 'Sampués']
  },
  {
    id: 'Tolima',
    nombre: 'Tolima',
    ciudades: ['Ibagué', 'Espinal', 'Melgar', 'Chaparral', 'Líbano', 'Mariquita', 'Honda', 'Flandes']
  },
  {
    id: 'Valle del Cauca',
    nombre: 'Valle del Cauca',
    ciudades: ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Yumbo', 'Cartago', 'Buga', 'Jamundí', 'Candelaria', 'Pradera', 'Florida', 'Zarzal', 'Roldanillo']
  },
  {
    id: 'Vaupés',
    nombre: 'Vaupés',
    ciudades: ['Mitú', 'Carurú', 'Taraira']
  },
  {
    id: 'Vichada',
    nombre: 'Vichada',
    ciudades: ['Puerto Carreño', 'La Primavera', 'Santa Rosalía', 'Cumaribo']
  }
];
