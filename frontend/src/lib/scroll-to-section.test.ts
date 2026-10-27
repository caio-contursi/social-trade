import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollToSection } from "./scroll-to-section";

describe("rolagem para seções", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("usa uma animação progressiva de 700 ms e respeita o recuo do cabeçalho", () => {
    let currentScrollY = 0;
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => currentScrollY });
    const scrollImplementation = ((options: ScrollToOptions) => {
      currentScrollY = Number(options.top) || 0;
    }) as typeof window.scrollTo;
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(scrollImplementation);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const target = document.createElement("section");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      top: 1000, left: 0, right: 100, bottom: 1100, width: 100, height: 100, x: 0, y: 1000,
      toJSON: () => ({}),
    });
    const topOffset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const expectedTop = 1000 - topOffset;

    scrollToSection(target);
    frames.shift()!(0);
    expect(scroll).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "instant" });
    frames.shift()!(350);
    expect(currentScrollY).toBeCloseTo(expectedTop / 2, 0);
    frames.shift()!(700);
    expect(currentScrollY).toBe(expectedTop);
    expect(frames).toHaveLength(0);
  });

  it("desativa a animação quando o usuário prefere movimento reduzido", () => {
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");
    const target = document.createElement("section");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      top: 120, left: 0, right: 100, bottom: 220, width: 100, height: 100, x: 0, y: 120,
      toJSON: () => ({}),
    });

    scrollToSection(target);

    expect(scroll).toHaveBeenCalledOnce();
    expect(scroll.mock.calls[0][0]).toMatchObject({ behavior: "instant" });
    expect(requestFrame).not.toHaveBeenCalled();
  });
});
