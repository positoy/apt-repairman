import { getMysqlPool } from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";

export type AdminApartment = {
  id: number;
  name: string;
  sido: string;
  sigungu: string;
  eupmyeondong: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  unitTypeCount: number;
  spaceCount: number;
  materialCount: number;
  sourceDocumentCount: number;
  imageCount: number;
};

export type AdminUnitType = {
  id: number;
  name: string;
  areaM2: number | null;
  supplyAreaM2: number | null;
  exclusiveAreaM2: number | null;
  description: string | null;
  spaceCount: number;
  materialCount: number;
};

export type AdminSpace = {
  id: number;
  unitTypeId: number;
  unitTypeName: string;
  name: string;
  sortOrder: number;
  materialCount: number;
  imageCount: number;
};

export type AdminMaterial = {
  id: number;
  unitTypeName: string;
  spaceName: string | null;
  roomName: string | null;
  location: string | null;
  categoryName: string | null;
  itemName: string;
  manufacturer: string | null;
  brand: string | null;
  modelName: string | null;
  productCode: string | null;
  color: string | null;
  size: string | null;
  specification: string | null;
  finish: string | null;
  notes: string | null;
  confidence: number | null;
  sourceDocumentTitle: string | null;
  imageCount: number;
  createdAt: string;
};

export type AdminSourceDocument = {
  id: number;
  unitTypeName: string;
  title: string;
  documentType: string;
  sourceLabel: string | null;
  importedAt: string;
  notes: string | null;
  sourceFileCount: number;
};

export type AdminSchemaTable = {
  name: string;
  columns: string;
  rowCount: number;
};

export type AdminData = {
  dbPath: string;
  apartments: AdminApartment[];
  selectedApartment: AdminApartment | null;
  unitTypes: AdminUnitType[];
  spaces: AdminSpace[];
  materials: AdminMaterial[];
  sourceDocuments: AdminSourceDocument[];
  schemaTables: AdminSchemaTable[];
};

type AdminApartmentRow = RowDataPacket & {
  id: number;
  name: string;
  sido: string;
  sigungu: string;
  eupmyeondong: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  unit_type_count: number | string;
  space_count: number | string;
  material_count: number | string;
  source_document_count: number | string;
  image_count: number | string;
};

type AdminUnitTypeRow = RowDataPacket & {
  id: number;
  name: string;
  area_m2: number | string | null;
  supply_area_m2: number | string | null;
  exclusive_area_m2: number | string | null;
  description: string | null;
  space_count: number | string;
  material_count: number | string;
};

type AdminSpaceRow = RowDataPacket & {
  id: number;
  unit_type_id: number;
  unit_type_name: string;
  name: string;
  sort_order: number | string;
  material_count: number | string;
  image_count: number | string;
};

type AdminMaterialRow = RowDataPacket & {
  id: number;
  unit_type_name: string;
  space_name: string | null;
  room_name: string | null;
  location: string | null;
  category_name: string | null;
  item_name: string;
  manufacturer: string | null;
  brand: string | null;
  model_name: string | null;
  product_code: string | null;
  color: string | null;
  size: string | null;
  specification: string | null;
  finish: string | null;
  notes: string | null;
  confidence: number | string | null;
  source_document_title: string | null;
  image_count: number | string;
  created_at: Date | string;
};

type AdminSourceDocumentRow = RowDataPacket & {
  id: number;
  unit_type_name: string;
  title: string;
  document_type: string;
  source_label: string | null;
  imported_at: Date | string;
  notes: string | null;
  source_file_count: number | string;
};

type AdminSchemaColumnRow = RowDataPacket & {
  name: string;
  columns: string | null;
};

type AdminSchemaCountRow = RowDataPacket & {
  name: string;
  row_count: number | string;
};

function toNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

function toDateString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function normalizeApartment(row: AdminApartmentRow): AdminApartment {
  return {
    id: Number(row.id),
    name: row.name,
    sido: row.sido,
    sigungu: row.sigungu,
    eupmyeondong: row.eupmyeondong,
    address: row.address,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    unitTypeCount: Number(row.unit_type_count),
    spaceCount: Number(row.space_count),
    materialCount: Number(row.material_count),
    sourceDocumentCount: Number(row.source_document_count),
    imageCount: Number(row.image_count),
  };
}

async function getSchemaTables(): Promise<AdminSchemaTable[]> {
  const pool = getMysqlPool();

  const [columnRows] = await pool.query<AdminSchemaColumnRow[]>(`
    SELECT
      c.TABLE_NAME AS name,
      GROUP_CONCAT(
        CONCAT(c.COLUMN_NAME, ' ', c.COLUMN_TYPE, IF(c.COLUMN_KEY = 'PRI', ' PK', ''))
        ORDER BY c.ORDINAL_POSITION
        SEPARATOR ', '
      ) AS columns
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_SCHEMA = DATABASE()
      AND c.TABLE_NAME IN (
        'apartments', 'unit_types', 'spaces', 'materials', 'material_categories',
        'source_documents', 'source_files', 'media_refs', 'image_blobs'
      )
    GROUP BY c.TABLE_NAME
  `);

  const [countRows] = await pool.query<AdminSchemaCountRow[]>(`
    SELECT 'apartments' AS name, COUNT(*) AS row_count FROM apartments
    UNION ALL SELECT 'unit_types', COUNT(*) FROM unit_types
    UNION ALL SELECT 'spaces', COUNT(*) FROM spaces
    UNION ALL SELECT 'materials', COUNT(*) FROM materials
    UNION ALL SELECT 'material_categories', COUNT(*) FROM material_categories
    UNION ALL SELECT 'source_documents', COUNT(*) FROM source_documents
    UNION ALL SELECT 'source_files', COUNT(*) FROM source_files
    UNION ALL SELECT 'media_refs', COUNT(*) FROM media_refs
    UNION ALL SELECT 'image_blobs', COUNT(*) FROM image_blobs
  `);

  const counts = new Map(countRows.map((row) => [row.name, Number(row.row_count)]));
  const order = new Map([
    ['apartments', 1],
    ['unit_types', 2],
    ['spaces', 3],
    ['materials', 4],
    ['material_categories', 5],
    ['source_documents', 6],
    ['source_files', 7],
    ['media_refs', 8],
    ['image_blobs', 9],
  ]);

  return columnRows
    .map((row) => ({
      name: row.name,
      columns: row.columns ?? '',
      rowCount: counts.get(row.name) ?? 0,
    }))
    .sort((a, b) => (order.get(a.name) ?? 99) - (order.get(b.name) ?? 99) || a.name.localeCompare(b.name));
}

export async function getAdminData(apartmentId?: number): Promise<AdminData> {
  const pool = getMysqlPool();

  const [apartmentRows] = await pool.query<AdminApartmentRow[]>(`
    SELECT
      a.id,
      a.name,
      a.sido,
      a.sigungu,
      a.eupmyeondong,
      a.address,
      ST_Y(a.location) AS latitude,
      ST_X(a.location) AS longitude,
      (SELECT COUNT(*) FROM unit_types u WHERE u.apartment_id = a.id AND u.deleted = 0) AS unit_type_count,
      (SELECT COUNT(*) FROM spaces s WHERE s.apartment_id = a.id AND s.deleted = 0) AS space_count,
      (SELECT COUNT(*) FROM materials m WHERE m.apartment_id = a.id AND m.deleted = 0) AS material_count,
      (SELECT COUNT(*) FROM source_documents sd WHERE sd.apartment_id = a.id AND sd.deleted = 0) AS source_document_count,
      (SELECT COUNT(*)
       FROM materials m
       JOIN media_refs mr ON mr.owner_type = 'material' AND mr.owner_id = m.id AND mr.deleted = 0
       WHERE m.apartment_id = a.id AND m.deleted = 0) AS image_count
    FROM apartments a
    WHERE a.deleted = 0
    ORDER BY a.name, a.id
  `);

  const apartments = apartmentRows.map(normalizeApartment);
  const selectedApartment = apartments.find((apartment) => apartment.id === apartmentId) ?? apartments[0] ?? null;
  const schemaTables = await getSchemaTables();

  if (!selectedApartment) {
    return {
      dbPath: 'MySQL',
      apartments,
      selectedApartment: null,
      unitTypes: [],
      spaces: [],
      materials: [],
      sourceDocuments: [],
      schemaTables,
    };
  }

  const selectedId = selectedApartment.id;

  const [unitTypeRows] = await pool.query<AdminUnitTypeRow[]>(
    `
      SELECT
        u.id,
        u.name,
        u.area_m2,
        u.supply_area_m2,
        u.exclusive_area_m2,
        u.description,
        (SELECT COUNT(*) FROM spaces s WHERE s.unit_type_id = u.id AND s.deleted = 0) AS space_count,
        (SELECT COUNT(*) FROM materials m WHERE m.unit_type_id = u.id AND m.deleted = 0) AS material_count
      FROM unit_types u
      WHERE u.deleted = 0
        AND u.apartment_id = ?
      ORDER BY u.name, u.id
    `,
    [selectedId],
  );

  const [spaceRows] = await pool.query<AdminSpaceRow[]>(
    `
      SELECT
        s.id,
        s.unit_type_id,
        u.name AS unit_type_name,
        s.name,
        s.sort_order,
        COUNT(DISTINCT m.id) AS material_count,
        COUNT(DISTINCT mr.id) AS image_count
      FROM spaces s
      JOIN unit_types u ON u.id = s.unit_type_id
      LEFT JOIN materials m ON m.space_id = s.id AND m.deleted = 0
      LEFT JOIN media_refs mr ON mr.owner_type = 'material' AND mr.owner_id = m.id AND mr.deleted = 0
      WHERE s.deleted = 0
        AND s.apartment_id = ?
      GROUP BY s.id, s.unit_type_id, u.name, s.name, s.sort_order
      ORDER BY u.name, s.sort_order, s.name, s.id
    `,
    [selectedId],
  );

  const [materialRows] = await pool.query<AdminMaterialRow[]>(
    `
      SELECT
        m.id,
        u.name AS unit_type_name,
        s.name AS space_name,
        m.room_name,
        m.location,
        c.name AS category_name,
        m.item_name,
        m.manufacturer,
        m.brand,
        m.model_name,
        m.product_code,
        m.color,
        m.size,
        m.specification,
        m.finish,
        m.notes,
        m.confidence,
        sd.title AS source_document_title,
        COUNT(DISTINCT mr.id) AS image_count,
        m.created_at
      FROM materials m
      JOIN unit_types u ON u.id = m.unit_type_id
      LEFT JOIN spaces s ON s.id = m.space_id
      LEFT JOIN material_categories c ON c.id = m.category_id
      LEFT JOIN source_documents sd ON sd.id = m.source_document_id
      LEFT JOIN media_refs mr ON mr.owner_type = 'material' AND mr.owner_id = m.id AND mr.deleted = 0
      WHERE m.deleted = 0
        AND m.apartment_id = ?
      GROUP BY
        m.id, u.name, s.name, m.room_name, m.location, c.name, m.item_name,
        m.manufacturer, m.brand, m.model_name, m.product_code, m.color, m.size,
        m.specification, m.finish, m.notes, m.confidence, sd.title, m.created_at
      ORDER BY u.name, COALESCE(s.sort_order, 9999), COALESCE(s.name, m.room_name, 'zzzz'), m.id
    `,
    [selectedId],
  );

  const [sourceDocumentRows] = await pool.query<AdminSourceDocumentRow[]>(
    `
      SELECT
        sd.id,
        u.name AS unit_type_name,
        sd.title,
        sd.document_type,
        sd.source_label,
        sd.imported_at,
        sd.notes,
        COUNT(DISTINCT sf.id) AS source_file_count
      FROM source_documents sd
      JOIN unit_types u ON u.id = sd.unit_type_id
      LEFT JOIN source_files sf ON sf.source_document_id = sd.id AND sf.deleted = 0
      WHERE sd.deleted = 0
        AND sd.apartment_id = ?
      GROUP BY sd.id, u.name, sd.title, sd.document_type, sd.source_label, sd.imported_at, sd.notes
      ORDER BY sd.imported_at DESC, sd.id DESC
    `,
    [selectedId],
  );

  return {
    dbPath: 'MySQL',
    apartments,
    selectedApartment,
    unitTypes: unitTypeRows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      areaM2: toNumber(row.area_m2),
      supplyAreaM2: toNumber(row.supply_area_m2),
      exclusiveAreaM2: toNumber(row.exclusive_area_m2),
      description: row.description,
      spaceCount: Number(row.space_count),
      materialCount: Number(row.material_count),
    })),
    spaces: spaceRows.map((row) => ({
      id: Number(row.id),
      unitTypeId: Number(row.unit_type_id),
      unitTypeName: row.unit_type_name,
      name: row.name,
      sortOrder: Number(row.sort_order),
      materialCount: Number(row.material_count),
      imageCount: Number(row.image_count),
    })),
    materials: materialRows.map((row) => ({
      id: Number(row.id),
      unitTypeName: row.unit_type_name,
      spaceName: row.space_name,
      roomName: row.room_name,
      location: row.location,
      categoryName: row.category_name,
      itemName: row.item_name,
      manufacturer: row.manufacturer,
      brand: row.brand,
      modelName: row.model_name,
      productCode: row.product_code,
      color: row.color,
      size: row.size,
      specification: row.specification,
      finish: row.finish,
      notes: row.notes,
      confidence: toNumber(row.confidence),
      sourceDocumentTitle: row.source_document_title,
      imageCount: Number(row.image_count),
      createdAt: toDateString(row.created_at),
    })),
    sourceDocuments: sourceDocumentRows.map((row) => ({
      id: Number(row.id),
      unitTypeName: row.unit_type_name,
      title: row.title,
      documentType: row.document_type,
      sourceLabel: row.source_label,
      importedAt: toDateString(row.imported_at),
      notes: row.notes,
      sourceFileCount: Number(row.source_file_count),
    })),
    schemaTables,
  };
}
