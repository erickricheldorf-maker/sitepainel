import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Endpoint the store site calls to register a new order. Public by design:
// it only inserts with validated fields and always forces status "pendente".
const schema = z.object({
  equipment: z.string().trim().min(1).max(200),
  serialNumber: z.string().trim().max(120).default(""),
  partName: z.string().trim().min(1).max(200),
  referenceCode: z.string().trim().max(120).default(""),
  photoDataUrl: z
    .string()
    .max(4_000_000)
    .regex(/^data:image\//)
    .nullable()
    .optional(),
  urgency: z.enum(["baixa", "media", "critica"]),
  symptoms: z.string().trim().max(2000).default(""),
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/pedidos")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400, headers: cors });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Dados inválidos", details: parsed.error.flatten() },
            { status: 400, headers: cors },
          );
        }
        const d = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("pedidos")
          .insert({
            equipment: d.equipment,
            serial_number: d.serialNumber,
            part_name: d.partName,
            reference_code: d.referenceCode,
            photo_data_url: d.photoDataUrl ?? null,
            urgency: d.urgency,
            symptoms: d.symptoms,
          })
          .select("id, status, created_at")
          .single();
        if (error) {
          console.error(error);
          return Response.json({ error: "Falha ao salvar" }, { status: 500, headers: cors });
        }
        return Response.json(data, { status: 201, headers: cors });
      },
    },
  },
});
