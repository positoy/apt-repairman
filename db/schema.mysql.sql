SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS apartments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sido VARCHAR(100) NOT NULL,
  sigungu VARCHAR(100) NOT NULL,
  eupmyeondong VARCHAR(100) NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT NULL,
  latitude DOUBLE NULL,
  longitude DOUBLE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_apartments_location_name (sido, sigungu, name),
  KEY idx_apartments_location (sido, sigungu, eupmyeondong, name, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS unit_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  apartment_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  area_m2 DOUBLE NULL,
  supply_area_m2 DOUBLE NULL,
  exclusive_area_m2 DOUBLE NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_unit_types_apartment_name (apartment_id, name),
  KEY idx_unit_types_apartment_name (apartment_id, name, deleted),
  CONSTRAINT fk_unit_types_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS source_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  apartment_id BIGINT UNSIGNED NOT NULL,
  unit_type_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  document_type ENUM('image', 'pdf', 'excel', 'manual', 'web', 'other') NOT NULL,
  original_filename TEXT NULL,
  source_label TEXT NULL,
  imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_source_documents_apartment_unit (apartment_id, unit_type_id, deleted),
  CONSTRAINT fk_source_documents_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_source_documents_unit_type FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS image_blobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  mime_type VARCHAR(100) NOT NULL,
  filename TEXT NULL,
  data LONGBLOB NOT NULL,
  width INT NULL,
  height INT NULL,
  size_bytes BIGINT NULL,
  sha256 CHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_image_blobs_sha256 (sha256),
  KEY idx_image_blobs_sha256 (sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS spaces (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  apartment_id BIGINT UNSIGNED NOT NULL,
  unit_type_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_spaces_apartment_unit_name (apartment_id, unit_type_id, name),
  KEY idx_spaces_apartment_unit_name (apartment_id, unit_type_id, name, deleted),
  CONSTRAINT fk_spaces_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spaces_unit_type FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS material_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_material_categories_name_parent (name, parent_id),
  KEY idx_categories_parent_sort (parent_id, sort_order, deleted),
  CONSTRAINT fk_material_categories_parent FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  apartment_id BIGINT UNSIGNED NOT NULL,
  unit_type_id BIGINT UNSIGNED NOT NULL,
  space_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  source_document_id BIGINT UNSIGNED NULL,
  room_name TEXT NULL,
  location TEXT NULL,
  item_name TEXT NOT NULL,
  manufacturer TEXT NULL,
  brand TEXT NULL,
  model_name TEXT NULL,
  product_code TEXT NULL,
  color TEXT NULL,
  size TEXT NULL,
  specification TEXT NULL,
  finish TEXT NULL,
  notes TEXT NULL,
  raw_text TEXT NULL,
  confidence DOUBLE NULL,
  version_group_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_materials_apartment_unit (apartment_id, unit_type_id, deleted),
  KEY idx_materials_apartment_unit_space (apartment_id, unit_type_id, space_id, deleted),
  KEY idx_materials_apartment_unit_category (apartment_id, unit_type_id, category_id, deleted),
  KEY idx_materials_model (manufacturer(100), brand(100), model_name(100), deleted),
  KEY idx_materials_version_group (version_group_id, deleted),
  CONSTRAINT fk_materials_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_materials_unit_type FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_materials_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL,
  CONSTRAINT fk_materials_category FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_materials_source_document FOREIGN KEY (source_document_id) REFERENCES source_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS media_refs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_type ENUM('material', 'source_document', 'apartment', 'unit_type') NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  media_type ENUM('image') NOT NULL,
  source_type ENUM('blob', 'url') NOT NULL,
  source TEXT NOT NULL,
  role ENUM('reference', 'crop', 'original', 'before', 'after', 'thumbnail') NOT NULL DEFAULT 'reference',
  caption TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_media_refs_owner (owner_type, owner_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TRIGGER IF EXISTS trg_materials_immutable_except_deleted;
DELIMITER $$
CREATE TRIGGER trg_materials_immutable_except_deleted
BEFORE UPDATE ON materials
FOR EACH ROW
BEGIN
  IF NOT (
    OLD.apartment_id <=> NEW.apartment_id AND
    OLD.unit_type_id <=> NEW.unit_type_id AND
    OLD.space_id <=> NEW.space_id AND
    OLD.category_id <=> NEW.category_id AND
    OLD.source_document_id <=> NEW.source_document_id AND
    OLD.room_name <=> NEW.room_name AND
    OLD.location <=> NEW.location AND
    OLD.item_name <=> NEW.item_name AND
    OLD.manufacturer <=> NEW.manufacturer AND
    OLD.brand <=> NEW.brand AND
    OLD.model_name <=> NEW.model_name AND
    OLD.product_code <=> NEW.product_code AND
    OLD.color <=> NEW.color AND
    OLD.size <=> NEW.size AND
    OLD.specification <=> NEW.specification AND
    OLD.finish <=> NEW.finish AND
    OLD.notes <=> NEW.notes AND
    OLD.raw_text <=> NEW.raw_text AND
    OLD.confidence <=> NEW.confidence AND
    OLD.version_group_id <=> NEW.version_group_id AND
    OLD.created_at <=> NEW.created_at
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'materials are immutable; insert a new row or update deleted only';
  END IF;
END$$
DELIMITER ;
