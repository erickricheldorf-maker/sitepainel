import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowRight, ImageOff, LogOut, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  URGENCY_LABELS,
  nextStatus,
  type Status,
  type Urgency,
} from "@/lib/pedidos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Pedidos · Manutenção" },
      { name: "description", content: "Acompanhe e atualize os pedidos de peças da manutenção." },
      { property: "og:title", content: "Painel de Pedidos · Manutenção" },
      { property: "og:description", content: "Acompanhe e atualize os pedidos de peças da manutenção." },
    ],
  }),
  component: Index,
});

type Pedido = {
  id: string;
  equipment: string;
  serial_number: string;
  part_name: string;
  reference_code: string;
  photo_data_url: string | null;
  urgency: Urgency;
  symptoms: string;
  status: Status;
  created_at: string;
  updated_at: string;
};

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="min-h-screen bg-background" />;
  return session ? <Painel email={session.user.email ?? ""} /> : <Login />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error("E-mail ou senha incorretos.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Wrench className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold uppercase">Painel de Pedidos</h1>
            <p className="text-sm text-muted-foreground">Acesso do comprador</p>
          </div>
        </div>
        <label className="mb-1 block text-sm font-medium">E-mail</label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4" />
        <label className="mb-1 block text-sm font-medium">Senha</label>
        <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mb-6" />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

const urgencyClass: Record<Urgency, string> = {
  baixa: "bg-success/15 text-success",
  media: "bg-accent/20 text-accent-foreground",
  critica: "bg-destructive/15 text-destructive",
};
const statusClass: Record<Status, string> = {
  pendente: "bg-muted text-muted-foreground",
  cotacao: "bg-info/15 text-info",
  comprado: "bg-accent/20 text-accent-foreground",
  entregue: "bg-success/15 text-success",
};

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function Painel({ email }: { email: string }) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [filtro, setFiltro] = useState<Status | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Pedido | null>(null);

  async function carregar() {
    const { data, error } = await supabase.from("pedidos").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Não foi possível carregar os pedidos.");
    else setPedidos(data as Pedido[]);
  }

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, []);

  async function avancar(p: Pedido, status: Status) {
    const { error } = await supabase
      .from("pedidos")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) return toast.error("Não foi possível atualizar.");
    toast.success(`Pedido marcado como ${STATUS_LABELS[status]}`);
    setAberto(null);
    carregar();
  }

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todos: pedidos?.length ?? 0 };
    STATUS_ORDER.forEach((s) => (c[s] = pedidos?.filter((p) => p.status === s).length ?? 0));
    return c;
  }, [pedidos]);

  const lista = (pedidos ?? []).filter(
    (p) =>
      (filtro === "todos" || p.status === filtro) &&
      `${p.equipment} ${p.part_name} ${p.serial_number} ${p.reference_code}`.toLowerCase().includes(busca.toLowerCase()),
  );
  const criticos = (pedidos ?? []).filter((p) => p.urgency === "critica" && p.status !== "entregue").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Wrench className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold uppercase">Painel de Pedidos</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden opacity-70 sm:inline">{email}</span>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {(["todos", ...STATUS_ORDER] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={`rounded-xl border p-4 text-left transition-colors ${filtro === s ? "border-accent bg-card ring-2 ring-accent" : "bg-card hover:border-accent/60"}`}
            >
              <div className="text-xs font-semibold uppercase text-muted-foreground">{s === "todos" ? "Todos" : STATUS_LABELS[s]}</div>
              <div className="font-display text-3xl font-bold">{contagem[s]}</div>
            </button>
          ))}
        </div>

        {criticos > 0 && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {criticos} {criticos === 1 ? "pedido crítico em aberto" : "pedidos críticos em aberto"} — máquina parada.
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por máquina, peça ou código" value={busca} onChange={(e) => setBusca(e.target.value)} className="bg-card pl-9" />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {pedidos === null ? (
            <p className="p-8 text-center text-muted-foreground">Carregando...</p>
          ) : lista.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhum pedido encontrado.</p>
          ) : (
            <ul className="divide-y">
              {lista.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setAberto(p)} className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left hover:bg-muted/60">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{p.part_name}</div>
                      <div className="truncate text-sm text-muted-foreground">{p.equipment} · {p.serial_number}</div>
                    </div>
                    <Chip className={urgencyClass[p.urgency]}>{URGENCY_LABELS[p.urgency]}</Chip>
                    <Chip className={statusClass[p.status]}>{STATUS_LABELS[p.status]}</Chip>
                    <span className="w-28 text-right text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setAberto(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex flex-wrap gap-2">
              <Chip className={urgencyClass[aberto.urgency]}>{URGENCY_LABELS[aberto.urgency]}</Chip>
              <Chip className={statusClass[aberto.status]}>{STATUS_LABELS[aberto.status]}</Chip>
            </div>
            <h2 className="text-2xl font-bold">{aberto.part_name}</h2>
            <p className="mb-4 text-muted-foreground">{aberto.equipment}</p>
            {aberto.photo_data_url ? (
              <img src={aberto.photo_data_url} alt="Foto da peça" className="mb-4 max-h-64 w-full rounded-lg object-cover" />
            ) : (
              <div className="mb-4 flex h-24 items-center justify-center gap-2 rounded-lg bg-muted text-sm text-muted-foreground">
                <ImageOff className="h-4 w-4" /> Sem foto
              </div>
            )}
            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Nº de série</dt><dd className="font-medium">{aberto.serial_number || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Código</dt><dd className="font-medium">{aberto.reference_code || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Aberto em</dt><dd className="font-medium">{new Date(aberto.created_at).toLocaleString("pt-BR")}</dd></div>
              <div><dt className="text-muted-foreground">Atualizado</dt><dd className="font-medium">{new Date(aberto.updated_at).toLocaleString("pt-BR")}</dd></div>
            </dl>
            <p className="mb-6 rounded-lg bg-muted p-3 text-sm">{aberto.symptoms || "Sem descrição."}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setAberto(null)}>Fechar</Button>
              {nextStatus(aberto.status) && (
                <Button onClick={() => avancar(aberto, nextStatus(aberto.status)!)}>
                  Marcar como {STATUS_LABELS[nextStatus(aberto.status)!]} <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
