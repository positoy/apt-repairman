PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Apartment material catalog schema
-- Core policy:
-- - Materials are append-only/immutable records.
-- - Logical deletion is supported via deleted boolean flag.
-- - Every material belongs to apartment_id + unit_type_id for fast mobile/web lookup.
-- - Media can point either to local image_blobs or future CDN URLs.

CREATE TABLE IF NOT EXISTS apartments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sido TEXT NOT NULL,
  sigungu TEXT NOT NULL,
  eupmyeondong TEXT,
  name TEXT NOT NULL,
  address TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  UNIQUE (sido, sigungu, name)
);

CREATE TABLE IF NOT EXISTS unit_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  area_m2 REAL,
  supply_area_m2 REAL,
  exclusive_area_m2 REAL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  UNIQUE (apartment_id, name)
);

CREATE TABLE IF NOT EXISTS source_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_id INTEGER NOT NULL,
  unit_type_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('image', 'pdf', 'excel', 'manual', 'web', 'other')),
  original_filename TEXT,
  source_label TEXT,
  imported_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS image_blobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mime_type TEXT NOT NULL,
  filename TEXT,
  data BLOB NOT NULL,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  sha256 TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (sha256)
);

CREATE TABLE IF NOT EXISTS spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_id INTEGER NOT NULL,
  unit_type_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT,
  UNIQUE (apartment_id, unit_type_id, name)
);

CREATE TABLE IF NOT EXISTS material_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE RESTRICT,
  UNIQUE (name, parent_id)
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_id INTEGER NOT NULL,
  unit_type_id INTEGER NOT NULL,
  space_id INTEGER,
  category_id INTEGER,
  source_document_id INTEGER,

  room_name TEXT,
  location TEXT,
  item_name TEXT NOT NULL,
  manufacturer TEXT,
  brand TEXT,
  model_name TEXT,
  product_code TEXT,
  color TEXT,
  size TEXT,
  specification TEXT,
  finish TEXT,
  notes TEXT,

  raw_text TEXT,
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  version_group_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),

  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (source_document_id) REFERENCES source_documents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS media_refs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('material', 'source_document', 'apartment', 'unit_type')),
  owner_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image')),
  source_type TEXT NOT NULL CHECK (source_type IN ('blob', 'url')),
  source TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reference' CHECK (role IN ('reference', 'crop', 'original', 'before', 'after', 'thumbnail')),
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1))
);

-- Immutable material records: only the deleted flag may be changed after insert.
CREATE TRIGGER IF NOT EXISTS trg_materials_immutable_except_deleted
BEFORE UPDATE ON materials
FOR EACH ROW
WHEN
  OLD.apartment_id IS NOT NEW.apartment_id OR
  OLD.unit_type_id IS NOT NEW.unit_type_id OR
  OLD.space_id IS NOT NEW.space_id OR
  OLD.category_id IS NOT NEW.category_id OR
  OLD.source_document_id IS NOT NEW.source_document_id OR
  OLD.room_name IS NOT NEW.room_name OR
  OLD.location IS NOT NEW.location OR
  OLD.item_name IS NOT NEW.item_name OR
  OLD.manufacturer IS NOT NEW.manufacturer OR
  OLD.brand IS NOT NEW.brand OR
  OLD.model_name IS NOT NEW.model_name OR
  OLD.product_code IS NOT NEW.product_code OR
  OLD.color IS NOT NEW.color OR
  OLD.size IS NOT NEW.size OR
  OLD.specification IS NOT NEW.specification OR
  OLD.finish IS NOT NEW.finish OR
  OLD.notes IS NOT NEW.notes OR
  OLD.raw_text IS NOT NEW.raw_text OR
  OLD.confidence IS NOT NEW.confidence OR
  OLD.version_group_id IS NOT NEW.version_group_id OR
  OLD.created_at IS NOT NEW.created_at
BEGIN
  SELECT RAISE(ABORT, 'materials are immutable; insert a new row or update deleted only');
END;

CREATE INDEX IF NOT EXISTS idx_apartments_location ON apartments (sido, sigungu, eupmyeondong, name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_unit_types_apartment_name ON unit_types (apartment_id, name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_source_documents_apartment_unit ON source_documents (apartment_id, unit_type_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_spaces_apartment_unit_name ON spaces (apartment_id, unit_type_id, name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_categories_parent_sort ON material_categories (parent_id, sort_order) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_materials_apartment_unit ON materials (apartment_id, unit_type_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_materials_apartment_unit_space ON materials (apartment_id, unit_type_id, space_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_materials_apartment_unit_category ON materials (apartment_id, unit_type_id, category_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_materials_item_name ON materials (item_name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_materials_model ON materials (manufacturer, brand, model_name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_media_refs_owner ON media_refs (owner_type, owner_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_image_blobs_sha256 ON image_blobs (sha256);

-- Seed: sample apartment/unit/document and lookup values.
INSERT OR IGNORE INTO apartments (sido, sigungu, eupmyeondong, name, address)
VALUES ('경기도', '광주시', NULL, '파크뷰비스타데시앙', NULL);

INSERT OR IGNORE INTO unit_types (apartment_id, name, description)
SELECT id, '84C', '마감재 리스트 샘플 평형 타입'
FROM apartments
WHERE name = '파크뷰비스타데시앙';

INSERT OR IGNORE INTO source_documents (apartment_id, unit_type_id, title, document_type, source_label, notes)
SELECT a.id, u.id, '84C 마감재 리스트', 'image', 'Telegram sample images', '초기 스키마 설계용 샘플 문서. 원본 이미지는 추후 image_blobs/media_refs에 연결.'
FROM apartments a
JOIN unit_types u ON u.apartment_id = a.id AND u.name = '84C'
WHERE a.name = '파크뷰비스타데시앙';

INSERT OR IGNORE INTO material_categories (name, parent_id, sort_order) VALUES
  ('마감재', NULL, 10),
  ('바닥재', NULL, 20),
  ('벽지', NULL, 30),
  ('타일', NULL, 40),
  ('가구', NULL, 50),
  ('도어/하드웨어', NULL, 60),
  ('조명', NULL, 70),
  ('전기/통신', NULL, 80),
  ('위생도기', NULL, 90),
  ('수전/배관', NULL, 100),
  ('가전', NULL, 110),
  ('기타', NULL, 999);

INSERT OR IGNORE INTO spaces (apartment_id, unit_type_id, name, sort_order)
SELECT a.id, u.id, v.name, v.sort_order
FROM apartments a
JOIN unit_types u ON u.apartment_id = a.id AND u.name = '84C'
JOIN (
  SELECT '현관' AS name, 10 AS sort_order UNION ALL
  SELECT '거실', 20 UNION ALL
  SELECT '주방', 30 UNION ALL
  SELECT '침실', 40 UNION ALL
  SELECT '욕실', 50 UNION ALL
  SELECT '발코니', 60 UNION ALL
  SELECT '전기/통신', 70 UNION ALL
  SELECT '공통', 999
) v
WHERE a.name = '파크뷰비스타데시앙';

-- Representative rows from the provided material-list image description.
-- Detailed OCR extraction will append richer immutable material rows later.
INSERT INTO materials (
  apartment_id, unit_type_id, space_id, category_id, source_document_id,
  room_name, location, item_name, specification, raw_text, confidence, version_group_id
)
SELECT a.id, u.id, s.id, c.id, d.id,
       '공통', '마감재 리스트', '84C 마감재 리스트 원본', '이미지 기반 자재목록 문서',
       '84C 마감재 리스트: 마감재, 가구, 욕실, 가전, 수전, 조명, 스위치, 콘센트, 통신, 도어락 등 항목 포함',
       0.5, 'parkview-vista-desian-84c-initial'
FROM apartments a
JOIN unit_types u ON u.apartment_id = a.id AND u.name = '84C'
JOIN source_documents d ON d.apartment_id = a.id AND d.unit_type_id = u.id AND d.title = '84C 마감재 리스트'
LEFT JOIN spaces s ON s.apartment_id = a.id AND s.unit_type_id = u.id AND s.name = '공통'
LEFT JOIN material_categories c ON c.name = '기타' AND c.parent_id IS NULL
WHERE a.name = '파크뷰비스타데시앙'
  AND NOT EXISTS (
    SELECT 1 FROM materials m
    WHERE m.apartment_id = a.id
      AND m.unit_type_id = u.id
      AND m.version_group_id = 'parkview-vista-desian-84c-initial'
      AND m.item_name = '84C 마감재 리스트 원본'
  );

COMMIT;
