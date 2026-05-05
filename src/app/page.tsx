import { NaverMapView } from "@/components/naver-map-view";

export default function Home() {
  return <NaverMapView ncpKeyId={process.env.NAVER_CLOUD_MAPS_API_KEY_ID} />;
}
