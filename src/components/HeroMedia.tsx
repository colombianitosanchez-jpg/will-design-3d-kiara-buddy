import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { heroCarouselQuery } from "@/lib/hero-carousel";

const MEDIA_CLASS = "aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-border";

/** Carrusel de fotos y videos del hero; conserva el marco de la imagen original. */
export function HeroMedia({ fallbackImage }: { fallbackImage: string }) {
  const { data } = useQuery(heroCarouselQuery());
  const autoplay = useRef(Autoplay({ delay: 4500, stopOnInteraction: true }));
  const slides = data ?? [];

  if (slides.length === 0) {
    return (
      <img
        src={fallbackImage}
        alt="Impresión 3D de gran formato Will Design 3D"
        width={1600}
        height={1000}
        className={MEDIA_CLASS}
      />
    );
  }

  return (
    <Carousel
      opts={{ loop: slides.length > 1 }}
      plugins={slides.length > 1 ? [autoplay.current] : []}
      className="w-full"
    >
      <CarouselContent className="ml-0">
        {slides.map((item) => (
          <CarouselItem key={item.id} className="pl-0">
            {item.media_type === "video" ? (
              <video
                src={item.media_url}
                autoPlay
                loop
                muted
                playsInline
                className={MEDIA_CLASS}
              />
            ) : (
              <img src={item.media_url} alt="Slide" className={MEDIA_CLASS} />
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
