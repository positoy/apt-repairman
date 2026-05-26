import { getAdminData, type AdminMaterial } from "@/lib/admin-sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("ko-KR");
}

function compactText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ") || "-";
}

function materialMaker(material: AdminMaterial) {
  return compactText([material.manufacturer, material.brand, material.modelName, material.productCode]);
}

type AdminPageProps = {
  searchParams?: Promise<{ apartmentId?: string }> | { apartmentId?: string };
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = searchParams ? await searchParams : {};
  const apartmentId = params.apartmentId ? Number(params.apartmentId) : undefined;
  const data = await getAdminData(Number.isInteger(apartmentId) ? apartmentId : undefined);
  const selected = data.selectedApartment;

  const materialsByRoom = data.materials.reduce<Map<string, AdminMaterial[]>>((groups, material) => {
    const room = material.spaceName ?? material.roomName ?? "방/공간 미분류";
    groups.set(room, [...(groups.get(room) ?? []), material]);
    return groups;
  }, new Map());

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-5 py-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Apt Repairman Admin</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white lg:text-5xl">단지 → 방 → 자재 DB 조회</h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
                현재 SQLite DB를 직접 조회합니다. 핵심 관계는 <b>apartments(단지)</b> → <b>unit_types(평형)</b> → <b>spaces(방/공간)</b> → <b>materials(자재)</b>이며,
                자재는 카테고리·원본문서·이미지 참조와 연결됩니다.
              </p>
              <p className="mt-2 break-all text-xs text-slate-500">DB: {data.dbPath}</p>
            </div>

            <form action="/admin" className="w-full rounded-2xl bg-slate-900/80 p-4 ring-1 ring-white/10 lg:w-[420px]">
              <label htmlFor="apartmentId" className="text-xs font-bold text-slate-400">
                단지 선택
              </label>
              <div className="mt-2 flex gap-2">
                <select
                  id="apartmentId"
                  name="apartmentId"
                  defaultValue={selected?.id}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400"
                >
                  {data.apartments.map((apartment) => (
                    <option key={apartment.id} value={apartment.id}>
                      {apartment.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300">
                  조회
                </button>
              </div>
            </form>
          </div>
        </header>

        {!selected ? (
          <section className="rounded-[2rem] bg-white p-8 text-slate-900">조회할 단지가 없습니다.</section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                ["단지", selected.name],
                ["평형", `${formatNumber(selected.unitTypeCount)}개`],
                ["방/공간", `${formatNumber(selected.spaceCount)}개`],
                ["자재", `${formatNumber(selected.materialCount)}개`],
                ["이미지", `${formatNumber(selected.imageCount)}개`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl bg-white p-5 text-slate-950 shadow-xl">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
                </div>
              ))}
            </section>

            <section className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-xl">
              <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-black">1단계: 단지</h2>
                <p className="text-sm text-slate-500">단지를 선택하면 연결된 평형, 방/공간, 자재, 원본문서를 한 번에 재조회합니다.</p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-3">ID</th>
                      <th className="border-b border-slate-200 px-3 py-3">단지명</th>
                      <th className="border-b border-slate-200 px-3 py-3">주소</th>
                      <th className="border-b border-slate-200 px-3 py-3">좌표</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">평형</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">방</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">자재</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">원본</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.apartments.map((apartment) => (
                      <tr key={apartment.id} className={apartment.id === selected.id ? "bg-emerald-50" : "hover:bg-slate-50"}>
                        <td className="border-b border-slate-100 px-3 py-3 font-mono text-xs">{apartment.id}</td>
                        <td className="border-b border-slate-100 px-3 py-3 font-black">{apartment.name}</td>
                        <td className="border-b border-slate-100 px-3 py-3">{compactText([apartment.sido, apartment.sigungu, apartment.eupmyeondong, apartment.address])}</td>
                        <td className="border-b border-slate-100 px-3 py-3 font-mono text-xs">{compactText([apartment.latitude?.toFixed(7), apartment.longitude?.toFixed(7)])}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(apartment.unitTypeCount)}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(apartment.spaceCount)}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(apartment.materialCount)}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(apartment.sourceDocumentCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-xl">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-2xl font-black">2단계: 평형</h2>
                  <p className="text-sm text-slate-500">자재 데이터는 반드시 단지 + 평형에 소속됩니다.</p>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-3">평형</th>
                        <th className="border-b border-slate-200 px-3 py-3">전용/공급</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">방</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">자재</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.unitTypes.map((unitType) => (
                        <tr key={unitType.id} className="hover:bg-slate-50">
                          <td className="border-b border-slate-100 px-3 py-3 font-black">{unitType.name}</td>
                          <td className="border-b border-slate-100 px-3 py-3 text-slate-600">
                            {compactText([
                              unitType.exclusiveAreaM2 ? `전용 ${unitType.exclusiveAreaM2}㎡` : null,
                              unitType.supplyAreaM2 ? `공급 ${unitType.supplyAreaM2}㎡` : null,
                              unitType.description,
                            ])}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(unitType.spaceCount)}</td>
                          <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(unitType.materialCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-xl">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-2xl font-black">3단계: 방/공간</h2>
                  <p className="text-sm text-slate-500">spaces 테이블 기준으로 방을 정리하고, 각 방에 매핑된 자재와 이미지 수를 집계합니다.</p>
                </div>
                <div className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-3">평형</th>
                        <th className="border-b border-slate-200 px-3 py-3">방/공간</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">정렬</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">자재</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">이미지</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.spaces.map((space) => (
                        <tr key={space.id} className="hover:bg-slate-50">
                          <td className="border-b border-slate-100 px-3 py-3 font-bold">{space.unitTypeName}</td>
                          <td className="border-b border-slate-100 px-3 py-3 font-black">{space.name}</td>
                          <td className="border-b border-slate-100 px-3 py-3 text-right text-slate-500">{space.sortOrder}</td>
                          <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(space.materialCount)}</td>
                          <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(space.imageCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-xl">
              <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-black">자재 상세: 방별 그룹</h2>
                <p className="text-sm text-slate-500">단지 선택 후 방/공간별로 자재를 펼쳐서 봅니다. 품목, 제조사/브랜드/모델, 색상·규격·마감, 원본문서/이미지 수를 함께 표시합니다.</p>
              </div>

              <div className="mt-4 space-y-5">
                {Array.from(materialsByRoom.entries()).map(([room, materials]) => (
                  <details key={room} open className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <summary className="cursor-pointer select-none px-4 py-3 text-base font-black text-slate-900">
                      {room} <span className="text-sm font-bold text-slate-500">({formatNumber(materials.length)}개)</span>
                    </summary>
                    <div className="overflow-x-auto bg-white">
                      <table className="w-full min-w-[1380px] text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="border-y border-slate-200 px-3 py-3">ID</th>
                            <th className="border-y border-slate-200 px-3 py-3">평형</th>
                            <th className="border-y border-slate-200 px-3 py-3">분류</th>
                            <th className="border-y border-slate-200 px-3 py-3">위치</th>
                            <th className="border-y border-slate-200 px-3 py-3">품목</th>
                            <th className="border-y border-slate-200 px-3 py-3">제조사/모델</th>
                            <th className="border-y border-slate-200 px-3 py-3">색상·크기·마감</th>
                            <th className="border-y border-slate-200 px-3 py-3">규격/비고</th>
                            <th className="border-y border-slate-200 px-3 py-3 text-right">이미지</th>
                            <th className="border-y border-slate-200 px-3 py-3">원본</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materials.map((material) => (
                            <tr key={material.id} className="hover:bg-emerald-50/60">
                              <td className="border-b border-slate-100 px-3 py-3 font-mono text-[11px] text-slate-500">{material.id}</td>
                              <td className="border-b border-slate-100 px-3 py-3 font-bold">{material.unitTypeName}</td>
                              <td className="border-b border-slate-100 px-3 py-3">{material.categoryName ?? "-"}</td>
                              <td className="border-b border-slate-100 px-3 py-3">{compactText([material.location, material.roomName && material.roomName !== room ? material.roomName : null])}</td>
                              <td className="border-b border-slate-100 px-3 py-3 font-black text-slate-950">{material.itemName}</td>
                              <td className="border-b border-slate-100 px-3 py-3">{materialMaker(material)}</td>
                              <td className="border-b border-slate-100 px-3 py-3">{compactText([material.color, material.size, material.finish])}</td>
                              <td className="border-b border-slate-100 px-3 py-3 leading-5">{compactText([material.specification, material.notes])}</td>
                              <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(material.imageCount)}</td>
                              <td className="border-b border-slate-100 px-3 py-3">{material.sourceDocumentTitle ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
              <div className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-xl">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-2xl font-black">원본문서</h2>
                  <p className="text-sm text-slate-500">자재 추출의 출처가 되는 이미지/PDF/문서입니다.</p>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-3">제목</th>
                        <th className="border-b border-slate-200 px-3 py-3">평형</th>
                        <th className="border-b border-slate-200 px-3 py-3">유형</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">파일</th>
                        <th className="border-b border-slate-200 px-3 py-3">가져온 시각</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sourceDocuments.map((document) => (
                        <tr key={document.id} className="hover:bg-slate-50">
                          <td className="border-b border-slate-100 px-3 py-3 font-black">{document.title}</td>
                          <td className="border-b border-slate-100 px-3 py-3">{document.unitTypeName}</td>
                          <td className="border-b border-slate-100 px-3 py-3">{document.documentType}</td>
                          <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(document.sourceFileCount)}</td>
                          <td className="border-b border-slate-100 px-3 py-3 font-mono text-xs">{document.importedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-xl">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-2xl font-black">스키마 분석</h2>
                  <p className="text-sm text-slate-500">현재 DB 테이블/컬럼/행 수입니다. 자재는 append-only이고 삭제는 deleted 플래그로 처리됩니다.</p>
                </div>
                <div className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-3">테이블</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">행 수</th>
                        <th className="border-b border-slate-200 px-3 py-3">컬럼</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.schemaTables.map((table) => (
                        <tr key={table.name} className="hover:bg-slate-50">
                          <td className="border-b border-slate-100 px-3 py-3 font-mono font-black">{table.name}</td>
                          <td className="border-b border-slate-100 px-3 py-3 text-right font-bold">{formatNumber(table.rowCount)}</td>
                          <td className="border-b border-slate-100 px-3 py-3 font-mono leading-5 text-slate-600">{table.columns}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
