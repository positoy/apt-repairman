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

type ApartmentPinRow = RowDataPacket & {
  id: number;
  name: string;
  address: string | null;
  latitude: number | string;
  longitude: number | string;
  unit_types: string | null;
  material_count: number | string;
};

export async function listApartmentPins(): Promise<ApartmentPin[]> {
  const pool = getMysqlPool();
  const [rows] = await pool.query<ApartmentPinRow[]>(`
    SELECT
      a.id,
      a.name,
      a.address,
      a.latitude,
      a.longitude,
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
      AND a.latitude IS NOT NULL
      AND a.longitude IS NOT NULL
    GROUP BY a.id, a.name, a.address, a.latitude, a.longitude
    ORDER BY a.name
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    address: row.address,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    unitTypes: row.unit_types ? row.unit_types.split(",").filter(Boolean) : [],
    materialCount: Number(row.material_count),
  }));
}
