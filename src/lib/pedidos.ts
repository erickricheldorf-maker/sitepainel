export type Urgency = "baixa" | "media" | "critica";
export type Status = "pendente" | "cotacao" | "comprado" | "entregue";

export const URGENCY_LABELS: Record<Urgency, string> = {
  baixa: "Baixa",
  media: "Média",
  critica: "Crítica",
};

export const STATUS_LABELS: Record<Status, string> = {
  pendente: "Pendente",
  cotacao: "Em cotação",
  comprado: "Comprado",
  entregue: "Entregue",
};

export const STATUS_ORDER: Status[] = ["pendente", "cotacao", "comprado", "entregue"];
export const URGENCIES: Urgency[] = ["baixa", "media", "critica"];

export function nextStatus(s: Status): Status | null {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[i + 1] ?? null;
}
