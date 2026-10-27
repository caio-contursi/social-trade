"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    src: "/images/voluntariado.jpg",
    alt: "Pessoa voluntária durante uma atividade comunitária",
    caption: "O impacto começa com uma conexão.",
  },
  {
    src: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=1200&q=85",
    alt: "Maçãs vermelhas frescas",
    caption: "Maçãs",
  },
  {
    src: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=1200&q=85",
    alt: "Laranjas frescas",
    caption: "Laranjas",
  },
  {
    src: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1200&q=85",
    alt: "Bananas maduras",
    caption: "Bananas",
  },
  {
    src: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=1200&q=85",
    alt: "Uvas roxas",
    caption: "Uvas",
  },
  {
    src: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1200&q=85",
    alt: "Morangos vermelhos",
    caption: "Morangos",
  },
] as const;

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 3500);
    return () => window.clearInterval(interval);
  }, []);

  function showSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  return (
    <div
      className="hero-carousel relative aspect-[1.05] overflow-hidden rounded-[2rem] bg-secondary sm:aspect-[1.15] lg:aspect-[1.2]"
      role="region"
      aria-label="Imagens ilustrativas da SocialTrade"
      aria-roledescription="carrossel"
    >
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        return (
          <div
            key={slide.src}
            className={`hero-carousel-image absolute inset-0 bg-cover bg-center${isActive ? " is-active" : ""}`}
            data-active={isActive}
            style={{ backgroundImage: `url("${slide.src}")` }}
            role={isActive ? "img" : undefined}
            aria-label={isActive ? slide.alt : undefined}
            aria-hidden={!isActive}
          />
        );
      })}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" aria-hidden="true" />
      <p className="absolute top-5 right-5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white">
        Imagem {activeIndex + 1} de {slides.length}
      </p>
      <button
        type="button"
        className="hero-carousel-control absolute top-1/2 left-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={() => showSlide(activeIndex - 1)}
        aria-label="Imagem anterior"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="hero-carousel-control absolute top-1/2 right-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={() => showSlide(activeIndex + 1)}
        aria-label="Próxima imagem"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2" role="group" aria-label="Selecionar imagem">
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => showSlide(index)}
            className={`size-2.5 rounded-full border border-white transition ${index === activeIndex ? "scale-110 bg-white" : "bg-black/35 hover:bg-white/80"}`}
            aria-label={`Ir para imagem ${index + 1}: ${slide.alt}`}
            aria-current={index === activeIndex ? "true" : undefined}
          />
        ))}
      </div>
      <span className="sr-only" aria-live="polite">{activeSlide.caption}</span>
    </div>
  );
}
