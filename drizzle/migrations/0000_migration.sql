CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment text NOT NULL,
  serial_number text NOT NULL DEFAULT '',
  part_name text NOT NULL,
  reference_code text NOT NULL DEFAULT '',
  photo_data_url text,
  urgency text NOT NULL DEFAULT 'media' CHECK (urgency IN ('baixa','media','critica')),
  symptoms text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','cotacao','comprado','entregue')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "painel le pedidos" ON public.pedidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "painel muda status" ON public.pedidos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.pedidos (equipment, serial_number, part_name, reference_code, urgency, symptoms, status, created_at, updated_at) VALUES
('Prensa hidráulica PH-04','PH4-2019-00873','Vedação do cilindro principal','VED-CIL-150','critica','Vazamento de óleo no cilindro, pressão caindo durante o ciclo. Máquina parada.','cotacao', now()-interval '2 days', now()-interval '2 days'),
('Esteira transportadora L2','EST-L2-7721','Rolamento 6205-2RS','SKF-6205-2RS','media','Ruído metálico constante na polia de retorno, aumento de temperatura.','pendente', now()-interval '1 day', now()-interval '1 day'),
('Compressor de ar CP-01','CP01-XK-4410','Filtro de ar da admissão','FLT-AR-90','baixa','Troca preventiva programada. Filtro com acúmulo de poeira visível.','entregue', now()-interval '6 days', now()-interval '3 days'),
('Torno CNC T-12','TCNC-T12-0358','Correia dentada do fuso','','critica','Correia rompeu durante a usinagem. Eixo travado, linha de produção parada.','comprado', now()-interval '3 days', now()-interval '1 day');