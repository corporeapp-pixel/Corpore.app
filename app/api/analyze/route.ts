import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GOAL_LABELS: Record<string, string> = {
  perder_gordura: "perder gordura",
  ganhar_massa: "ganhar massa muscular",
  recomposicao: "recomposição corporal",
  manter: "manter o peso atual",
  performance: "melhorar performance atlética",
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
  }
  try {
    const formData = await request.formData();
    const weight = formData.get("weight");
    const height = formData.get("height");
    const waist = formData.get("waist");
    const age = formData.get("age");
    const gender = formData.get("gender");
    const goal = formData.get("goal") as string;
    const front = formData.get("front") as string;
    const side = formData.get("side") as string;
    const back = formData.get("back") as string;

    if (!weight || !height || !waist || !goal || !front || !side || !back) {
      return NextResponse.json({ error: "Todos os campos e fotos são obrigatórios" }, { status: 400 });
    }

    const clean = (s: string) => s.replace(/\s/g, "");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: clean(front) } },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: clean(side) } },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: clean(back) } },
          { type: "text", text: `Analise estas 3 fotos corporais. Dados: peso ${weight}kg, altura ${height}cm, cintura ${waist}cm${age ? `, idade ${age}` : ""}${gender ? `, sexo ${gender}` : ""}, objetivo: ${GOAL_LABELS[goal] || goal}. Responda APENAS com JSON válido sem markdown:\n{"body_fat_range":"x-y%","physique_summary":"...","strengths":["..."],"weaknesses":["..."],"weekly_forecast":"...","training_recommendation":["..."],"nutrition_recommendation":["..."],"fitness_score":0-100,"posture_notes":"...","body_type":"..."}` }
        ]
      }]
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    return NextResponse.json(JSON.parse(match[0]));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
