export const favoritesKey = "ugso.colorpicker.favorites.v1";
export function normalizeFavorites(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(hex => typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex)).map(hex => hex.toLowerCase()))].slice(0,15);
}
export function addFavorite(favorites, hex) {
  return normalizeFavorites([...favorites, hex]);
}
