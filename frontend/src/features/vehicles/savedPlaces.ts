/**
 * Company places suggested while typing a pickup or destination. Add new places here.
 * keywords are matched without accents or case ("a chau" matches "Á Châu").
 */
export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  /** Decimal degrees; used as the pickup position when chosen for the pickup. */
  location?: { lat: number; lng: number };
  keywords: string[];
}

export const SAVED_PLACES: SavedPlace[] = [
  {
    id: "asia-fnb",
    name: "Công ty Á Châu (Asia F&B)",
    address: "Administrative Center Urban Area, No. 2 Street No. 3, Khu Phố Nhị Đồng 2, Dĩ An, Hồ Chí Minh 75306, Việt Nam",
    keywords: ["á châu", "công ty á châu", "asia", "asia f&b", "asia food", "asia food & beverage", "afb"],
  },
  {
    id: "wana",
    name: "Công ty Wana",
    address: "No. 435, Nguyen Tri Phuong Street, Bình Đường 4, Quater, Ward, Hồ Chí Minh 75300, Việt Nam",
    // 10°53'16.2"N 106°45'35.7"E
    location: { lat: 10.887833, lng: 106.759917 },
    keywords: ["wana", "công ty wana"],
  },
];

export function normalizePlaceText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Places whose name or keywords contain what was typed (at least 2 characters). */
export function matchSavedPlaces(query: string, places: SavedPlace[] = SAVED_PLACES): SavedPlace[] {
  const needle = normalizePlaceText(query);
  if (needle.length < 2) return [];
  return places.filter((place) => [place.name, ...place.keywords].some((text) => {
    const hay = normalizePlaceText(text);
    return hay.includes(needle) || needle.includes(hay);
  }));
}

export const placeText = (place: SavedPlace) => `${place.name} – ${place.address}`;
