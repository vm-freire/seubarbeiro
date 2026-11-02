import { STATUS, type Status } from "@/lib/formatar";

export function SeloStatus({ status, curto = false }: { status: Status; curto?: boolean }) {
  const s = STATUS[status];
  return <span className={`selo selo-${s.cor}`}>{curto ? s.curto : s.rotulo}</span>;
}
