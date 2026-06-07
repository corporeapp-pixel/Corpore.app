import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GOAL_LABELS: Record<string, string> = {
  perder_gordura: "Perder gordura corporal",
  ganhar_massa: "Ganhar massa muscular",
  recomposicao: "Recomposição corporal",
  manter: "Manter peso atual",
  performance: "Melhorar performance atlética",
};

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
    }
    const body = await request.json();
    const { weight, height, waist, age, gender, goal, images } = body;
    if (!weight || !height || !waist || !goal || !images?.front || !images?.side || !images?.back) {
      return NextResponse.json({ error: "Todos os campos e fotos são obrigatórios" }, { status: 400 });
    }
    const extractBase64 = (dataUrl: string) => ({
      data: dataUrl.split(",")[1],
      mediaType: dataUrl.split(";")[0].split(":")[1] as "image/jpeg" | "image/png" | "image/webp",
    });
    const front = extractBase64(images.front);
    const side = extractBase64(images.side);
    const back = extractBase64(images.back);
    const imc = (weight / Math.pow(height / 100, 2)).toFixed(1);

    const prompt = `Você é um especialista em análise corporal e fisiologia do exercício. Analise as 3 fotos (frontal, lateral, posterior) e os dados abaixo.

Dados: Peso ${weight}kg | Altura ${height}cm | IMC ${imc} | Cintura ${waist}cm${age ? ` | Idade ${age}` : ""}${gender ? ` | Sexo ${gender}` : ""} | Objetivo: ${GOAL_LABELS[goal] || goal}

Retorne APENAS JSON válido, sem texto extra, sem markdown:
{"body_fat_range":"ex: 18-22%","physique_summary":"resumo em 3-4 frases","strengths":["s1","s2","s3","s4"],"weaknesses":["w1","w2","w3","w4"],"weekly_forecast":"previsão 4-8 semanas","training_recommendation":["t1","t2","t3","t4","t5"],"nutrition_recommendation":["n1","n2","n3","n4","n5"],"fitness_score":65,"posture_notes":"observação de postura","body_type":"tipo corporal"}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", source: { type: "base64", media_type: front.mediaType, data: front.data } },
          { type: "image", source: { type: "base64", media_type: side.mediaType, data: side.data } },
          { type: "image", source: { type: "base64", media_type: back.mediaType, data: back.data } },
        ],
      }],
    });

    const raw = response.content.find((b) => b.type === "text")?.text ?? "";
    let parsed;
    try { parsed = JSON.parse(raw.trim()); }
    catch { const match = raw.match(/\{[\s\S]*\}/); if (!match) throw new Error("JSON não encontrado"); parsed = JSON.parse(match[0]); }
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[Corpore]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
