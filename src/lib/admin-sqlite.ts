import { execFileSync } from "node:child_process";
import path from "node:path";

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

const SQLITE_DB_PATH = process.env.SQLITE_PATH ?? path.join(process.cwd(), "db", "repairman.sqlite");

function sqliteJson<T>(sql: string): T[] {
  const output = execFileSync("sqlite3", ["-json", SQLITE_DB_PATH, sql], { encoding: "utf8" }).trim();
  return output ? (JSON.parse(output) as T[]) : [];
}

function toNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

function normalizeApartment(row: Record<string, unknown>): AdminApartment {
  return {
    id: Number(row.id),
    name: String(row.name),
    sido: String(row.sido),
    sigungu: String(row.sigungu),
    eupmyeondong: row.eupmyeondong === null ? null : String(row.eupmyeondong),
    address: row.address === null ? null : String(row.address),
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    unitTypeCount: Number(row.unit_type_count),
    spaceCount: Number(row.space_count),
    materialCount: Number(row.material_count),
    sourceDocumentCount: Number(row.source_document_count),
    imageCount: Number(row.image_count),
  };
}

export async function getAdminData(apartmentId?: number): Promise<AdminData> {
  const apartments = sqliteJson<Record<string, unknown>>(`
    SELECT
      a.id,
      a.name,
      a.sido,
      a.sigungu,
      a.eupmyeondong,
      a.address,
      a.latitude,
      a.longitude,
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
  `).map(normalizeApartment);

  const selectedApartment = apartments.find((apartment) => apartment.id === apartmentId) ?? apartments[0] ?? null;

  if (!selectedApartment) {
    return {
      dbPath: SQLITE_DB_PATH,
      apartments,
      selectedApartment: null,
      unitTypes: [],
      spaces: [],
      materials: [],
      sourceDocuments: [],
      schemaTables: getSchemaTables(),
    };
  }

  const selectedId = selectedApartment.id;

  const unitTypes = sqliteJson<Record<string, unknown>>(
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
        AND u.apartment_id = ${selectedId}
      ORDER BY u.name, u.id
    `,
  ).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    areaM2: toNumber(row.area_m2),
    supplyAreaM2: toNumber(row.supply_area_m2),
    exclusiveAreaM2: toNumber(row.exclusive_area_m2),
    description: row.description === null ? null : String(row.description),
    spaceCount: Number(row.space_count),
    materialCount: Number(row.material_count),
  }));

  const spaces = sqliteJson<Record<string, unknown>>(
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
        AND s.apartment_id = ${selectedId}
      GROUP BY s.id, s.unit_type_id, u.name, s.name, s.sort_order
      ORDER BY u.name, s.sort_order, s.name, s.id
    `,
  ).map((row) => ({
    id: Number(row.id),
    unitTypeId: Number(row.unit_type_id),
    unitTypeName: String(row.unit_type_name),
    name: String(row.name),
    sortOrder: Number(row.sort_order),
    materialCount: Number(row.material_count),
    imageCount: Number(row.image_count),
  }));

  const materials = sqliteJson<Record<string, unknown>>(
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
        AND m.apartment_id = ${selectedId}
      GROUP BY
        m.id, u.name, s.name, m.room_name, m.location, c.name, m.item_name,
        m.manufacturer, m.brand, m.model_name, m.product_code, m.color, m.size,
        m.specification, m.finish, m.notes, m.confidence, sd.title, m.created_at
      ORDER BY u.name, COALESCE(s.sort_order, 9999), COALESCE(s.name, m.room_name, 'zzzz'), m.id
    `,
  ).map((row) => ({
    id: Number(row.id),
    unitTypeName: String(row.unit_type_name),
    spaceName: row.space_name === null ? null : String(row.space_name),
    roomName: row.room_name === null ? null : String(row.room_name),
    location: row.location === null ? null : String(row.location),
    categoryName: row.category_name === null ? null : String(row.category_name),
    itemName: String(row.item_name),
    manufacturer: row.manufacturer === null ? null : String(row.manufacturer),
    brand: row.brand === null ? null : String(row.brand),
    modelName: row.model_name === null ? null : String(row.model_name),
    productCode: row.product_code === null ? null : String(row.product_code),
    color: row.color === null ? null : String(row.color),
    size: row.size === null ? null : String(row.size),
    specification: row.specification === null ? null : String(row.specification),
    finish: row.finish === null ? null : String(row.finish),
    notes: row.notes === null ? null : String(row.notes),
    confidence: toNumber(row.confidence),
    sourceDocumentTitle: row.source_document_title === null ? null : String(row.source_document_title),
    imageCount: Number(row.image_count),
    createdAt: String(row.created_at),
  }));

  const sourceDocuments = sqliteJson<Record<string, unknown>>(
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
        AND sd.apartment_id = ${selectedId}
      GROUP BY sd.id, u.name, sd.title, sd.document_type, sd.source_label, sd.imported_at, sd.notes
      ORDER BY sd.imported_at DESC, sd.id DESC
    `,
  ).map((row) => ({
    id: Number(row.id),
    unitTypeName: String(row.unit_type_name),
    title: String(row.title),
    documentType: String(row.document_type),
    sourceLabel: row.source_label === null ? null : String(row.source_label),
    importedAt: String(row.imported_at),
    notes: row.notes === null ? null : String(row.notes),
    sourceFileCount: Number(row.source_file_count),
  }));

  return {
    dbPath: SQLITE_DB_PATH,
    apartments,
    selectedApartment,
    unitTypes,
    spaces,
    materials,
    sourceDocuments,
    schemaTables: getSchemaTables(),
  };
}

function getSchemaTables(): AdminSchemaTable[] {
  return sqliteJson<Record<string, unknown>>(`
    SELECT
      m.name,
      GROUP_CONCAT(p.name || ' ' || p.type || CASE WHEN p.pk = 1 THEN ' PK' ELSE '' END, ', ') AS columns,
      CASE m.name
        WHEN 'apartments' THEN (SELECT COUNT(*) FROM apartments)
        WHEN 'unit_types' THEN (SELECT COUNT(*) FROM unit_types)
        WHEN 'spaces' THEN (SELECT COUNT(*) FROM spaces)
        WHEN 'materials' THEN (SELECT COUNT(*) FROM materials)
        WHEN 'material_categories' THEN (SELECT COUNT(*) FROM material_categories)
        WHEN 'source_documents' THEN (SELECT COUNT(*) FROM source_documents)
        WHEN 'source_files' THEN (SELECT COUNT(*) FROM source_files)
        WHEN 'media_refs' THEN (SELECT COUNT(*) FROM media_refs)
        WHEN 'image_blobs' THEN (SELECT COUNT(*) FROM image_blobs)
        ELSE 0
      END AS row_count
    FROM sqlite_master m
    JOIN pragma_table_info(m.name) p
    WHERE m.type = 'table'
      AND m.name NOT LIKE 'sqlite_%'
    GROUP BY m.name
    ORDER BY CASE m.name
      WHEN 'apartments' THEN 1
      WHEN 'unit_types' THEN 2
      WHEN 'spaces' THEN 3
      WHEN 'materials' THEN 4
      WHEN 'material_categories' THEN 5
      WHEN 'source_documents' THEN 6
      WHEN 'source_files' THEN 7
      WHEN 'media_refs' THEN 8
      WHEN 'image_blobs' THEN 9
      ELSE 99
    END, m.name
  `).map((row) => ({
    name: String(row.name),
    columns: String(row.columns ?? ""),
    rowCount: Number(row.row_count),
  }));
}
