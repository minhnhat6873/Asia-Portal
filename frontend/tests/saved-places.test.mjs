import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/features/vehicles/savedPlaces.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const places = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const ids = (query) => places.matchSavedPlaces(query).map((place) => place.id);

test("typing Wana or Á Châu suggests the company addresses", () => {
  for (const query of ["Wana", "wana", "công ty Wana", "cong ty wana", "WAN"]) assert.deepEqual(ids(query), ["wana"], query);
  for (const query of ["Á Châu", "a chau", "công ty Á Châu", "Asia", "asia food"]) assert.deepEqual(ids(query), ["asia-fnb"], query);
});

test("short or unrelated text suggests nothing", () => {
  for (const query of ["", "a", "Sân bay Tân Sơn Nhất", "10.8878, 106.7599"]) assert.deepEqual(ids(query), [], query);
});

test("Wana carries its coordinates", () => {
  const wana = places.SAVED_PLACES.find((place) => place.id === "wana");
  assert.deepEqual(wana.location, { lat: 10.887833, lng: 106.759917 });
  assert.match(places.placeText(wana), /^Wana Beverage Office – No\. 435, Nguyen Tri Phuong Street/);
});
