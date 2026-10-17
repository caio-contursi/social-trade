import { expect, test } from "@playwright/test";

test("declara favicon, ícone SVG e ícone da Apple, e todos respondem como imagem", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const links = await page
    .locator('head link[rel="icon"], head link[rel="apple-touch-icon"]')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        rel: element.getAttribute("rel"),
        href: element.getAttribute("href") ?? "",
        type: element.getAttribute("type"),
      })),
    );

  expect(links.some((link) => link.href.startsWith("/favicon.ico"))).toBe(true);
  expect(links.some((link) => link.type === "image/svg+xml")).toBe(true);
  expect(links.some((link) => link.rel === "apple-touch-icon")).toBe(true);

  for (const link of links) {
    const response = await request.get(link.href);
    expect(response.status(), link.href).toBe(200);
    expect(response.headers()["content-type"], link.href).toMatch(
      /^image\/(x-icon|vnd\.microsoft\.icon|svg\+xml|png)/,
    );
  }
});
