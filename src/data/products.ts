export type ProductCategory =
  | "impresoras"
  | "filamentos"
  | "resinas"
  | "repuestos"
  | "escaners"
  | "lapices"
  | "camaras";

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  price: number; // COP
  brand?: string;
  material?: string;
  color?: string;
  short: string;
  description: string;
  specs: { label: string; value: string }[];
  kiaraTip: string;
  featured?: boolean;
  image: string; // gradient key: orange | teal | wine
};

export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: "impresoras", label: "Impresoras 3D" },
  { id: "filamentos", label: "Filamentos" },
  { id: "resinas", label: "Resinas" },
  { id: "repuestos", label: "Repuestos" },
  { id: "escaners", label: "Escáners 3D" },
  { id: "lapices", label: "Lápices 3D" },
  { id: "camaras", label: "Cámaras 3D" },
];

export const PRODUCTS: Product[] = [
  {
    slug: "creality-k1-max",
    name: "Creality K1 Max",
    category: "impresoras",
    brand: "Creality",
    price: 4990000,
    short: "Impresora FDM de gran volumen (300×300×300 mm) con velocidad CoreXY.",
    description:
      "La K1 Max combina un volumen de impresión de 300×300×300 mm con velocidades de hasta 600 mm/s. Ideal para prototipos grandes y producción rápida.",
    specs: [
      { label: "Volumen", value: "300 × 300 × 300 mm" },
      { label: "Velocidad máx.", value: "600 mm/s" },
      { label: "Tecnología", value: "FDM CoreXY" },
      { label: "Cámara IA", value: "Sí" },
    ],
    kiaraTip: "Perfecta si quieres piezas grandes rápido. ¡Guau!",
    featured: true,
    image: "orange",
  },
  {
    slug: "bambu-x1-carbon",
    name: "Bambu Lab X1 Carbon",
    category: "impresoras",
    brand: "Bambu Lab",
    price: 6890000,
    short: "Multicolor AMS, láser lidar y CoreXY sellada.",
    description:
      "Impresión multicolor con AMS, sensor lidar para primera capa perfecta y cerramiento total para materiales técnicos.",
    specs: [
      { label: "Volumen", value: "256 × 256 × 256 mm" },
      { label: "Colores", value: "Hasta 16 (con 4 AMS)" },
      { label: "Materiales", value: "PLA, PETG, ABS, PA, PC" },
    ],
    kiaraTip: "La consentida para acabados profesionales multicolor.",
    featured: true,
    image: "teal",
  },
  {
    slug: "elegoo-saturn-4-ultra",
    name: "Elegoo Saturn 4 Ultra",
    category: "impresoras",
    brand: "Elegoo",
    price: 2490000,
    short: "Resina MSLA 12K con velocidad Tilt Release.",
    description:
      "Detalle 12K en un área de impresión generosa. Ideal para miniaturas, joyería y modelos dentales.",
    specs: [
      { label: "Resolución", value: "12K" },
      { label: "Área", value: "218 × 123 × 220 mm" },
    ],
    kiaraTip: "Cuidado con la resina — usa siempre guantes y ventilación.",
    image: "wine",
  },
  {
    slug: "filamento-pla-premium",
    name: "Filamento PLA Premium 1kg",
    category: "filamentos",
    material: "PLA",
    color: "Varios",
    price: 89000,
    short: "PLA de alta calidad, bobina de 1 kg, 1.75 mm.",
    description:
      "PLA premium con tolerancia ±0.02 mm. Impresión sin warping, colores vivos. Disponible en más de 20 tonos.",
    specs: [
      { label: "Diámetro", value: "1.75 mm" },
      { label: "Peso", value: "1 kg" },
      { label: "Temp. hotend", value: "190-220 °C" },
    ],
    kiaraTip: "Mi favorito para prototipos rápidos y piezas decorativas.",
    featured: true,
    image: "orange",
  },
  {
    slug: "filamento-petg-industrial",
    name: "Filamento PETG Industrial 1kg",
    category: "filamentos",
    material: "PETG",
    color: "Negro",
    price: 115000,
    short: "PETG resistente al impacto y a la intemperie.",
    description:
      "Combina la facilidad del PLA con la resistencia del ABS. Ideal para piezas funcionales expuestas al sol o la humedad.",
    specs: [
      { label: "Diámetro", value: "1.75 mm" },
      { label: "Temp. hotend", value: "230-250 °C" },
    ],
    kiaraTip: "Ideal para piezas mecánicas que sufren golpes.",
    image: "teal",
  },
  {
    slug: "filamento-tpu-flex",
    name: "Filamento TPU Flexible 500g",
    category: "filamentos",
    material: "TPU",
    color: "Rojo",
    price: 145000,
    short: "TPU 95A flexible para juntas, mangos y calzado.",
    description: "Elastómero termoplástico con excelente memoria. Requiere extrusor directo.",
    specs: [
      { label: "Dureza", value: "95 Shore A" },
      { label: "Peso", value: "500 g" },
    ],
    kiaraTip: "Baja la velocidad a 25 mm/s para resultados perfectos.",
    image: "wine",
  },
  {
    slug: "resina-abs-like",
    name: "Resina ABS-Like 1kg",
    category: "resinas",
    material: "Resina",
    color: "Gris",
    price: 165000,
    short: "Resistente y con acabado semi-mate.",
    description:
      "Resina fotopolimérica con propiedades similares al ABS. Baja fragilidad, ideal para piezas funcionales.",
    specs: [
      { label: "Longitud de onda", value: "405 nm" },
      { label: "Peso", value: "1 kg" },
    ],
    kiaraTip: "Post-cura de 5 min con UV para máxima resistencia.",
    image: "wine",
  },
  {
    slug: "hotend-v6-clon",
    name: "Hotend V6 Full Metal",
    category: "repuestos",
    price: 89000,
    short: "Hotend compatible con la mayoría de impresoras FDM.",
    description: "Bloque calefactor completo con boquilla 0.4 mm, heatbreak titanio y termistor.",
    specs: [
      { label: "Boquilla", value: "0.4 mm (intercambiable)" },
      { label: "Temp. máx.", value: "300 °C" },
    ],
    kiaraTip: "Cambia la boquilla cada 500 h para preservar el detalle.",
    image: "teal",
  },
  {
    slug: "escaner-revopoint-pop3",
    name: "Escáner 3D Revopoint POP 3",
    category: "escaners",
    brand: "Revopoint",
    price: 3290000,
    short: "Precisión 0.05 mm, ideal para ingeniería inversa.",
    description:
      "Escáner de mano con luz estructurada infrarroja. Perfecto para escanear piezas y personas.",
    specs: [
      { label: "Precisión", value: "0.05 mm" },
      { label: "Velocidad", value: "18 fps" },
    ],
    kiaraTip: "Un imprescindible si haces ingeniería inversa.",
    featured: true,
    image: "teal",
  },
  {
    slug: "lapiz-3d-myriwell",
    name: "Lápiz 3D Myriwell RP-100C",
    category: "lapices",
    price: 249000,
    short: "Lápiz 3D para creaciones manuales y decoración.",
    description:
      "Pantalla LCD, control de temperatura y velocidad. Compatible con PLA y ABS 1.75 mm.",
    specs: [{ label: "Filamento", value: "PLA/ABS 1.75 mm" }],
    kiaraTip: "Regalo perfecto para niños creativos (con supervisión).",
    image: "orange",
  },
  {
    slug: "camara-3d-matterport",
    name: "Cámara 3D Matterport Pro3",
    category: "camaras",
    brand: "Matterport",
    price: 24900000,
    short: "Captura espacios completos en 3D con precisión LiDAR.",
    description: "Cámara profesional para tours virtuales, planos y modelos 3D de espacios reales.",
    specs: [
      { label: "Tecnología", value: "LiDAR" },
      { label: "Alcance", value: "100 m" },
    ],
    kiaraTip: "Ideal para inmobiliarias y arquitectura.",
    image: "wine",
  },
];

export function formatCOP(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export function productBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
