export type StructuredLocation = {
  place_name: string;
  city: string;
  area: string;
  state: string;
  lat: number | null;
  lng: number | null;
};

function getComponent(place: any, type: string): string {
  const components = place?.address_components;
  if (!Array.isArray(components)) return "";
  const match = components.find((c: any) => Array.isArray(c?.types) && c.types.includes(type));
  return typeof match?.long_name === "string" ? match.long_name : "";
}

export function toStructuredLocation(place: any, fallback?: Partial<StructuredLocation>): StructuredLocation {
  const city =
    getComponent(place, "locality") ||
    getComponent(place, "administrative_area_level_2") ||
    fallback?.city ||
    "";
  const area =
    getComponent(place, "sublocality_level_1") ||
    getComponent(place, "neighborhood") ||
    fallback?.area ||
    "";
  const state = getComponent(place, "administrative_area_level_1") || fallback?.state || "";
  const latValue = place?.geometry?.location?.lat?.();
  const lngValue = place?.geometry?.location?.lng?.();
  return {
    place_name: place?.formatted_address || place?.name || fallback?.place_name || "",
    city,
    area,
    state,
    lat: typeof latValue === "number" ? latValue : (fallback?.lat ?? null),
    lng: typeof lngValue === "number" ? lngValue : (fallback?.lng ?? null),
  };
}
