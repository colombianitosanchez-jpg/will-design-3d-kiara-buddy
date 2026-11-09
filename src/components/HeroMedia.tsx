import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useMatches } from "@tanstack/react-router";
import type { CarouselApi } from "@/components/ui/carousel";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { DEFAULT_SLIDE_MS, heroCarouselQuery } from "@/lib/hero-carousel";

const MEDIA_CLASS = "aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-border";

/** Carrusel de fotos y videos del hero; cada elemento tiene su propia duración. */
export function HeroMedia({ fallbackImage }: { fallbackImage?: string }) {
  const matches = useMatches() as any[];
  const homeMatch = matches.find((m) => m.routeId === "/")?.loaderData;
  const { data } = useQuery({
    ...heroCarouselQuery(),
    initialData: homeMatch?.heroCarousel,
  });
  const slides = data ?? [];
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
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

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
      schedule();
    };

    const onPointerDown = () => {
      pausedRef.current = true;
      clear();
    };
    const onPointerUp = () => {
      pausedRef.current = false;
      schedule();
    };

    api.on("select", onSelect);
    api.on("reInit", onSelect);
    api.on("pointerDown", onPointerDown);
    api.on("pointerUp", onPointerUp);
    schedule();
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
      api.off("pointerDown", onPointerDown);
      api.off("pointerUp", onPointerUp);
      clear();
    };
  }, [api, schedule, clear]);

  // Si no hay slides en el carrusel, usa el fallbackImage de CMS o retorna null (sin spinner ni imágenes estáticas antiguas)
  if (slides.length === 0) {
    if (!fallbackImage?.trim()) return null;
    return (
      <img
        src={fallbackImage}
        alt="Will Design 3D"
        width={1600}
        height={1000}
        loading="eager"
        {...({ fetchPriority: "high" as const })}
        decoding="async"
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
        {slides.map((item, index) => {
          const isActive = index === selectedIndex;
          const isFirst = index === 0;

          const media =
            item.media_type === "video" ? (
              <video
                src={item.media_url}
                poster={fallbackImage}
                preload="metadata"
                autoPlay={isActive}
                loop
                muted
                playsInline
                width={1600}
                height={1000}
                className={MEDIA_CLASS}
              />
            ) : (
              <img
                src={item.media_url}
                alt={`Slide ${index + 1}`}
                width={1600}
                height={1000}
                loading={isFirst ? "eager" : "lazy"}
                {...(isFirst ? { fetchPriority: "high" as const } : {})}
                className={MEDIA_CLASS}
              />
            );
          return (
            <CarouselItem key={item.id} className="pl-0">
              {item.action_url ? (
                <Link
                  to={item.action_url}
                  className="block h-full w-full cursor-pointer"
                  onClick={(e) => {
                    if (item.action_url?.startsWith("http")) {
                      e.preventDefault();
                      window.open(item.action_url, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  {media}
                </Link>
              ) : (
                media
              )}
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}
