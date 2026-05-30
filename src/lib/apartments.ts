import { getMysqlPool } from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";

export type ApartmentPin = {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  unitTypes: string[];
  materialCount: number;
};

export type ApartmentDetail = ApartmentPin & {
  sido: string;
  sigungu: string;
  eupmyeondong: string | null;
  sourceDocuments: ApartmentSourceDocument[];
  spaces: ApartmentSpace[];
  materials: ApartmentMaterial[];
};

export type ApartmentSourceDocument = {
  id: number;
  unitTypeId: number;
  unitTypeName: string;
  title: string;
  documentType: string;
  sourceLabel: string | null;
  importedAt: string;
  notes: string | null;
};

export type ApartmentSpace = {
  id: number;
  unitTypeId: number;
  name: string;
  sortOrder: number;
  materialCount: number;
};

export type ApartmentMaterial = {
  id: number;
  unitTypeId: number;
  unitTypeName: string;
  spaceId: number | null;
  spaceName: string | null;
  roomName: string | null;
  location: string | null;
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
  sourceDocumentId: number | null;
  imageCount: number;
};

type ApartmentPinRow = RowDataPacket & {
  id: number;
  name: string;
  address: string | null;
  latitude: number | string;
  longitude: number | string;
  unit_types: string | null;
  material_count: number | string;
};

type ApartmentDetailRow = ApartmentPinRow & {
  sido: string;
  sigungu: string;
  eupmyeondong: string | null;
};

type SourceDocumentRow = RowDataPacket & {
  id: number;
  unit_type_id: number;
  unit_type_name: string;
  title: string;
  document_type: string;
  source_label: string | null;
  imported_at: Date | string;
  notes: string | null;
};

type SpaceRow = RowDataPacket & {
  id: number;
  unit_type_id: number;
  name: string;
  sort_order: number;
  material_count: number | string;
};

type MaterialRow = RowDataPacket & {
  id: number;
  unit_type_id: number;
  unit_type_name: string;
  space_id: number | null;
  space_name: string | null;
  room_name: string | null;
  location: string | null;
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
  source_document_id: number | null;
  image_count: number | string;
};

function mapPin(row: ApartmentPinRow): ApartmentPin {
  return {
    id: Number(row.id),
    name: row.name,
    address: row.address,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    unitTypes: row.unit_types ? row.unit_types.split(",").filter(Boolean) : [],
    materialCount: Number(row.material_count),
  };
}

export async function listApartmentPins(): Promise<ApartmentPin[]> {
  const pool = getMysqlPool();
  const [rows] = await pool.query<ApartmentPinRow[]>(`
    SELECT
      a.id,
      a.name,
      a.address,
      ST_Y(a.location) AS latitude,
      ST_X(a.location) AS longitude,
      GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ',') AS unit_types,
      COUNT(DISTINCT m.id) AS material_count
    FROM apartments a
    LEFT JOIN unit_types u
      ON u.apartment_id = a.id
      AND u.deleted = 0
    LEFT JOIN materials m
      ON m.apartment_id = a.id
      AND m.deleted = 0
    WHERE a.deleted = 0
      AND a.location IS NOT NULL
    GROUP BY a.id, a.name, a.address, ST_Y(a.location), ST_X(a.location)
    ORDER BY a.name
  `);

  return rows.map(mapPin);
}

export async function getApartmentDetail(id: number): Promise<ApartmentDetail | null> {
  const pool = getMysqlPool();

  const [apartmentRows] = await pool.query<ApartmentDetailRow[]>(
    `
      SELECT
        a.id,
        a.sido,
        a.sigungu,
        a.eupmyeondong,
        a.name,
        a.address,
        ST_Y(a.location) AS latitude,
        ST_X(a.location) AS longitude,
        GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ',') AS unit_types,
        COUNT(DISTINCT m.id) AS material_count
      FROM apartments a
      LEFT JOIN unit_types u
        ON u.apartment_id = a.id
        AND u.deleted = 0
      LEFT JOIN materials m
        ON m.apartment_id = a.id
        AND m.deleted = 0
      WHERE a.deleted = 0
        AND a.id = ?
      GROUP BY a.id, a.sido, a.sigungu, a.eupmyeondong, a.name, a.address, ST_Y(a.location), ST_X(a.location)
      LIMIT 1
    `,
    [id],
  );

  const apartment = apartmentRows[0];
  if (!apartment) return null;

  const [sourceDocumentRows] = await pool.query<SourceDocumentRow[]>(
    `
      SELECT
        sd.id,
        sd.unit_type_id,
        u.name AS unit_type_name,
        sd.title,
        sd.document_type,
        sd.source_label,
        sd.imported_at,
        sd.notes
      FROM source_documents sd
      JOIN unit_types u
        ON u.id = sd.unit_type_id
      WHERE sd.deleted = 0
        AND sd.apartment_id = ?
      ORDER BY sd.imported_at DESC, sd.id DESC
    `,
    [id],
  );

  const [spaceRows] = await pool.query<SpaceRow[]>(
    `
      SELECT
        s.id,
        s.unit_type_id,
        s.name,
        s.sort_order,
        COUNT(DISTINCT m.id) AS material_count
      FROM spaces s
      LEFT JOIN materials m
        ON m.space_id = s.id
        AND m.deleted = 0
      WHERE s.deleted = 0
        AND s.apartment_id = ?
      GROUP BY s.id, s.unit_type_id, s.name, s.sort_order
      ORDER BY s.sort_order, s.name
    `,
    [id],
  );

  const [materialRows] = await pool.query<MaterialRow[]>(
    `
      SELECT
        m.id,
        m.unit_type_id,
        u.name AS unit_type_name,
        m.space_id,
        s.name AS space_name,
        m.room_name,
        m.location,
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
        m.source_document_id,
        COUNT(DISTINCT mr.id) AS image_count
      FROM materials m
      JOIN unit_types u
        ON u.id = m.unit_type_id
      LEFT JOIN spaces s
        ON s.id = m.space_id
      LEFT JOIN media_refs mr
        ON mr.owner_type = 'material'
        AND mr.owner_id = m.id
        AND mr.deleted = 0
      WHERE m.deleted = 0
        AND m.apartment_id = ?
      GROUP BY
        m.id,
        m.unit_type_id,
        u.name,
        m.space_id,
        s.name,
        m.room_name,
        m.location,
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
        m.source_document_id
      ORDER BY COALESCE(s.sort_order, 9999), COALESCE(m.room_name, ''), COALESCE(m.location, ''), m.id
    `,
    [id],
  );

  return {
    ...mapPin(apartment),
    sido: apartment.sido,
    sigungu: apartment.sigungu,
    eupmyeondong: apartment.eupmyeondong,
    sourceDocuments: sourceDocumentRows.map((row) => ({
      id: Number(row.id),
      unitTypeId: Number(row.unit_type_id),
      unitTypeName: row.unit_type_name,
      title: row.title,
      documentType: row.document_type,
      sourceLabel: row.source_label,
      importedAt: row.imported_at instanceof Date ? row.imported_at.toISOString() : String(row.imported_at),
      notes: row.notes,
    })),
    spaces: spaceRows.map((row) => ({
      id: Number(row.id),
      unitTypeId: Number(row.unit_type_id),
      name: row.name,
      sortOrder: Number(row.sort_order),
      materialCount: Number(row.material_count),
    })),
    materials: materialRows.map((row) => ({
      id: Number(row.id),
      unitTypeId: Number(row.unit_type_id),
      unitTypeName: row.unit_type_name,
      spaceId: row.space_id === null ? null : Number(row.space_id),
      spaceName: row.space_name,
      roomName: row.room_name,
      location: row.location,
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
      confidence: row.confidence === null ? null : Number(row.confidence),
      sourceDocumentId: row.source_document_id === null ? null : Number(row.source_document_id),
      imageCount: Number(row.image_count),
    })),
  };
}
