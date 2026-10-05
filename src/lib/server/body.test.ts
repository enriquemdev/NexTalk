import { expect, test } from "vitest";
import { boundedJson } from "./body";
test("parses a bounded UTF-8 JSON body", async () => {
  expect(await boundedJson(new Request("https://example.test", { method: "POST", body: JSON.stringify({ name: "Muñoz" }) }), 100)).toEqual({ name: "Muñoz" });
});
test("rejects oversized bodies even without content-length", async () => {
  await expect(boundedJson(new Request("https://example.test", { method: "POST", body: '"' + "x".repeat(50) + '"' }), 20)).rejects.toThrow("BODY_TOO_LARGE");
});
test("rejects advertised oversized bodies before reading", async () => {
  await expect(boundedJson(new Request("https://example.test", { method: "POST", body: "{}", headers: { "content-length": "9999" } }), 20)).rejects.toThrow("BODY_TOO_LARGE");
});
test("rejects empty or malformed requests", async () => {
  await expect(boundedJson(new Request("https://example.test", { method: "POST" }))).rejects.toThrow("INVALID_BODY");
  await expect(boundedJson(new Request("https://example.test", { method: "POST", body: "{" }))).rejects.toThrow();
});
