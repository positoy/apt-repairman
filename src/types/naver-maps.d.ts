export {};

declare global {
  const naver: {
    maps: {
      Map: new (element: HTMLElement | string, options: NaverMapOptions) => NaverMap;
      Marker: new (options: NaverMarkerOptions) => NaverMarker;
      LatLng: new (lat: number, lng: number) => NaverLatLng;
      Point: new (x: number, y: number) => NaverPoint;
      Event: {
        addListener: (target: unknown, eventName: string, listener: () => void) => void;
      };
      Size: new (width: number, height: number) => NaverSize;
      Position: {
        BOTTOM_LEFT: number;
      };
    };
  };

  interface Window {
    naver?: typeof naver;
    navermap_authFailure?: () => void;
  }

  namespace naver.maps {
    type Map = NaverMap;
    type Marker = NaverMarker;
  }
}

type NaverLatLng = unknown;
type NaverPoint = unknown;
type NaverSize = unknown;

type NaverMap = {
  panTo: (latLng: NaverLatLng) => void;
};

type NaverMarker = {
  setMap: (map: NaverMap | null) => void;
};

type NaverMapOptions = {
  center: NaverLatLng;
  zoom: number;
  minZoom?: number;
  mapTypeControl?: boolean;
  scaleControl?: boolean;
  logoControlOptions?: {
    position: number;
  };
};

type NaverMarkerOptions = {
  position: NaverLatLng;
  title?: string;
  icon?: {
    content: string;
    anchor: NaverPoint;
    size?: NaverSize;
  };
};
