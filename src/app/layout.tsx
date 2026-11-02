import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Manrope } from "next/font/google";
import { MARCA } from "@/lib/marca";
import "./globals.css";

const titulo = Big_Shoulders({ variable: "--font-titulo-fonte", subsets: ["latin", "latin-ext"], weight: ["600", "800", "900"] });
const texto = Manrope({ variable: "--font-texto-fonte", subsets: ["latin", "latin-ext"] });

const SCRIPT_TEMA = `try{var t=localStorage.getItem("tema");if(t==="claro"||t==="escuro")document.documentElement.dataset.tema=t}catch(e){}`;

export const metadata: Metadata = {
  title: { default: `${MARCA} · Agende seu horário`, template: `%s · ${MARCA}` },
  description: "Agendamento online para barbearias, com confirmação pelo WhatsApp.",
  applicationName: MARCA,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3ede2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${texto.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* aplica o tema escolhido no botão sol/lua antes de pintar (sem piscar) */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col font-texto">{children}</body>
    </html>
  );
}
