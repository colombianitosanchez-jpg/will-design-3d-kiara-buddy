import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle, MapPin } from "lucide-react";
import logoAsset from "@/assets/will_logo.asset.json";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Will Design 3D"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover"
            />
            <p className="text-base font-black">
              Will Design{" "}
              <span style={{ color: "var(--brand-orange)" }}>3D</span>
            </p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Tu socio integral en impresión 3D en Colombia. Diseño, producción y
            asesoría técnica.
          </p>
          <p className="mt-4 text-sm font-medium">
            Supervisado por Kiara <span aria-hidden>🐾</span>
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Servicios
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/servicios" className="hover:underline">
                Impresión 3D a pedido
              </Link>
            </li>
            <li>
              <Link to="/servicios" className="hover:underline">
                Diseño 3D personalizado
              </Link>
            </li>
            <li>
              <Link to="/servicios" className="hover:underline">
                Mantenimiento y upgrades
              </Link>
            </li>
            <li>
              <Link to="/servicios" className="hover:underline">
                Post-procesado y pintura
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tienda
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/tienda" className="hover:underline">
                Impresoras 3D
              </Link>
            </li>
            <li>
              <Link to="/tienda" className="hover:underline">
                Filamentos y resinas
              </Link>
            </li>
            <li>
              <Link to="/tienda" className="hover:underline">
                Escáners y accesorios
              </Link>
            </li>
            <li>
              <Link to="/tienda" className="hover:underline">
                Repuestos
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Contacto
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            <li>
              <a
                href="https://wa.me/573156724474"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold hover:underline"
              >
                <MessageCircle className="h-4 w-4 text-[var(--brand-orange)]" />
                +57 315 672 4474
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/will_design2020/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold hover:underline"
              >
                <Instagram className="h-4 w-4 text-[var(--brand-teal-deep)]" />
                @will_design2020
              </a>
            </li>
            <li className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--brand-wine)]" />
              Bogotá, Colombia
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Will Design 3D. Todos los derechos reservados.</p>
          <p>Hecho con 🐾 en Bogotá</p>
        </div>
      </div>
    </footer>
  );
}
