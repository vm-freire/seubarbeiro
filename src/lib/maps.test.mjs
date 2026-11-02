import { test } from "node:test";
import assert from "node:assert/strict";
import { linkMapaEmbutido, linkRota } from "./maps.ts";

test("mapa embutido usa o endereço escrito", () => {
  const u = linkMapaEmbutido({ endereco: "Rua XV de Novembro, 100", cidade: "Curitiba - PR" });
  assert.ok(u.startsWith("https://www.google.com/maps?q="));
  assert.ok(u.includes("output=embed"));
  assert.ok(u.includes(encodeURIComponent("Rua XV de Novembro, 100, Curitiba - PR")));
});

test("sem endereço (só cidade ou nada) não mostra mapa", () => {
  assert.equal(linkMapaEmbutido({ cidade: "Curitiba" }), null);
  assert.equal(linkMapaEmbutido({}), null);
});

test("rota prefere o link do Maps cadastrado", () => {
  assert.equal(linkRota({ maps_url: "https://maps.app.goo.gl/abc", endereco: "Rua A" }), "https://maps.app.goo.gl/abc");
  assert.ok(linkRota({ endereco: "Rua A", cidade: "Curitiba" }).includes("destination=Rua%20A%2C%20Curitiba"));
});
