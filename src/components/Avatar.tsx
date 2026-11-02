import Image from "next/image";

/** Foto do profissional ou, sem foto, as iniciais num círculo. */
export function Avatar({ nome, foto, tamanho = 48, className = "" }: { nome: string; foto?: string | null; tamanho?: number; className?: string }) {
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (foto) {
    return (
      <Image
        src={foto}
        alt={nome}
        width={tamanho}
        height={tamanho}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-texto font-titulo font-extrabold text-fundo ${className}`}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4 }}
    >
      {iniciais || "?"}
    </span>
  );
}
