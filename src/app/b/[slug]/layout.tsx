/** Páginas da barbearia: cursor de máquina de cabelo (ver .cursor-maquina no CSS). */
export default function Layout({ children }: LayoutProps<"/b/[slug]">) {
  return <div className="cursor-maquina contents">{children}</div>;
}
