import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CarouselApi } from "@/components/ui/carousel";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { DEFAULT_SLIDE_MS, heroCarouselQuery } from "@/lib/hero-carousel";

const MEDIA_CLASS = "aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-border";

/** Carrusel de fotos y videos del hero; cada elemento tiene su propia duración. */
export function HeroMedia({ fallbackImage }: { fallbackImage: string }) {
  const { data } = useQuery(heroCarouselQuery());
  const slides = data ?? [];
  const [api, setApi] = useState<CarouselApi>();
  const pausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    clear();
    if (!api || pausedRef.current || slides.length < 2) return;
    const index = api.selectedScrollSnap();
    const ms = slides[index]?.duration_ms || DEFAULT_SLIDE_MS;
    timerRef.current = setTimeout(() => {
      api.scrollNext();
    }, ms);
  }, [api, clear, slides]);

  useEffect(() => {
    if (!api) return;
    const onPointerDown = () => {
      pausedRef.current = true;
      clear();
    };
    const onPointerUp = () => {
      pausedRef.current = false;
      schedule();
    };
    api.on("select", schedule);
    api.on("reInit", schedule);
    api.on("pointerDown", onPointerDown);
    api.on("pointerUp", onPointerUp);
    schedule();
    return () => {
      api.off("select", schedule);
      api.off("reInit", schedule);
      api.off("pointerDown", onPointerDown);
      api.off("pointerUp", onPointerUp);
      clear();
    };
  }, [api, schedule, clear]);

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
      setApi={setApi}
      className="w-full"
      onMouseEnter={() => {
        pausedRef.current = true;
        clear();
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
        schedule();
      }}
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
