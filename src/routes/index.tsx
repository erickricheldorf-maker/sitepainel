import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowRight, AlertTriangle, CheckCheck, ChevronRight, CircleCheck, Clock3, Inbox, LayoutDashboard, LoaderCircle, LogOut, Package, RefreshCw, Search, ShoppingCart, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PanelLogin } from "@/components/panel-login";
import { STATUS_LABELS, STATUS_ORDER, URGENCY_LABELS, nextStatus, type Status, type Urgency } from "@/lib/pedidos";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Painel de Pedidos · Central de Manutenção" },
    { name: "description", content: "Central de compras e acompanhamento de pedidos de peças para manutenção." },
    { property: "og:title", content: "Painel de Pedidos · Central de Manutenção" },
    { property: "og:description", content: "Central de compras e acompanhamento de pedidos de peças para manutenção." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

type Pedido = { id: string; equipment: string; serial_number: string; part_name: string; reference_code: string; photo_data_url: string | null; urgency: Urgency; symptoms: string; status: Status; created_at: string; updated_at: string; };
type Filter = Status | "todos";
const statusIcons = { pendente: Clock3, cotacao: RefreshCw, comprado: ShoppingCart, entregue: CheckCheck };
const urgencyClass: Record<Urgency, string> = { baixa: "bg-success/10 text-success", media: "bg-accent/15 text-accent-foreground", critica: "bg-destructive/10 text-destructive" };
const statusClass: Record<Status, string> = { pendente: "bg-muted text-muted-foreground", cotacao: "bg-info/10 text-info", comprado: "bg-accent/15 text-accent-foreground", entregue: "bg-success/10 text-success" };
function Chip({ className, children }: { className: string; children: React.ReactNode }) { return <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${className}`}><span className="size-1.5 rounded-full bg-current" />{children}</span>; }

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return <div className="flex min-h-svh items-center justify-center bg-background"><LoaderCircle className="size-6 animate-spin text-primary" /></div>;
  return session ? <Painel email={session.user.email ?? ""} /> : <PanelLogin />;
}

function Painel({ email }: { email: string }) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [filtro, setFiltro] = useState<Filter>("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Pedido | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  async function carregar() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.from("pedidos").select("*").order("created_at", { ascending: false });
      if (error) { setLoadError(true); toast.error("Não foi possível carregar os pedidos."); }
      else { setPedidos(data as Pedido[]); setLoadError(false); setUpdated(new Date()); }
    } catch { setLoadError(true); toast.error("Não foi possível carregar os pedidos."); }
    finally { setRefreshing(false); }
  }
  useEffect(() => { carregar(); const t = setInterval(carregar, 30000); return () => clearInterval(t); }, []);
  async function avancar(p: Pedido, status: Status) {
    setSaving(true);
    try {
      const { error } = await supabase.from("pedidos").update({ status, updated_at: new Date().toISOString() }).eq("id", p.id);
      if (error) { toast.error("Não foi possível atualizar."); return; }
      toast.success(`Pedido marcado como ${STATUS_LABELS[status]}`); setAberto(null); await carregar();
    } catch { toast.error("Não foi possível atualizar."); }
    finally { setSaving(false); }
  }
  const contagem = useMemo(() => {
    const c: Record<Filter, number> = { todos: pedidos?.length ?? 0, pendente: 0, cotacao: 0, comprado: 0, entregue: 0 };
    pedidos?.forEach(p => c[p.status]++); return c;
  }, [pedidos]);
  const lista = (pedidos ?? []).filter(p => (filtro === "todos" || p.status === filtro) && `${p.equipment} ${p.part_name} ${p.serial_number} ${p.reference_code}`.toLowerCase().includes(busca.toLowerCase()));
  const criticos = (pedidos ?? []).filter(p => p.urgency === "critica" && p.status !== "entregue").length;
  const proximo = aberto ? nextStatus(aberto.status) : null;
  const nome = email.split("@")[0].split("_")[0];
  const initials = nome.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-svh bg-background lg:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-6 py-8"><span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground"><Wrench className="size-5" /></span><div><p className="font-display text-xl font-bold uppercase leading-tight">Central de<br />manutenção</p></div></div>
        <div className="px-6 pb-3 pt-8 text-xs font-medium text-sidebar-muted">ESPAÇO DE TRABALHO</div>
        <nav className="space-y-1 px-3" aria-label="Pedidos">{(["todos", ...STATUS_ORDER] as const).map(s => { const Icon = s === "todos" ? LayoutDashboard : statusIcons[s]; return <Button key={s} variant="ghost" onClick={() => setFiltro(s)} className={`h-11 w-full justify-start px-3 hover:bg-sidebar-accent hover:text-sidebar-foreground ${filtro === s ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-muted"}`}><Icon className={filtro === s ? "text-primary" : ""} />{s === "todos" ? "Visão geral" : STATUS_LABELS[s]}<span className="ml-auto text-xs tabular-nums">{contagem[s]}</span></Button>; })}</nav>
        <div className="mt-auto border-t border-sidebar-border p-5"><div className="mb-4 flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-medium capitalize">{nome}</p><p className="text-xs text-sidebar-muted">Equipe de compras</p></div></div><Button variant="ghost" onClick={() => supabase.auth.signOut()} className="h-9 w-full justify-start px-0 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"><LogOut />Sair da conta</Button></div>
      </aside>
      <header className="flex h-20 items-center justify-between gap-3 border-b bg-card px-5 sm:px-9"><div className="flex items-center gap-2 text-sm"><Wrench className="size-5 text-primary lg:hidden" /><span className="text-muted-foreground">Manutenção</span><ChevronRight className="size-3 text-muted-foreground" /><span className="font-medium">Pedidos</span></div><div className="flex items-center gap-4"><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className={`size-1.5 rounded-full ${loadError ? "bg-destructive" : updated ? "bg-success" : "bg-muted-foreground"}`} />{loadError ? "Falha na atualização" : updated ? `Atualizado às ${updated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Atualizando"}</span><Button variant="ghost" size="icon" title="Sair da conta" aria-label="Sair da conta" className="lg:hidden" onClick={() => supabase.auth.signOut()}><LogOut /></Button><span title={email} className="hidden size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold lg:flex">{initials}</span></div></header>
      <main className="panel-enter mx-auto max-w-7xl px-5 py-8 sm:px-9 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Central de compras</p><h1 className="font-display text-4xl font-bold sm:text-5xl">Painel de pedidos</h1><p className="mt-2 text-sm text-muted-foreground">Peças, prioridades e entregas em um só lugar.</p></div><Button variant="outline" disabled={refreshing} onClick={carregar} className="h-10 bg-card"><RefreshCw className={refreshing ? "animate-spin" : ""} />Atualizar</Button></div>
        <section aria-label="Resumo dos pedidos" className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">{STATUS_ORDER.map(s => { const Icon = statusIcons[s]; return <Button key={s} variant="outline" aria-pressed={filtro === s} onClick={() => setFiltro(filtro === s ? "todos" : s)} className={`h-32 items-start justify-between whitespace-normal bg-card p-5 text-left shadow-none hover:bg-card ${filtro === s ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"}`}><div className="flex h-full flex-col justify-between"><span className="text-sm text-muted-foreground">{STATUS_LABELS[s]}</span><span className="font-display text-4xl font-semibold tabular-nums">{pedidos === null ? "—" : contagem[s]}</span></div><span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${statusClass[s]}`}><Icon /></span></Button>; })}</section>
        {criticos > 0 && <div className="mb-6 flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertTriangle className="size-5 shrink-0" /><span>{criticos} {criticos === 1 ? "pedido crítico em aberto" : "pedidos críticos em aberto"}</span></div>}
        <section aria-label="Lista de pedidos">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><h2 className="font-display text-2xl font-semibold">{filtro === "todos" ? "Todos os pedidos" : STATUS_LABELS[filtro]}</h2><span className="rounded-md border bg-card px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{lista.length}</span>{filtro !== "todos" && <Button variant="ghost" size="sm" onClick={() => setFiltro("todos")}>Ver todos</Button>}</div><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Buscar pedidos" placeholder="Buscar peça, máquina ou código..." value={busca} onChange={e => setBusca(e.target.value)} className="h-10 bg-card pl-9" /></div></div>
          <div className="border-y bg-card">
            <div className="hidden grid-cols-[2fr_1.4fr_0.8fr_1fr_0.8fr_20px] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-semibold text-muted-foreground xl:grid"><span>PEÇA / REFERÊNCIA</span><span>EQUIPAMENTO</span><span>PRIORIDADE</span><span>STATUS</span><span>DATA</span><span /></div>
            {loadError && pedidos === null ? <div className="py-20 text-center"><AlertTriangle className="mx-auto mb-4 size-8 text-destructive" /><h3 className="text-xl font-semibold">Não foi possível carregar</h3><Button variant="outline" onClick={carregar} className="mt-5"><RefreshCw />Tentar novamente</Button></div> : pedidos === null ? <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Carregando pedidos...</div> : lista.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center px-5 py-14 text-center sm:min-h-80"><div className="relative mb-6 flex size-20 items-center justify-center rounded-full bg-muted/60"><Inbox className="size-9 stroke-1 text-muted-foreground" />{!busca && filtro === "todos" && <CircleCheck className="absolute bottom-0 right-0 size-6 rounded-full bg-card text-success" />}</div><h3 className="font-display text-2xl font-semibold">{pedidos.length === 0 ? "Nenhum pedido por enquanto" : "Nenhum pedido encontrado"}</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">{pedidos.length === 0 ? "Os pedidos recebidos aparecerão aqui." : "Não há pedidos correspondentes à sua busca."}</p>{(busca || filtro !== "todos") && <Button variant="outline" className="mt-5" onClick={() => { setBusca(""); setFiltro("todos"); }}>Limpar filtros</Button>}</div> : <ul className="divide-y">{lista.map(p => <li key={p.id}><Button variant="ghost" onClick={() => setAberto(p)} className="grid h-auto w-full grid-cols-2 gap-3 rounded-none px-5 py-5 text-left hover:bg-muted/40 xl:grid-cols-[2fr_1.4fr_0.8fr_1fr_0.8fr_20px] xl:gap-4"><div className="min-w-0 whitespace-normal"><p className="font-semibold">{p.part_name}</p><p className="mt-1 text-xs text-muted-foreground">{p.reference_code || "Sem referência"}</p></div><div className="min-w-0 whitespace-normal text-sm"><p>{p.equipment}</p><p className="mt-1 text-xs text-muted-foreground">{p.serial_number || "—"}</p></div><div><Chip className={urgencyClass[p.urgency]}>{URGENCY_LABELS[p.urgency]}</Chip></div><div><Chip className={statusClass[p.status]}>{STATUS_LABELS[p.status]}</Chip></div><span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span><ChevronRight className="ml-auto text-muted-foreground" /></Button></li>)}</ul>}
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs text-muted-foreground"><span>{lista.length} {lista.length === 1 ? "pedido" : "pedidos"}</span><span className="flex items-center gap-1.5"><RefreshCw className="size-3" />Atualização automática</span></div>
        </section>
      </main>
      <Dialog open={!!aberto} onOpenChange={open => { if (!open) setAberto(null); }}><DialogContent className="max-h-[90svh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg bg-card sm:max-w-xl">{aberto && <><DialogHeader><div className="mb-3 flex gap-2"><Chip className={urgencyClass[aberto.urgency]}>{URGENCY_LABELS[aberto.urgency]}</Chip><Chip className={statusClass[aberto.status]}>{STATUS_LABELS[aberto.status]}</Chip></div><DialogTitle className="pr-5 font-display text-3xl">{aberto.part_name}</DialogTitle><DialogDescription>{aberto.equipment}</DialogDescription></DialogHeader>{aberto.photo_data_url ? <img src={aberto.photo_data_url} alt="Foto da peça" className="max-h-64 w-full rounded-md object-contain" /> : <div className="flex h-24 items-center justify-center gap-2 rounded-md bg-muted/60 text-sm text-muted-foreground"><Package className="size-5" />Sem foto da peça</div>}<dl className="grid grid-cols-2 gap-4 border-b pb-5 text-sm">{[["Nº de série", aberto.serial_number || "—"], ["Código de referência", aberto.reference_code || "—"], ["Aberto em", new Date(aberto.created_at).toLocaleString("pt-BR")], ["Atualizado em", new Date(aberto.updated_at).toLocaleString("pt-BR")]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="mb-1 text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}</dl><div><h3 className="mb-2 text-sm font-semibold">Descrição da solicitação</h3><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{aberto.symptoms || "Sem descrição."}</p></div><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setAberto(null)}>Fechar</Button>{proximo && <Button disabled={saving} onClick={() => avancar(aberto, proximo)} className="h-auto min-h-9 whitespace-normal py-2">Marcar como {STATUS_LABELS[proximo]}{saving ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}</Button>}</div></>}</DialogContent></Dialog>
    </div>
  );
}
