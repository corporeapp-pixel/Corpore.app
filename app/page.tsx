"use client";

import { useState, useRef, useCallback } from "react";

interface AnalysisResult {
  body_fat_range: string;
  physique_summary: string;
  strengths: string[];
  weaknesses: string[];
  weekly_forecast: string;
  training_recommendation: string[];
  nutrition_recommendation: string[];
  fitness_score: number;
  posture_notes?: string;
  body_type?: string;
}

interface Photos {
  frontal: File | null;
  lateral: File | null;
  posterior: File | null;
}

const GOALS = [
  { value: "perder_gordura", label: "Perder Gordura" },
  { value: "ganhar_massa", label: "Ganhar Massa Muscular" },
  { value: "recomposicao", label: "Recomposição Corporal" },
  { value: "manter", label: "Manter Peso Atual" },
  { value: "performance", label: "Melhorar Performance" },
];

const LOADING_MSGS = [
  "Analisando composição corporal...",
  "Identificando pontos fortes...",
  "Gerando recomendações personalizadas...",
  "Calculando Fitness Score...",
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = () => rej(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });
}

function CorporeLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#0c0c0c" stroke="#c8f645" strokeWidth="2" />
      <defs>
        <linearGradient id="grad" x1="20" y1="20" x2="70" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d4f040" /><stop offset="1" stopColor="#7ec820" />
        </linearGradient>
      </defs>
      <path d="M67 27C54 22 34 25 27 40C20 55 26 72 41 77C53 81 67 75 67 75L62 67C50 72 38 67 34 57C30 47 35 36 44 32C53 28 62 32 62 32Z" fill="url(#grad)" />
      <rect x="21" y="46" width="30" height="5" rx="2.5" fill="url(#grad)" />
      <rect x="17" y="54" width="26" height="3.5" rx="1.75" fill="url(#grad)" />
    </svg>
  );
}

const Icons = {
  upload: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  photo: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  x: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  check: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c8f645" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  lock: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  refresh: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
  warn: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  up: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
  down: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></svg>,
  calendar: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  dumbbell: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 5v14M18 5v14M6 8H2M6 16H2M22 8h-4M22 16h-4M10 12h4" /></svg>,
  food: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /></svg>,
  posture: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="22" /><path d="M8 6l4-4 4 4" /><path d="M8 18l4 4 4-4" /></svg>,
  body: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="2" /><path d="M12 7v8" /><path d="M8 10h8" /><path d="M9 15l-1 4" /><path d="M15 15l1 4" /></svg>,
};

function ScoreRing({ score }: { score: number }) {
  const r = 52, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#c8f645" : score >= 40 ? "#fb923c" : "#f87171";
  const label = score >= 80 ? "Excelente" : score >= 60 ? "Bom" : score >= 40 ? "Regular" : "Iniciante";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 136, height: 136 }}>
        <svg width="136" height="136" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx="68" cy="68" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.34,1.56,0.64,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 38, fontWeight: 800, color, fontFamily: "'Barlow Condensed',sans-serif", lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: 2, textTransform: "uppercase" }}>/100</span>
        </div>
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function PhotoZone({ label, sub, file, onFile }: { label: string; sub: string; file: File | null; onFile: (f: File | null) => void }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : null;
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) onFile(f);
  }, [onFile]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div>
        <div style={{ fontSize: 10, color: "#f5f5f5", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>{sub}</div>
      </div>
      <div onClick={() => ref.current?.click()} onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        style={{
          aspectRatio: "3/4", borderRadius: 14, cursor: "pointer", overflow: "hidden", position: "relative",
          border: `1.5px dashed ${drag ? "#c8f645" : file ? "rgba(200,246,69,0.4)" : "rgba(255,255,255,0.1)"}`,
          background: drag ? "rgba(200,246,69,0.05)" : file ? "rgba(200,246,69,0.03)" : "rgba(255,255,255,0.02)",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
        }}>
        {preview ? (
          <>
            <img src={preview} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button onClick={e => { e.stopPropagation(); onFile(null); }}
              style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%",
                background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {Icons.x}
            </button>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 10px 10px",
              background: "linear-gradient(transparent,rgba(0,0,0,0.85))",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {Icons.check}
              <span style={{ color: "#c8f645", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>OK</span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 16, color: "rgba(255,255,255,0.38)" }}>
            {Icons.photo}
            <p style={{ margin: "10px 0 0", fontSize: 10 }}>Arraste ou clique</p>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </div>
    </div>
  );
}

function TagList({ items, dot }: { items: string[]; dot: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {(items || []).map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 7 }} />
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function SHead({ icon, label, color = "rgba(255,255,255,0.38)" }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: 10, color, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
    </div>
  );
}

function Card({ children, bg = "rgba(255,255,255,0.03)", border = "rgba(255,255,255,0.07)", style = {} }: {
  children: React.ReactNode; bg?: string; border?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: bg, borderRadius: 18, padding: 24, border: `1px solid ${border}`, ...style }}>
      {children}
    </div>
  );
}

function Results({ data, onReset }: { data: AnalysisResult; onReset: () => void }) {
  return (
    <div style={{ animation: "fadeUp 0.5s ease forwards" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>ANÁLISE CORPORAL</h2>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.38)", fontSize: 13 }}>
            Gerada por IA · {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={onReset} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
          borderRadius: 100, border: "1px solid rgba(255,255,255,0.07)", background: "transparent",
          color: "rgba(255,255,255,0.65)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          {Icons.refresh} Nova análise
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <ScoreRing score={data.fitness_score || 0} />
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>% Gordura Est.</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#c8f645", fontFamily: "'Barlow Condensed',sans-serif" }}>{data.body_fat_range || "—"}</div>
          </Card>
          {data.body_type && (
            <Card style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Tipo Corporal</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f5f5f5", fontFamily: "'Barlow Condensed',sans-serif" }}>{data.body_type.toUpperCase()}</div>
            </Card>
          )}
        </div>
        {data.posture_notes && (
          <Card bg="rgba(200,246,69,0.05)" border="rgba(200,246,69,0.12)">
            <SHead icon={Icons.posture} label="Postura" color="rgba(200,246,69,0.6)" />
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>{data.posture_notes}</p>
          </Card>
        )}
      </div>
      <Card style={{ marginBottom: 14 }}>
        <SHead icon={Icons.body} label="Resumo Físico" />
        <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, fontSize: 14 }}>{data.physique_summary}</p>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Card bg="rgba(74,222,128,0.04)" border="rgba(74,222,128,0.12)">
          <SHead icon={Icons.up} label="Pontos Fortes" color="rgba(74,222,128,0.7)" />
          <TagList items={data.strengths} dot="#4ade80" />
        </Card>
        <Card bg="rgba(251,146,60,0.04)" border="rgba(251,146,60,0.12)">
          <SHead icon={Icons.down} label="A Melhorar" color="rgba(251,146,60,0.7)" />
          <TagList items={data.weaknesses} dot="#fb923c" />
        </Card>
      </div>
      <div style={{ background: "linear-gradient(135deg,rgba(200,246,69,0.07),rgba(200,246,69,0.02))",
        borderRadius: 18, padding: 24, border: "1px solid rgba(200,246,69,0.14)", marginBottom: 14 }}>
        <SHead icon={Icons.calendar} label="Previsão 4–8 Semanas" color="rgba(200,246,69,0.6)" />
        <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, fontSize: 14 }}>{data.weekly_forecast}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <SHead icon={Icons.dumbbell} label="Treino Recomendado" />
          <TagList items={data.training_recommendation} dot="#c8f645" />
        </Card>
        <Card>
          <SHead icon={Icons.food} label="Nutrição Recomendada" />
          <TagList items={data.nutrition_recommendation} dot="#c8f645" />
        </Card>
      </div>
    </div>
  );
}

function LoadingScreen({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: "center", padding: "100px 0" }}>
      <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 36px" }}>
        <svg width="80" height="80" style={{ animation: "spin 1.2s linear infinite" }}>
          <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(200,246,69,0.12)" strokeWidth="6" />
          <circle cx="40" cy="40" r="35" fill="none" stroke="#c8f645" strokeWidth="6"
            strokeDasharray="28 192" strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CorporeLogo size={28} />
        </div>
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, marginBottom: 10 }}>{msg}</h3>
      <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 13 }}>Isso pode levar alguns segundos</p>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "13px 16px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)",
  color: "#f5f5f5", fontSize: 15, outline: "none", boxSizing: "border-box",
  fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s",
};

export default function Home() {
  const [step, setStep] = useState<"form" | "loading" | "results" | "error">("form");
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [weight,setWeight]=useState("");
  const [height,setHeight]=useState("");
  const [waist,setWaist]=useState("");
  const [age,setAge]=useState("");
  const [gender,setGender]=useState("");
  const [goal,setGoal]=useState("");
  const [photos,setPhotos]=useState<Photos>({frontal:null,lateral:null,posterior:null});

  const valid=weight&&height&&waist&&goal&&photos.frontal&&photos.lateral&&photos.posterior;
  const imc=weight&&height?(parseFloat(weight)/Math.pow(parseFloat(height)/100,2)).toFixed(1):null;
  const photoCount=Object.values(photos).filter(Boolean).length;

  const submit=async()=>{
    setStep("loading");let i=0;
    const iv=setInterval(()=>{if(i<LOADING_MSGS.length-1)setLoadingMsg(LOADING_MSGS[++i]);},2800);
    try {
      const [frontUrl,sideUrl,backUrl]=await Promise.all([fileToDataUrl(photos.frontal!),fileToDataUrl(photos.lateral!),fileToDataUrl(photos.posterior!)]);
      const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({weight:parseFloat(weight),height:parseFloat(height),waist:parseFloat(waist),age:age?parseInt(age):undefined,gender:gender||undefined,goal,images:{front:frontUrl,side:sideUrl,back:backUrl}})});
      clearInterval(iv);
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||`Erro ${res.status}`);
      setResults(data);setStep("results");
    } catch(err){clearInterval(iv);setErrorMsg(err instanceof Error?err.message:"Erro inesperado");setStep("error");}
  };

  const reset=()=>{setStep("form");setResults(null);setErrorMsg("");setWeight("");setHeight("");setWaist("");setAge("");setGender("");setGoal("");setPhotos({frontal:null,lateral:null,posterior:null});};

  return (
    <div style={{minHeight:"100vh",background:"#0c0c0c",color:"#f5f5f5",paddingBottom:80}}>
      <nav style={{padding:"0 40px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.07)",position:"sticky",top:0,background:"rgba(12,12,12,0.93)",backdropFilter:"blur(20px)",zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <CorporeLogo size={36}/>
          <svg width="130" height="20" viewBox="0 0 260 40" fill="none"><text x="0" y="34" fontFamily="'Barlow Condensed','Arial Narrow',sans-serif" fontSize="42" fontWeight="700" letterSpacing="4" fill="#f5f5f5">CORPORE</text><rect x="219" y="17" width="24" height="3.5" rx="1.5" fill="#c8f645"/><rect x="219" y="24" width="18" height="3" rx="1.5" fill="#c8f645"/></svg>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase"}}>FITNESS · NUTRITION · INTELLIGENCE</span>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#c8f645",boxShadow:"0 0 8px #c8f645"}}/>
        </div>
      </nav>
      <div style={{maxWidth:920,margin:"0 auto",padding:"52px 24px 0"}}>
        {step==="form"&&(<>
          <div style={{marginBottom:44,animation:"fadeIn 0.5s ease"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:100,background:"rgba(200,246,69,0.08)",border:"1px solid rgba(200,246,69,0.18)",marginBottom:20}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#c8f645",boxShadow:"0 0 6px #c8f645"}}/>
              <span style={{fontSize:11,color:"#c8f645",fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Análise Corporal com IA</span>
            </div>
            <h1 style={{fontSize:"clamp(38px,5.5vw,62px)",fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1.05,letterSpacing:-1,marginBottom:16}}>SEU CORPO.<br/><span style={{color:"#c8f645"}}>ANALISADO EM SEGUNDOS.</span></h1>
            <p style={{color:"rgba(255,255,255,0.38)",fontSize:15,maxWidth:480,lineHeight:1.7}}>Envie 3 fotos corporais, informe seus dados e receba análise detalhada de composição corporal, postura, treino e nutrição personalizada.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div style={{background:"#141414",borderRadius:22,padding:32,border:"1px solid rgba(255,255,255,0.07)"}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,0.38)",marginBottom:26}}>Dados Corporais</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:7,fontWeight:600}}>Peso (kg)</label><input type="number" placeholder="70" value={weight} onChange={e=>setWeight(e.target.value)} style={inp}/></div>
                <div><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:7,fontWeight:600}}>Altura (cm)</label><input type="number" placeholder="170" value={height} onChange={e=>setHeight(e.target.value)} style={inp}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:7,fontWeight:600}}>Cintura (cm)</label><input type="number" placeholder="80" value={waist} onChange={e=>setWaist(e.target.value)} style={inp}/></div>
                <div><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:7,fontWeight:600}}>Idade</label><input type="number" placeholder="25" value={age} onChange={e=>setAge(e.target.value)} style={inp}/></div>
              </div>
              <div style={{marginBottom:14}}><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:7,fontWeight:600}}>Sexo</label><select value={gender} onChange={e=>setGender(e.target.value)} style={{...inp,appearance:"none",cursor:"pointer"}}><option value="">Prefiro não informar</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option></select></div>
              <div style={{marginBottom:20}}><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:7,fontWeight:600}}>Objetivo *</label><select value={goal} onChange={e=>setGoal(e.target.value)} style={{...inp,appearance:"none",cursor:"pointer"}}><option value="">Selecione seu objetivo</option>{GOALS.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
              {imc&&<div style={{padding:"11px 16px",borderRadius:10,background:"rgba(200,246,69,0.06)",border:"1px solid rgba(200,246,69,0.12)",marginBottom:22,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:12,color:"rgba(255,255,255,0.38)"}}>IMC calculado</span><span style={{fontSize:17,fontWeight:800,color:"#c8f645",fontFamily:"'Barlow Condensed',sans-serif"}}>{imc}</span></div>}
              <button onClick={submit} disabled={!valid} style={{width:"100%",padding:"15px",borderRadius:12,border:"none",background:valid?"#c8f645":"rgba(255,255,255,0.05)",color:valid?"#0c0c0c":"rgba(255,255,255,0.18)",fontSize:13,fontWeight:700,cursor:valid?"pointer":"not-allowed",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2,textTransform:"uppercase",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                {valid?<>{Icons.upload} ANALISAR MEU CORPO</>:"PREENCHA OS CAMPOS OBRIGATÓRIOS"}
              </button>
            </div>
            <div style={{background:"#141414",borderRadius:22,padding:32,border:"1px solid rgba(255,255,255,0.07)"}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,0.38)",marginBottom:8}}>Fotos Corporais</div>
              <p style={{fontSize:12,color:"rgba(255,255,255,0.25)",marginBottom:22,lineHeight:1.65}}>Use roupas justas. Boa iluminação e fundo neutro resultam em análises mais precisas.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:18}}>
                <PhotoZone label="Frontal" sub="De frente" file={photos.frontal} onFile={f=>setPhotos(p=>({...p,frontal:f}))}/>
                <PhotoZone label="Lateral" sub="De lado" file={photos.lateral} onFile={f=>setPhotos(p=>({...p,lateral:f}))}/>
                <PhotoZone label="Posterior" sub="De costas" file={photos.posterior} onFile={f=>setPhotos(p=>({...p,posterior:f}))}/>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {(["frontal","lateral","posterior"] as const).map(k=>(
                  <div key={k} style={{flex:1,height:3,borderRadius:3,background:photos[k]?"#c8f645":"rgba(255,255,255,0.07)",transition:"background 0.3s"}}/>
                ))}
              </div>
              <p style={{fontSize:11,color:"rgba(255,255,255,0.38)",textAlign:"center",marginBottom:16}}>{photoCount} de 3 fotos selecionadas</p>
              <div style={{padding:"11px 14px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:8}}>
                <span style={{color:"rgba(255,255,255,0.38)"}}>{Icons.lock}</span>
                <p style={{fontSize:11,color:"rgba(255,255,255,0.22)",margin:0}}>Suas fotos são processadas pela IA e não são armazenadas.</p>
              </div>
            </div>
          </div>
        </>)}
        {step==="loading"&&<LoadingScreen msg={loadingMsg}/>}
        {step==="results"&&results&&<Results data={results} onReset={reset}/>}
        {step==="error"&&(
          <div style={{textAlign:"center",padding:"90px 0",animation:"fadeIn 0.4s ease"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 28px"}}>{Icons.warn}</div>
            <h3 style={{fontSize:22,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",marginBottom:12,letterSpacing:1}}>ALGO DEU ERRADO</h3>
            <p style={{color:"rgba(255,255,255,0.38)",marginBottom:36,maxWidth:480,margin:"0 auto 36px",lineHeight:1.65,fontSize:13}}>{errorMsg}</p>
            <button onClick={reset} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"13px 28px",borderRadius:100,border:"1px solid rgba(200,246,69,0.25)",background:"rgba(200,246,69,0.07)",color:"#c8f645",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1.5,textTransform:"uppercase"}}>
              {Icons.refresh} TENTAR NOVAMENTE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// refresh Sun Jun  7 23:16:55 UTC 2026
