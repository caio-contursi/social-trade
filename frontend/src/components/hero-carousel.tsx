"use client";

import { useEffect, useState } from "react";

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
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

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
      <span className="sr-only" aria-live="polite">{activeSlide.caption}</span>
    </div>
  );
}
