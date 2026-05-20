#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQLITE_DB = ROOT / "db" / "repairman.sqlite"
OUT = ROOT / "db" / "seed.mysql.sql"

TABLES = [
    "apartments",
    "unit_types",
    "source_documents",
    "source_files",
    "image_blobs",
    "spaces",
    "material_categories",
    "materials",
    "media_refs",
]

WHERE = {
    "materials": "WHERE deleted = 0",
    "source_files": "WHERE deleted = 0",
    "media_refs": "WHERE deleted = 0",
}


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bytes):
        return "0x" + v.hex()
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v)
    return "'" + s.replace("\\", "\\\\").replace("'", "''").replace("\x00", "") + "'"


def table_columns(con, table: str):
    return [row[1] for row in con.execute(f"PRAGMA table_info({table})")]


def main():
    con = sqlite3.connect(SQLITE_DB)
    con.row_factory = sqlite3.Row
    lines = [
        "SET NAMES utf8mb4;",
        "SET FOREIGN_KEY_CHECKS = 0;",
    ]
    for table in TABLES:
        cols = table_columns(con, table)
        quoted_cols = ", ".join(f"`{c}`" for c in cols)
        where = WHERE.get(table, "")
        rows = con.execute(f"SELECT {', '.join(cols)} FROM {table} {where} ORDER BY id").fetchall()
        if not rows:
            continue
        if table in {"image_blobs", "source_files"}:
            # One row per statement keeps max_allowed_packet risk low and makes failures easier to isolate.
            for row in rows:
                vals = ", ".join(q(row[c]) for c in cols)
                lines.append(f"INSERT IGNORE INTO `{table}` ({quoted_cols}) VALUES ({vals});")
        else:
            batch_size = 100
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                values = []
                for row in batch:
                    values.append("(" + ", ".join(q(row[c]) for c in cols) + ")")
                lines.append(f"INSERT IGNORE INTO `{table}` ({quoted_cols}) VALUES\n" + ",\n".join(values) + ";")
    lines.extend([
        "SET FOREIGN_KEY_CHECKS = 1;",
        "-- Advance AUTO_INCREMENT counters after preserving SQLite ids.",
        "ALTER TABLE apartments AUTO_INCREMENT = 100000;",
        "ALTER TABLE unit_types AUTO_INCREMENT = 100000;",
        "ALTER TABLE source_documents AUTO_INCREMENT = 100000;",
        "ALTER TABLE source_files AUTO_INCREMENT = 100000;",
        "ALTER TABLE image_blobs AUTO_INCREMENT = 100000;",
        "ALTER TABLE spaces AUTO_INCREMENT = 100000;",
        "ALTER TABLE material_categories AUTO_INCREMENT = 100000;",
        "ALTER TABLE materials AUTO_INCREMENT = 100000;",
        "ALTER TABLE media_refs AUTO_INCREMENT = 100000;",
    ])
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")
    for table in TABLES:
        where = WHERE.get(table, "")
        count = con.execute(f"SELECT COUNT(*) FROM {table} {where}").fetchone()[0]
        print(f"{table}: {count}")


if __name__ == "__main__":
    main()
