import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GOAL_LABELS: Record<string, string> = {
  perder_gordura: "perder gordura",
  ganhar_massa_muscular: "ganhar massa muscular",
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
    const frontFile = formData.get("front") as File;
    const sideFile = formData.get("side") as File;
    const backFile = formData.get("back") as File;

    if (!weight || !height || !waist || !goal || !frontFile || !sideFile || !backFile) {
      return NextResponse.json({ error: "Todos os campos e fotos são obrigatórios" }, { status: 400 });
    }

    const toBase64 = async (file: File) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      return buffer.toString("base64");
    };

    const getMediaType = (file: File): "image/jpeg" | "image/png" | "image/gif" | "image/webp" => {
      const t = file.type.toLowerCase();
      if (t === "image/png") return "image/png";
      if (t === "image/gif") return "image/gif";
      if (t === "image/webp") return "image/webp";
      return "image/jpeg";
    };

    const [f1, f2, f3] = await Promise.all([toBase64(frontFile), toBase64(sideFile), toBase64(backFile)]);
    const [m1, m2, m3] = [getMediaType(frontFile), getMediaType(sideFile), getMediaType(backFile)];

    const imc = weight && height ? (parseFloat(weight as string) / Math.pow(parseFloat(height as string) / 100, 2)).toFixed(1) : null;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: m1, data: f1 } },
          { type: "image", source: { type: "base64", media_type: m2, data: f2 } },
          { type: "image", source: { type: "base64", media_type: m3, data: f3 } },
          { type: "text", text: `Analise estas 3 fotos corporais. Dados: peso ${weight}kg, altura ${height}cm, cintura ${waist}cm${age ? `, idade ${age}` : ""}, sexo ${gender || ""}, objetivo: ${GOAL_LABELS[goal] || goal}. Responda APENAS com JSON válido sem markdown:\n{"body_fat_range":"x-y%","physique_summary":"...","strengths":["..."],"weaknesses":["..."],"weekly_forecast":"...","training_recommendation":["..."],"nutrition_recommendation":["..."],"fitness_score":0-100,"posture_notes":"...","body_type":"..."}` }
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
