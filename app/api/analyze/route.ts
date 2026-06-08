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
  const body = await request.json();
  const { weight, height, waist, age, gender, goal, images } = body;
  if (!weight || !height || !waist || !goal || !images?.front || !images?.side || !images?.back) {
    return NextResponse.json({ error: "Todos os campos e fotos são obrigatórios" }, { status: 400 });
  }
  const toBase64 = (dataUrl: string) => dataUrl.split(",")[1];
  const toMime = (dataUrl: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" => {
    const m = dataUrl.match(/data:([^;]+);/);
    const t = m?.[1] || "image/jpeg";
    if (t === "image/png") return "image/png";
    if (t === "image/webp") return "image/webp";
    if (t === "image/gif") return "image/gif";
    return "image/jpeg";
  };
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: toMime(images.front), data: toBase64(images.front) } },
          { type: "image", source: { type: "base64", media_type: toMime(images.side), data: toBase64(images.side) } },
          { type: "image", source: { type: "base64", media_type: toMime(images.back), data: toBase64(images.back) } },
          { type: "text", text: `Analise estas 3 fotos corporais. Dados: peso ${weight}kg, altura ${height}cm, cintura ${waist}cm${age ? `, idade ${age}` : ""}${gender ? `, sexo ${gender}` : ""}, objetivo: ${GOAL_LABELS[goal] || goal}. Responda APENAS com JSON válido sem markdown:\n{"body_fat_range":"x-y%","physique_summary":"...","strengths":["..."],"weaknesses":["..."],"weekly_forecast":"...","training_recommendation":["..."],"nutrition_recommendation":["..."],"fitness_score":0-100,"posture_notes":"...","body_type":"..."}` }
        ]
      }]
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
