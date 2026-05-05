"use client";

import { useEffect, useMemo, useState } from "react";
import type { Material, MaterialDatabase, MaterialRoom } from "@/mocks/materials";

function formatPrice(material: Material) {
  if (typeof material.price === "number") return `${material.price.toLocaleString("ko-KR")}원`;
  if (typeof material.price_min === "number" && typeof material.price_max === "number") {
    return `${material.price_min.toLocaleString("ko-KR")}~${material.price_max.toLocaleString("ko-KR")}원`;
  }
  if (typeof material.price_cut_10cm === "number" || typeof material.price_roll === "number") {
    const cut = material.price_cut_10cm ? `10cm ${material.price_cut_10cm.toLocaleString("ko-KR")}원` : null;
    const roll = material.price_roll ? `롤 ${material.price_roll.toLocaleString("ko-KR")}원` : null;
    return [cut, roll].filter(Boolean).join(" / ");
  }
  return "가격 확인 필요";
}

function countMaterials(rooms: MaterialRoom[]) {
  return rooms.reduce((sum, room) => sum + room.materials.length, 0);
}

export function MaterialOverlay() {
  const [data, setData] = useState<MaterialDatabase | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);
  const [selectedPyeong, setSelectedPyeong] = useState("33평");

  useEffect(() => {
    let ignore = false;

    fetch("/api/mock/materials")
      .then((response) => response.json() as Promise<MaterialDatabase>)
      .then((database) => {
        if (ignore) return;
        setData(database);
        setSelectedRoomName(database.rooms[0]?.name ?? null);
      })
      .catch(() => {
        if (!ignore) setData(null);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const selectedRoom = useMemo(() => {
    if (!data) return null;
    return data.rooms.find((room) => room.name === selectedRoomName) ?? data.rooms[0] ?? null;
  }, [data, selectedRoomName]);

  return (
    <aside className="absolute bottom-0 left-0 top-0 z-10 w-full max-w-[430px] p-3 sm:p-4">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white/95 shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-xl">
        <header className="border-b border-slate-100 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Apt Repairman</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">더파크비스타데시앙아파트</h1>
          <p className="mt-1 text-sm text-slate-500">84㎡ 리모델링 자재 샘플 DB</p>

          {data ? (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-lg font-black text-slate-950">{data.rooms.length}</p>
                <p className="text-xs font-semibold text-slate-500">공간</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-lg font-black text-slate-950">{countMaterials(data.rooms)}</p>
                <p className="text-xs font-semibold text-slate-500">자재</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-lg font-black text-emerald-700">{selectedPyeong}</p>
                <p className="text-xs font-semibold text-emerald-700/70">선택 평형</p>
              </div>
            </div>
          ) : null}
        </header>

        {data && selectedRoom ? (
          <>
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
                {["23평", "33평", "44평"].map((pyeong) => (
                  <button
                    key={pyeong}
                    onClick={() => setSelectedPyeong(pyeong)}
                    className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                      selectedPyeong === pyeong
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    {pyeong}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-bold text-slate-400">공간 선택</span>
                  <select
                    value={selectedRoom.name}
                    onChange={(event) => setSelectedRoomName(event.target.value)}
                    className="mt-1 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg font-black text-slate-950 shadow-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                  >
                    {data.rooms.map((room) => (
                      <option key={room.name} value={room.name}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-950">{selectedRoom.name}</h2>
                  <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {selectedRoom.materials.length}개 후보
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedRoom.materials.map((material, index) => (
                  <article key={`${material.part}-${material.model}-${index}`} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{material.part}</span>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{material.category}</span>
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-500">{material.brand}</p>
                        <h3 className="mt-1 text-base font-black leading-snug text-slate-950">{material.model}</h3>
                      </div>
                      <div className="shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-right">
                        <p className="text-xs font-semibold text-slate-400">예시 가격</p>
                        <p className="text-sm font-black text-slate-950">{formatPrice(material)}</p>
                        <p className="text-[11px] font-semibold text-slate-400">/{material.unit}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{material.spec}</p>
                    <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">{material.note}</p>
                  </article>
                ))}
              </div>
            </div>

            <footer className="border-t border-slate-100 bg-slate-50/80 px-5 py-3 text-xs leading-5 text-slate-500">
              {data.price_note}
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm font-semibold text-slate-500">자재 데이터를 불러오는 중입니다…</div>
        )}
      </div>
    </aside>
  );
}
