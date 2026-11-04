import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import workshop from "@/assets/workshop.jpg";

export function PanelLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) toast.error("E-mail ou senha incorretos.");
    } catch {
      toast.error("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-scene relative flex min-h-svh flex-col bg-sidebar text-sidebar-foreground">
      <img src={workshop} alt="Oficina de manutenção industrial" width={1536} height={1024} className="absolute inset-0 h-full w-full object-cover" />
      <div className="login-shade absolute inset-0" />
      <header className="relative flex items-center gap-3 p-6 sm:p-10">
        <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground"><Wrench className="size-5" /></span>
        <div><p className="font-display text-xl font-bold uppercase">Central de manutenção</p><p className="text-xs text-sidebar-muted">Gestão de peças e suprimentos</p></div>
      </header>
      <div className="relative flex flex-1 items-center px-6 py-12 sm:px-16 lg:px-24">
        <div className="w-full max-w-md">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-primary"><span className="h-px w-8 bg-primary" /> Acesso do comprador</div>
          <h1 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">Painel de<br />pedidos<span className="text-primary">.</span></h1>
          <p className="mb-9 mt-4 text-base text-sidebar-muted">Tudo pronto para a próxima etapa.</p>
          <form onSubmit={submit} className="space-y-5">
            <div><label htmlFor="email" className="mb-2 block text-sm font-medium">E-mail</label><Input id="email" type="email" autoComplete="username" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 border-sidebar-border bg-sidebar/70 text-sidebar-foreground placeholder:text-sidebar-muted focus-visible:ring-primary" /></div>
            <div><label htmlFor="password" className="mb-2 block text-sm font-medium">Senha</label><div className="relative"><Input id="password" type={visible ? "text" : "password"} autoComplete="current-password" required placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 border-sidebar-border bg-sidebar/70 pr-12 text-sidebar-foreground placeholder:text-sidebar-muted focus-visible:ring-primary" /><Button type="button" variant="ghost" size="icon" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} title={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible(!visible)} className="absolute right-2 top-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground">{visible ? <EyeOff /> : <Eye />}</Button></div></div>
            <Button type="submit" disabled={loading} className="h-12 w-full justify-between px-5 text-base">{loading ? "Entrando..." : "Entrar no painel"}{loading ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}</Button>
          </form>
          <div className="mt-6 flex items-center gap-2 text-xs text-sidebar-muted"><LockKeyhole className="size-3.5" /> Acesso restrito à equipe de compras</div>
        </div>
      </div>
      <footer className="relative flex justify-between gap-4 border-t border-sidebar-border px-6 py-5 text-xs text-sidebar-muted sm:px-10"><span>Manutenção & suprimentos</span><span>Área da equipe</span></footer>
    </main>
  );
}