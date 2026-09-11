import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UploadCloud, Trash2, ArrowUp, ArrowDown, Film, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HERO_MEDIA_BUCKET, detectMediaType, type HeroSlide } from "@/lib/hero-carousel";

export const Route = createFileRoute("/panel/carrusel")({
  ssr: false,
  component: CarruselAdmin;
});

function CarruselAdmin() {
  return null;
}
