"use client";

import { useEffect, useMemo, useState } from "react";

type ApartmentPin = {
  id: number;
  name: string;
  address: string | null;
  unitTypes: string[];
  materialCount: number;
};

type ApartmentDetail = ApartmentPin & {
  sido: string;
  sigungu: string;
  eupmyeondong: string | null;
  sourceDocuments: ApartmentSourceDocument[];
  spaces: ApartmentSpace[];
  materials: ApartmentMaterial[];
};

type ApartmentSourceDocument = {
  id: number;
  unitTypeId: number;
  unitTypeName: string;
  title: string;
  documentType: string;
  sourceLabel: string | null;
  importedAt: string;
  notes: string | null;
};

type ApartmentSpace = {
  id: number;
  unitTypeId: number;
  name: string;
  sortOrder: number;
  materialCount: number;
};

type ApartmentMaterial = {
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

type ApartmentDetailResponse = {
  apartment: ApartmentDetail | null;
  error?: string;
};

type MaterialOverlayProps = {
  open: boolean;
  onClose: () => void;
  apartment: ApartmentPin | null;
};

function formatAddress(apartment: ApartmentDetail) {
  return apartment.address ?? [apartment.sido, apartment.sigungu, apartment.eupmyeondong].filter(Boolean).join(" ");
}

function materialSubtitle(material: ApartmentMaterial) {
  return [material.manufacturer, material.brand, material.modelName, material.productCode].filter(Boolean).join(" · ");
}

function materialMeta(material: ApartmentMaterial) {
  return [material.location, material.color, material.size, material.finish].filter(Boolean).join(" · ");
}

export function MaterialOverlay({ open, onClose, apartment }: MaterialOverlayProps) {
  const [detail, setDetail] = useState<ApartmentDetail | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | "all">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !apartment) return;

    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      setIsLoading(true);
      setError(null);
    });

    fetch(`/api/apartments/${apartment.id}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("아파트 상세 정보를 불러오지 못했습니다.");
        return response.json() as Promise<ApartmentDetailResponse>;
      })
      .then((data) => {
        if (ignore) return;
        setDetail(data.apartment);
        setSelectedUnitType(data.apartment?.unitTypes[0] ?? null);
        setSelectedSpaceId("all");
        setError(data.error ?? null);
      })
      .catch((fetchError) => {
        if (!ignore) {
          setDetail(null);
          setError(fetchError instanceof Error ? fetchError.message : "아파트 상세 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [apartment, open]);

  const unitTypes = detail?.unitTypes ?? apartment?.unitTypes ?? [];

  const spaces = useMemo(() => {
    if (!detail) return [];
    return detail.spaces.filter((space) => {
      if (!selectedUnitType) return true;
      return detail.materials.some((material) => material.spaceId === space.id && material.unitTypeName === selectedUnitType);
    });
  }, [detail, selectedUnitType]);

  const filteredMaterials = useMemo(() => {
    if (!detail) return [];
    return detail.materials.filter((material) => {
      const unitMatches = !selectedUnitType || material.unitTypeName === selectedUnitType;
      const spaceMatches = selectedSpaceId === "all" || material.spaceId === selectedSpaceId;
      return unitMatches && spaceMatches;
    });
  }, [detail, selectedSpaceId, selectedUnitType]);

  const groupedMaterials = useMemo(() => {
    const groups = new Map<string, ApartmentMaterial[]>();
    for (const material of filteredMaterials) {
      const key = material.spaceName ?? material.roomName ?? "공간 미분류";
      groups.set(key, [...(groups.get(key) ?? []), material]);
    }
    return Array.from(groups.entries());
  }, [filteredMaterials]);

  const selectedSourceDocuments = useMemo(() => {
    if (!detail) return [];
    if (!selectedUnitType) return detail.sourceDocuments;
    return detail.sourceDocuments.filter((doc) => doc.unitTypeName === selectedUnitType);
  }, [detail, selectedUnitType]);

  const fallbackSummary = apartment
    ? `${apartment.unitTypes.join(" · ") || "평형 미등록"} · 자재 ${apartment.materialCount.toLocaleString("ko-KR")}개`
    : undefined;

  return (
    <aside
      className={`absolute inset-x-0 bottom-0 z-10 h-[86dvh] transition-transform duration-300 sm:inset-y-0 sm:left-0 sm:right-auto sm:h-auto sm:w-full sm:max-w-[460px] sm:p-4 ${
        open ? "translate-y-0 sm:translate-y-0" : "translate-y-[calc(100%+16px)] sm:-translate-x-[calc(100%+16px)] sm:translate-y-0"
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-t-[28px] bg-white/95 shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-xl sm:rounded-[28px]">
        <header className="border-b border-slate-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Apt Repairman</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{detail?.name ?? apartment?.name ?? "아파트 선택"}</h1>
              <p className="mt-1 text-sm text-slate-500">{detail ? formatAddress(detail) : fallbackSummary}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="자재 정보 닫기"
              className="rounded-full bg-slate-100 px-3 py-2 text-lg font-black leading-none text-slate-600 transition hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="text-lg font-black text-slate-950">{detail?.spaces.length ?? "-"}</p>
              <p className="text-xs font-semibold text-slate-500">공간</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="text-lg font-black text-slate-950">{(detail?.materialCount ?? apartment?.materialCount ?? 0).toLocaleString("ko-KR")}</p>
              <p className="text-xs font-semibold text-slate-500">자재</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-lg font-black text-emerald-700">{selectedSourceDocuments.length}</p>
              <p className="text-xs font-semibold text-emerald-700/70">원본</p>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm font-semibold text-slate-500">DB에서 자재 정보를 불러오는 중입니다…</div>
        ) : error ? (
          <div className="m-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">{error}</div>
        ) : detail ? (
          <>
            <div className="space-y-3 border-b border-slate-100 px-4 py-3">
              {unitTypes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  {unitTypes.map((unitType) => (
                    <button
                      key={unitType}
                      type="button"
                      onClick={() => {
                        setSelectedUnitType(unitType);
                        setSelectedSpaceId("all");
                      }}
                      className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                        selectedUnitType === unitType ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                      }`}
                    >
                      {unitType}
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="block">
                <span className="text-xs font-bold text-slate-400">공간 선택</span>
                <select
                  value={selectedSpaceId}
                  onChange={(event) => setSelectedSpaceId(event.target.value === "all" ? "all" : Number(event.target.value))}
                  className="mt-1 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-black text-slate-950 shadow-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                >
                  <option value="all">전체 공간 ({filteredMaterials.length}개)</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name} ({space.materialCount}개)
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {selectedSourceDocuments.length > 0 ? (
                <section className="mb-4 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Source</p>
                  {selectedSourceDocuments.map((doc) => (
                    <div key={doc.id} className="mt-2 text-sm leading-6 text-emerald-950">
                      <p className="font-black">{doc.title}</p>
                      <p className="text-xs font-semibold text-emerald-700/80">
                        {doc.documentType} · {doc.sourceLabel ?? "출처 미등록"}
                      </p>
                    </div>
                  ))}
                </section>
              ) : null}

              <div className="space-y-5">
                {groupedMaterials.map(([groupName, materials]) => (
                  <section key={groupName}>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-lg font-black text-slate-950">{groupName}</h2>
                      <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{materials.length}개</p>
                    </div>
                    <div className="space-y-3">
                      {materials.map((material) => (
                        <article key={material.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{material.roomName ?? "공간"}</span>
                                {material.imageCount > 0 ? (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">이미지 {material.imageCount}</span>
                                ) : null}
                              </div>
                              <h3 className="mt-3 text-base font-black leading-snug text-slate-950">{material.itemName}</h3>
                              {materialSubtitle(material) ? <p className="mt-1 text-sm font-bold text-slate-500">{materialSubtitle(material)}</p> : null}
                            </div>
                          </div>
                          {materialMeta(material) ? <p className="mt-3 text-sm leading-6 text-slate-600">{materialMeta(material)}</p> : null}
                          {material.specification ? <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700">{material.specification}</p> : null}
                          {material.notes ? <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">{material.notes}</p> : null}
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <footer className="border-t border-slate-100 bg-slate-50/80 px-5 py-3 text-xs leading-5 text-slate-500">
              현재 DB의 apartments / unit_types / spaces / materials / source_documents 기준으로 표시합니다.
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm font-semibold text-slate-500">지도 핀을 선택하면 DB 정보가 표시됩니다.</div>
        )}
      </div>
    </aside>
  );
}
