import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProductImage, safeImageUrl } from "./ProductImage";
afterEach(cleanup);
it("aceita imagem HTTPS e rejeita protocolos inseguros e credenciais na URL", () => {
  expect(safeImageUrl("https://example.com/cupcake.jpg")).toBe("https://example.com/cupcake.jpg");
  for (const src of [
    "http://example.com/a.jpg",
    "javascript:alert(1)",
    "data:image/svg+xml,test",
    "https://user:password@example.com/a.jpg",
  ])
    expect(safeImageUrl(src)).toBeNull();
});
it("não envia o endereço da página ao servidor externo da imagem", () => {
  render(<ProductImage src="https://example.com/a.jpg" alt="Cupcake" />);
  expect(screen.getByAltText("Cupcake")).toHaveAttribute("referrerpolicy", "no-referrer");
});
