import { describe, expect, it } from "vitest";
import { formatPreco } from "@/lib/format";
import { parseDetail } from "@/lib/api";
import { validarCadastro } from "@/lib/validacao";

const base = { nome: "Ana", email: "ana@ex.com", telefone: "31999990000", senha: "12345678" };

describe("regras", () => {
  it("formata preço decimal em string como real", () => {
    expect(formatPreco("12.50").replace(/\s/g, " ")).toBe("R$ 12,50");
  });
  it("exige senha com no mínimo 8 caracteres", () => {
    expect(validarCadastro({ ...base, senha: "1234567" }).senha).toBeDefined();
    expect(validarCadastro(base).senha).toBeUndefined();
  });
  it("limita senha a 128 caracteres", () => {
    expect(validarCadastro({ ...base, senha: "a".repeat(129) }).senha).toBeDefined();
  });
  it("associa erros 422 aos campos", () => {
    const r = parseDetail([{ loc: ["body", "email"], msg: "value is not a valid email address" }]);
    expect(r.fieldErrors["email"]).toBe("Informe um e-mail válido.");
  });
});
