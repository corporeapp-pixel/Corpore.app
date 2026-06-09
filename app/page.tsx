"use client";
import { useState, useRef, useCallback } from "react";

interface AnalysisResult {
  body_fat_range: string; physique_summary: string; strengths: string[];
  weaknesses: string[]; weekly_forecast: string; training_recommendation: string[];
  nutrition_recommendation: string[]; fitness_score: number;
  posture_notes?: string; body_type?: string;
}
interface Photos { frontal: File|null; lateral: File|null; posterior: File|null; }

const GOALS = [
  {value:"perder_gordura",label:"Perder Gordura"},
  {value:"ganhar_massa",label:"Ganhar Massa Muscular"},
  {value:"recomposicao",label:"Recomposição Corporal"},
  {value:"manter",label:"Manter Peso Atual"},
  {value:"performance",label:"Melhorar Performance"},
];
const LOADING_MSGS = ["Analisando composição corporal...","Identificando pontos fortes...","Gerando recomendações personalizadas...","Calculando Fitness Score..."];

function CorporeLogo({size=36}:{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="48" fill="#0c0c0c" stroke="#c8f645" strokeWidth="2"/>
    <defs><linearGradient id="g" x1="20" y1="20" x2="70" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#d4f040"/><stop offset="1" stopColor="#7ec820"/></linearGradient></defs>
    <path d="M67 27C54 22 34 25 27 40C20 55 26 72 41 77C53 81 67 75 67 75L62 67C50 72 38 67 34 57C30 47 35 36 44 32C53 28 62 32 62 32Z" fill="url(#g)"/>
    <rect x="21" y="46" width="30" height="5" rx="2.5" fill="url(#g)"/>
    <rect x="17" y="54" width="26" height="3.5" rx="1.75" fill="url(#g)"/>
  </svg>;
}

const inp:React.CSSProperties={width:"100%",padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.09)",background:"rgba(255,255,255,0.04)",color:"#f5f5f5",fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"};

function PhotoZone({label,sub,file,onFile}:{label:string;sub:string;file:File|null;onFile:(f:File|null)=>void}) {
  const ref=useRef<HTMLInputElement>(null);
  const preview=file?URL.createObjectURL(file):null;
  return <div style={{display:"flex",flexDirection:"column",gap:6}}>
    <div style={{fontSize:10,color:"#f5f5f5",letterSpacing:1.5,textTransform:"uppercase",fontWeight:700}}>{label}</div>
    <div style={{fontSize:10,color:"rgba(255,255,255,0.38)",marginBottom:4}}>{sub}</div>
    <div onClick={()=>ref.current?.click()} style={{aspectRatio:"3/4",borderRadius:12,cursor:"pointer",overflow:"hidden",position:"relative",border:`1.5px dashed ${file?"rgba(200,246,69,0.4)":"rgba(255,255,255,0.1)"}`,background:file?"rgba(200,246,69,0.03)":"rgba(255,255,255,0.02)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {preview?<>
        <img src={preview} alt={label} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        <button onClick={e=>{e.stopPropagation();onFile(null);}} style={{position:"absolute",top:6,right:6,width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,0.8)",border:"1px solid rgba(255,255,255,0.15)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✕</button>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 8px 8px",background:"linear-gradient(transparent,rgba(0,0,0,0.85))",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
          <span style={{color:"#c8f645",fontSize:10,fontWeight:700}}>✓ OK</span>
        </div>
      </>:<div style={{textAlign:"center",padding:12,color:"rgba(255,255,255,0.38)"}}>
        <div style={{fontSize:24,marginBottom:6}}>📷</div>
        <p style={{margin:0,fontSize:10}}>Toque para adicionar</p>
      </div>}
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)onFile(f);e.target.value="";}}/>
    </div>
  </div>;
}

function ScoreRing({score}:{score:number}) {
  const r=44,circ=2*Math.PI*r,offset=circ-(score/100)*circ;
  const color=score>=80?"#4ade80":score>=60?"#c8f645":score>=40?"#fb923c":"#f87171";
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
    <div style={{position:"relative",width:110,height:110}}>
      <svg width="110" height="110" style={{transform:"rotate(-90deg)"}}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:30,fontWeight:800,color,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1}}>{score}</span>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.38)",letterSpacing:1}}>/100</span>
      </div>
    </div>
    <span style={{fontSize:10,color,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>{score>=80?"Excelente":score>=60?"Bom":score>=40?"Regular":"Iniciante"}</span>
  </div>;
}

function TagList({items,dot}:{items:string[];dot:string}) {
  return <div style={{display:"flex",flexDirection:"column",gap:8}}>
    {(items||[]).map((item,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:8}}>
      <div style={{width:4,height:4,borderRadius:"50%",background:dot,flexShrink:0,marginTop:7}}/>
      <span style={{color:"rgba(255,255,255,0.65)",fontSize:13,lineHeight:1.6}}>{item}</span>
    </div>)}
  </div>;
}

function Results({data,onReset}:{data:AnalysisResult;onReset:()=>void}) {
  const card:React.CSSProperties={background:"rgba(255,255,255,0.03)",borderRadius:16,padding:20,border:"1px solid rgba(255,255,255,0.07)",marginBottom:12};
  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
      <div>
        <h2 style={{margin:0,fontSize:22,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif"}}>ANÁLISE CORPORAL</h2>
        <p style={{margin:"4px 0 0",color:"rgba(255,255,255,0.38)",fontSize:12}}>Gerada por IA · {new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</p>
      </div>
      <button onClick={onReset} style={{padding:"10px 18px",borderRadius:100,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:"rgba(255,255,255,0.65)",cursor:"pointer",fontSize:13}}>↩ Nova análise</button>
    </div>
    <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
      <div style={{...card,flex:"0 0 auto",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:140,marginBottom:0}}><ScoreRing score={data.fitness_score||0}/></div>
      <div style={{...card,flex:1,minWidth:140,marginBottom:0}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>% Gordura Est.</div>
        <div style={{fontSize:28,fontWeight:800,color:"#c8f645",fontFamily:"'Barlow Condensed',sans-serif"}}>{data.body_fat_range||"—"}</div>
        {data.body_type&&<><div style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginTop:12,marginBottom:4}}>Tipo Corporal</div><div style={{fontSize:16,fontWeight:700,color:"#f5f5f5"}}>{data.body_type}</div></>}
      </div>
    </div>
    <div style={card}><div style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Resumo Físico</div><p style={{margin:0,color:"rgba(255,255,255,0.65)",lineHeight:1.7,fontSize:14}}>{data.physique_summary}</p></div>
    {data.posture_notes&&<div style={{...card,background:"rgba(200,246,69,0.05)",border:"1px solid rgba(200,246,69,0.12)"}}><div style={{fontSize:10,color:"rgba(200,246,69,0.6)",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Postura</div><p style={{margin:0,color:"rgba(255,255,255,0.65)",lineHeight:1.7,fontSize:14}}>{data.posture_notes}</p></div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <div style={{...card,background:"rgba(74,222,128,0.04)",border:"1px solid rgba(74,222,128,0.12)",marginBottom:0}}><div style={{fontSize:10,color:"rgba(74,222,128,0.7)",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Pontos Fortes</div><TagList items={data.strengths} dot="#4ade80"/></div>
      <div style={{...card,background:"rgba(251,146,60,0.04)",border:"1px solid rgba(251,146,60,0.12)",marginBottom:0}}><div style={{fontSize:10,color:"rgba(251,146,60,0.7)",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>A Melhorar</div><TagList items={data.weaknesses} dot="#fb923c"/></div>
    </div>
    <div style={{...card,background:"linear-gradient(135deg,rgba(200,246,69,0.07),rgba(200,246,69,0.02))",border:"1px solid rgba(200,246,69,0.14)"}}><div style={{fontSize:10,color:"rgba(200,246,69,0.6)",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Previsão 4–8 Semanas</div><p style={{margin:0,color:"rgba(255,255,255,0.65)",lineHeight:1.7,fontSize:14}}>{data.weekly_forecast}</p></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
      <div style={{...card,marginBottom:0}}><div style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Treino Recomendado</div><TagList items={data.training_recommendation} dot="#c8f645"/></div>
      <div style={{...card,marginBottom:0}}><div style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Nutrição Recomendada</div><TagList items={data.nutrition_recommendation} dot="#c8f645"/></div>
    </div>
  </div>;
}

export default function Home() {
  const [step,setStep]=useState<"form"|"loading"|"results"|"error">("form");
  const [results,setResults]=useState<AnalysisResult|null>(null);
  const [errorMsg,setErrorMsg]=useState("");
  const [loadingMsg,setLoadingMsg]=useState(LOADING_MSGS[0]);
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
      const toB64=(f:File):Promise<string>=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok((r.result as string).replace(/^data:[^,]+,/,""));r.onerror=()=>no(new Error("Erro ao ler foto"));r.readAsDataURL(f);});
      const [f1,f2,f3]=await Promise.all([toB64(photos.frontal!),toB64(photos.lateral!),toB64(photos.posterior!)]);
      const fd=new FormData();
      fd.append("weight",weight);fd.append("height",height);fd.append("waist",waist);
      if(age)fd.append("age",age);if(gender)fd.append("gender",gender);fd.append("goal",goal);
      fd.append("front",f1);fd.append("side",f2);fd.append("back",f3);
      const res=await fetch("/api/analyze",{method:"POST",body:fd});
      clearInterval(iv);
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||`Erro ${res.status}`);
      setResults(data);setStep("results");
    } catch(err){clearInterval(iv);setErrorMsg(err instanceof Error?err.message:"Erro inesperado");setStep("error");}
  };

  const reset=()=>{setStep("form");setResults(null);setErrorMsg("");setWeight("");setHeight("");setWaist("");setAge("");setGender("");setGoal("");setPhotos({frontal:null,lateral:null,posterior:null});};

  return <div style={{minHeight:"100vh",background:"#0c0c0c",color:"#f5f5f5",paddingBottom:80}}>
    <nav style={{padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.07)",position:"sticky",top:0,background:"rgba(12,12,12,0.95)",backdropFilter:"blur(20px)",zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><CorporeLogo size={30}/>
        <span style={{fontSize:18,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2}}>CORPORE</span>
      </div>
      <div style={{width:6,height:6,borderRadius:"50%",background:"#c8f645",boxShadow:"0 0 8px #c8f645"}}/>
    </nav>

    <div style={{maxWidth:600,margin:"0 auto",padding:"28px 16px 0"}}>

      {step==="form"&&<>
        <div style={{marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:100,background:"rgba(200,246,69,0.08)",border:"1px solid rgba(200,246,69,0.18)",marginBottom:16}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:"#c8f645",boxShadow:"0 0 6px #c8f645"}}/>
            <span style={{fontSize:10,color:"#c8f645",fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Análise Corporal com IA</span>
          </div>
          <h1 style={{fontSize:"clamp(32px,8vw,52px)",fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1.05,letterSpacing:-1,marginBottom:12}}>SEU CORPO.<br/><span style={{color:"#c8f645"}}>ANALISADO EM SEGUNDOS.</span></h1>
          <p style={{color:"rgba(255,255,255,0.38)",fontSize:14,lineHeight:1.7,margin:0}}>Envie 3 fotos e receba análise detalhada de composição corporal, treino e nutrição.</p>
        </div>

        <div style={{background:"#141414",borderRadius:20,padding:20,border:"1px solid rgba(255,255,255,0.07)",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,0.38)",marginBottom:20}}>Dados Corporais</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:6,fontWeight:600}}>Peso (kg)</label><input type="number" placeholder="70" value={weight} onChange={e=>setWeight(e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:6,fontWeight:600}}>Altura (cm)</label><input type="number" placeholder="170" value={height} onChange={e=>setHeight(e.target.value)} style={inp}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:6,fontWeight:600}}>Cintura (cm)</label><input type="number" placeholder="80" value={waist} onChange={e=>setWaist(e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:6,fontWeight:600}}>Idade</label><input type="number" placeholder="25" value={age} onChange={e=>setAge(e.target.value)} style={inp}/></div>
          </div>
          <div style={{marginBottom:12}}><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:6,fontWeight:600}}>Sexo</label><select value={gender} onChange={e=>setGender(e.target.value)} style={{...inp,appearance:"none"}}><option value="">Prefiro não informar</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option></select></div>
          <div style={{marginBottom:16}}><label style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:6,fontWeight:600}}>Objetivo *</label><select value={goal} onChange={e=>setGoal(e.target.value)} style={{...inp,appearance:"none"}}><option value="">Selecione seu objetivo</option>{GOALS.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
          {imc&&<div style={{padding:"10px 14px",borderRadius:10,background:"rgba(200,246,69,0.06)",border:"1px solid rgba(200,246,69,0.12)",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:12,color:"rgba(255,255,255,0.38)"}}>IMC calculado</span><span style={{fontSize:18,fontWeight:800,color:"#c8f645",fontFamily:"'Barlow Condensed',sans-serif"}}>{imc}</span></div>}
        </div>

        <div style={{background:"#141414",borderRadius:20,padding:20,border:"1px solid rgba(255,255,255,0.07)",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,0.38)",marginBottom:6}}>Fotos Corporais</div>
          <p style={{fontSize:12,color:"rgba(255,255,255,0.25)",marginBottom:16,lineHeight:1.6}}>Use roupas justas. Boa iluminação resulta em análises mais precisas.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            <PhotoZone label="Frontal" sub="De frente" file={photos.frontal} onFile={f=>setPhotos(p=>({...p,frontal:f}))}/>
            <PhotoZone label="Lateral" sub="De lado" file={photos.lateral} onFile={f=>setPhotos(p=>({...p,lateral:f}))}/>
            <PhotoZone label="Posterior" sub="De costas" file={photos.posterior} onFile={f=>setPhotos(p=>({...p,posterior:f}))}/>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {(["frontal","lateral","posterior"] as const).map(k=><div key={k} style={{flex:1,height:3,borderRadius:3,background:photos[k]?"#c8f645":"rgba(255,255,255,0.07)",transition:"background 0.3s"}}/>)}
          </div>
          <p style={{fontSize:11,color:"rgba(255,255,255,0.38)",textAlign:"center",marginBottom:0}}>{photoCount} de 3 fotos selecionadas</p>
        </div>

        <button onClick={submit} disabled={!valid} style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:valid?"#c8f645":"rgba(255,255,255,0.05)",color:valid?"#0c0c0c":"rgba(255,255,255,0.18)",fontSize:14,fontWeight:700,cursor:valid?"pointer":"not-allowed",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>
          {valid?"⬆ ANALISAR MEU CORPO":"PREENCHA OS CAMPOS OBRIGATÓRIOS"}
        </button>
        <p style={{fontSize:11,color:"rgba(255,255,255,0.22)",textAlign:"center"}}>🔒 Suas fotos são processadas pela IA e não são armazenadas.</p>
      </>}

      {step==="loading"&&<div style={{textAlign:"center",padding:"80px 0"}}>
        <div style={{position:"relative",width:70,height:70,margin:"0 auto 28px"}}>
          <svg width="70" height="70" style={{animation:"spin 1.2s linear infinite"}}>
            <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(200,246,69,0.12)" strokeWidth="5"/>
            <circle cx="35" cy="35" r="30" fill="none" stroke="#c8f645" strokeWidth="5" strokeDasharray="24 168" strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><CorporeLogo size={24}/></div>
        </div>
        <h3 style={{fontSize:18,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,marginBottom:8}}>{loadingMsg}</h3>
        <p style={{color:"rgba(255,255,255,0.38)",fontSize:13}}>Isso pode levar alguns segundos</p>
      </div>}

      {step==="results"&&results&&<Results data={results} onReset={reset}/>}

      {step==="error"&&<div style={{textAlign:"center",padding:"70px 0"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:24}}>⚠</div>
        <h3 style={{fontSize:20,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",marginBottom:10,letterSpacing:1}}>ALGO DEU ERRADO</h3>
        <p style={{color:"rgba(255,255,255,0.38)",marginBottom:28,lineHeight:1.65,fontSize:13}}>{errorMsg}</p>
        <button onClick={reset} style={{padding:"12px 24px",borderRadius:100,border:"1px solid rgba(200,246,69,0.25)",background:"rgba(200,246,69,0.07)",color:"#c8f645",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1.5,textTransform:"uppercase"}}>↩ TENTAR NOVAMENTE</button>
      </div>}

    </div>
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </div>;
}