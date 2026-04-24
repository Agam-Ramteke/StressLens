/* StressLens — Desktop & Mobile Web App */

const STORE = { form: "sl.form", theme: "sl.theme", profile: "sl.profile", history: "sl.history" };

// ── Fatigue Quiz ──
const FATIGUE_QS = [
  { text: "Can you focus without your mind wandering?", opts: ["Easily","It takes effort","I can barely focus"], scores: [0,1,2] },
  { text: "How does starting a new task feel?", opts: ["No problem","Requires willpower","Feels overwhelming"], scores: [0,1,2] },
  { text: "Are you forgetting things or making mistakes?", opts: ["Not at all","A bit more than usual","Definitely yes"], scores: [0,1,2] },
  { text: "How mentally drained do you feel?", opts: ["Feeling fresh","Somewhat tired","Completely exhausted"], scores: [0,1,2] },
  { text: "How's your patience and mood?", opts: ["Calm and patient","A bit on edge","Easily irritated"], scores: [0,1,2] },
];
let quizAnswers = new Array(FATIGUE_QS.length).fill(-1);

// ── Sliders ──
const SLIDER_GROUPS = {
  sleep: [
    { name:"sleep_duration_hours", label:"Sleep Duration", min:3, max:12, step:0.5, value:6.5, unit:"hr", hint:"Optimal: 7–9 hours" },
    { name:"phone_usage_before_sleep_minutes", label:"Phone Before Sleep", min:0, max:180, step:5, value:60, unit:"min", hint:"Best under 30 min" },
  ],
  habits: [
    { name:"daily_screen_time_hours", label:"Daily Screen Time", min:0, max:16, step:0.5, value:7, unit:"hr", hint:"Try under 6 hours" },
    { name:"caffeine_intake_cups", label:"Caffeine Intake", min:0, max:10, step:1, value:2, unit:"cups", hint:"Moderate: 1–3 cups" },
    { name:"physical_activity_minutes", label:"Physical Activity", min:0, max:180, step:5, value:30, unit:"min", hint:"Aim for 30+ min" },
  ],
  mental: [
    { name:"notifications_received_per_day", label:"Notifications", min:0, max:500, step:10, value:150, unit:"", hint:"High volume adds stress" },
  ],
};
const ALL_SLIDERS = Object.values(SLIDER_GROUPS).flat();

// ── Feature Interpretation System ──
// Layer 1: Feature classification (habit / state / demographic)
// Layer 2: Per-model health-direction copy
//   Stress model (higher = worse): positive SHAP → pushing stress UP → health-bad
//   Sleep model  (higher = better): positive SHAP → pushing sleep UP → health-good
//   So: isBad = (stress && positive) || (sleep && negative)
// Layer 3: Copy is written from the USER's health perspective, not raw SHAP direction
const FEATURE_META = {
  "Mental fatigue": {
    type: "state",
    stress: {
      bad:  "Your mental fatigue is elevated, contributing to higher stress",
      ok:   "Your fatigue level is moderate — not driving up stress right now",
    },
    sleep: {
      bad:  "Mental fatigue may be reducing your sleep quality",
      ok:   "Your fatigue level isn't significantly disrupting sleep",
    },
  },
  "Screen time": {
    type: "habit",
    stress: {
      bad:  "High screen time is adding to your stress — consider cutting back",
      ok:   "Your screen time isn't a major stress factor right now",
    },
    sleep: {
      bad:  "Excessive screen time is hurting your sleep quality",
      ok:   "Your screen habits aren't disrupting sleep",
    },
  },
  "Phone before bed": {
    type: "habit",
    stress: {
      bad:  "Late-night phone use is contributing to stress",
      ok:   "Your pre-sleep phone habits look manageable",
    },
    sleep: {
      bad:  "Phone before bed is disrupting your sleep",
      ok:   "Your pre-sleep routine isn't hurting sleep quality",
    },
  },
  "Sleep duration": {
    type: "habit",
    stress: {
      bad:  "Insufficient sleep is raising your stress levels",
      ok:   "Your sleep duration is helping keep stress lower",
    },
    sleep: {
      bad:  "Your sleep duration needs improvement",
      ok:   "You're getting a healthy amount of sleep",
    },
  },
  "Caffeine": {
    type: "habit",
    stress: {
      bad:  "Caffeine intake is increasing your stress — consider reducing",
      ok:   "Your caffeine level isn't driving stress up",
    },
    sleep: {
      bad:  "Caffeine is interfering with your sleep quality",
      ok:   "Caffeine isn't disrupting your sleep",
    },
  },
  "Physical activity": {
    type: "habit",
    stress: {
      bad:  "Low activity levels may be contributing to higher stress",
      ok:   "Your activity level is helping reduce stress",
    },
    sleep: {
      bad:  "More physical activity could improve your sleep quality",
      ok:   "Physical activity is supporting good sleep",
    },
  },
  "Notifications": {
    type: "habit",
    stress: {
      bad:  "High notification volume is adding to your stress",
      ok:   "Notifications aren't a major stressor for you",
    },
    sleep: {
      bad:  "Notification overload may be affecting your sleep",
      ok:   "Notifications aren't impacting your sleep",
    },
  },
  "Age":        { type: "demographic" },
  "Gender":     { type: "demographic" },
  "Occupation": { type: "demographic" },
};


// ── DOM ──
const $ = s => document.querySelector(s);
const form = $("#metricsForm"), statusDot = $("#statusDot");
const btnAnalyze = $("#btnAnalyze"), formMsg = $("#formMsg");
const welcomeState = $("#welcomeState"), resultsState = $("#resultsState");
const fatigueInput = $("#fatigueScoreInput"), fatigueDisplay = $("#fatigueDisplay");
const settingsOverlay = $("#settingsOverlay");

// ── Utility ──
const fmt = (v,d=1) => Number(v).toFixed(d);
const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));
// Auto-detect backend URL. Zero config.
// Port 5173 = standalone frontend dev server → API on port 8000.
// Everything else (Docker :10000, Render, etc.) = same-origin.
const baseUrl = () => {
  const h = location.hostname;
  if ((h === "localhost" || h === "127.0.0.1") && location.port === "5173") return "http://127.0.0.1:8000";
  return "";
};
function msg(t,err=false){ formMsg.textContent=t; formMsg.classList.toggle("err",err); }

// ── Date display ──
function showDate(){ const d=new Date(); $("#dateDisplay").textContent=d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}); }

// ── Slider fill ──
function updateSliderFill(inp){
  const pct = ((inp.value-inp.min)/(inp.max-inp.min))*100;
  inp.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, var(--bg-1) ${pct}%)`;
}

// ── Build quiz ──
function buildQuiz(){
  const c = $("#fatigueQuiz"); c.innerHTML="";
  FATIGUE_QS.forEach((q,qi)=>{
    const d=document.createElement("div"); d.className="quiz-q";
    d.innerHTML=`<div class="quiz-text">${q.text}</div><div class="quiz-opts">${q.opts.map((o,oi)=>`<button type="button" class="quiz-opt" data-qi="${qi}" data-oi="${oi}">${o}</button>`).join("")}</div>`;
    c.appendChild(d);
  });
  c.addEventListener("click",e=>{
    const b=e.target.closest(".quiz-opt"); if(!b) return;
    const qi=+b.dataset.qi, oi=+b.dataset.oi;
    quizAnswers[qi]=FATIGUE_QS[qi].scores[oi];
    b.closest(".quiz-q").querySelectorAll(".quiz-opt").forEach((x,i)=>x.classList.toggle("selected",i===oi));
    updateFatigue(); saveForm();
  });
}
function updateFatigue(){
  const ans=quizAnswers.filter(a=>a>=0), total=ans.reduce((s,v)=>s+v,0);
  const score=ans.length===0?5:Math.max(1,Math.round((total/(ans.length*2))*9+1));
  fatigueInput.value=score; fatigueDisplay.textContent=`${score} / 10`;
  fatigueDisplay.style.color=score>=7?"var(--red)":score>=4?"var(--yellow)":"var(--green)";
}

// ── Build sliders ──
function buildSliders(){
  for(const [g,defs] of Object.entries(SLIDER_GROUPS)){
    const c=$(`#${g}Sliders`); if(!c) continue; c.innerHTML="";
    for(const s of defs){
      const isInt=Number.isInteger(s.step), w=document.createElement("div"); w.className="slider-wrap";
      w.innerHTML=`<div class="slider-top"><span class="slider-name">${s.label}</span><span class="slider-val" data-vfor="${s.name}">${fmt(s.value,isInt?0:1)} ${s.unit}</span></div><input type="range" name="${s.name}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}"><span class="slider-hint">${s.hint}</span>`;
      c.appendChild(w);
      const inp=w.querySelector("input"), val=w.querySelector(`[data-vfor="${s.name}"]`);
      updateSliderFill(inp);
      inp.addEventListener("input",()=>{ val.textContent=`${fmt(inp.value,isInt?0:1)} ${s.unit}`; updateSliderFill(inp); saveForm(); });
    }
  }
}

// ── Form I/O ──
function readForm(){
  const d=new FormData(form);
  return { age:Number(d.get("age")), gender:String(d.get("gender")), occupation:String(d.get("occupation")),
    daily_screen_time_hours:Number(d.get("daily_screen_time_hours")), phone_usage_before_sleep_minutes:Number(d.get("phone_usage_before_sleep_minutes")),
    sleep_duration_hours:Number(d.get("sleep_duration_hours")), caffeine_intake_cups:Number(d.get("caffeine_intake_cups")),
    physical_activity_minutes:Number(d.get("physical_activity_minutes")), notifications_received_per_day:Number(d.get("notifications_received_per_day")),
    mental_fatigue_score:Number(d.get("mental_fatigue_score")) };
}
function saveForm(){ localStorage.setItem(STORE.form,JSON.stringify(readForm())); }
function restoreForm(){

  const r=localStorage.getItem(STORE.form); if(!r) return;
  try{
    const v=JSON.parse(r);
    for(const [k,val] of Object.entries(v)){ const el=form.elements.namedItem(k); if(el) el.value=val; }
    for(const s of ALL_SLIDERS){ const inp=form.elements.namedItem(s.name); if(inp){ const out=document.querySelector(`[data-vfor="${s.name}"]`); if(out) out.textContent=`${fmt(inp.value,Number.isInteger(s.step)?0:1)} ${s.unit}`; updateSliderFill(inp); }}
    fatigueDisplay.textContent=`${fatigueInput.value} / 10`;
  }catch{ localStorage.removeItem(STORE.form); }
}
function resetDefaults(){
  localStorage.removeItem(STORE.form); form.reset();
  for(const s of ALL_SLIDERS){ const inp=form.elements.namedItem(s.name); if(inp){ inp.value=s.value; updateSliderFill(inp); } const out=document.querySelector(`[data-vfor="${s.name}"]`); if(out) out.textContent=`${fmt(s.value,Number.isInteger(s.step)?0:1)} ${s.unit}`; }
  quizAnswers.fill(-1); document.querySelectorAll(".quiz-opt").forEach(b=>b.classList.remove("selected"));
  fatigueInput.value=5; fatigueDisplay.textContent="5 / 10"; fatigueDisplay.style.color=""; msg("Inputs reset.");
}

// ── Theme ──
function setTheme(t){ document.documentElement.setAttribute("data-theme",t); localStorage.setItem(STORE.theme,t); document.querySelectorAll(".theme-btn").forEach(b=>b.classList.toggle("active",b.dataset.theme===t)); }
function restoreTheme(){ setTheme(localStorage.getItem(STORE.theme)||"dark"); }

// ── Profile (syncs settings → hidden form inputs) ──
function saveProfile(){
  const p = { name:$("#profileName").value, age:$("#profileAge").value, gender:$("#profileGender").value, occupation:$("#profileOccupation").value };
  localStorage.setItem(STORE.profile,JSON.stringify(p));
  syncProfileToForm(p);
}
function syncProfileToForm(p){
  if(p.age) $("#formAge").value=p.age;
  if(p.gender) $("#formGender").value=p.gender;
  if(p.occupation) $("#formOccupation").value=p.occupation;
}
function restoreProfile(){
  try{
    const p=JSON.parse(localStorage.getItem(STORE.profile)||"{}");
    if(p.name) $("#profileName").value=p.name;
    if(p.age) $("#profileAge").value=p.age;
    if(p.gender) $("#profileGender").value=p.gender;
    if(p.occupation) $("#profileOccupation").value=p.occupation;
    syncProfileToForm(p);
  }catch{}
}

// ── History ──
function getHistory(){ try{ return JSON.parse(localStorage.getItem(STORE.history)||"[]"); }catch{ return []; } }
function saveToHistory(inputs,results){
  const h=getHistory();
  h.push({ timestamp:new Date().toISOString(), inputs, results:{ stress_level:results.stress_level, sleep_quality_score:results.sleep_quality_score, stress_band:results.stress_band, sleep_band:results.sleep_band, recommendations:results.recommendations }});
  if(h.length>90) h.splice(0,h.length-90);
  localStorage.setItem(STORE.history,JSON.stringify(h));
  updateHistoryCount();
}
function updateHistoryCount(){ const n=getHistory().length; $("#historyCount").textContent=n?`${n} analysis record${n>1?"s":""} saved.`:"No history saved yet."; }
function exportHistory(){
  const profile=JSON.parse(localStorage.getItem(STORE.profile)||"{}");
  const data={ exported:new Date().toISOString(), profile, history:getHistory() };
  const jsonStr=JSON.stringify(data,null,2);
  const name=(profile.name||"StressLens").replace(/[^a-zA-Z0-9_-]/g,"_");
  const now=new Date(), dt=`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
  const zipName=`${name}_${dt}.zip`, jsonName=`${name}_${dt}.json`;
  const zipBlob=buildZip(jsonName,jsonStr);
  const a=document.createElement("a"); a.href=URL.createObjectURL(zipBlob);
  a.download=zipName; a.click(); URL.revokeObjectURL(a.href);
}
// Minimal single-file ZIP builder (STORE method, no compression, no dependencies)
function buildZip(fileName,content){
  const enc=new TextEncoder(), fileData=enc.encode(content), fnData=enc.encode(fileName);
  const crc=crc32(fileData), sz=fileData.length, fnLen=fnData.length;
  const localH=30+fnLen, centralH=46+fnLen, eocd=22;
  const buf=new ArrayBuffer(localH+sz+centralH+eocd), v=new DataView(buf), u=new Uint8Array(buf);
  let o=0;
  // Local file header
  v.setUint32(o,0x04034b50,true);o+=4; v.setUint16(o,20,true);o+=2; v.setUint16(o,0,true);o+=2;
  v.setUint16(o,0,true);o+=2; v.setUint16(o,dosTime(new Date()),true);o+=2; v.setUint16(o,dosDate(new Date()),true);o+=2;
  v.setUint32(o,crc,true);o+=4; v.setUint32(o,sz,true);o+=4; v.setUint32(o,sz,true);o+=4;
  v.setUint16(o,fnLen,true);o+=2; v.setUint16(o,0,true);o+=2; u.set(fnData,o);o+=fnLen; u.set(fileData,o);o+=sz;
  // Central directory
  const cdOff=o;
  v.setUint32(o,0x02014b50,true);o+=4; v.setUint16(o,20,true);o+=2; v.setUint16(o,20,true);o+=2;
  v.setUint16(o,0,true);o+=2; v.setUint16(o,0,true);o+=2; v.setUint16(o,dosTime(new Date()),true);o+=2;
  v.setUint16(o,dosDate(new Date()),true);o+=2; v.setUint32(o,crc,true);o+=4;
  v.setUint32(o,sz,true);o+=4; v.setUint32(o,sz,true);o+=4; v.setUint16(o,fnLen,true);o+=2;
  v.setUint16(o,0,true);o+=2; v.setUint16(o,0,true);o+=2; v.setUint16(o,0,true);o+=2;
  v.setUint16(o,0,true);o+=2; v.setUint32(o,32,true);o+=4; v.setUint32(o,0,true);o+=4; u.set(fnData,o);o+=fnLen;
  // EOCD
  v.setUint32(o,0x06054b50,true);o+=4; v.setUint16(o,0,true);o+=2; v.setUint16(o,0,true);o+=2;
  v.setUint16(o,1,true);o+=2; v.setUint16(o,1,true);o+=2; v.setUint32(o,centralH,true);o+=4;
  v.setUint32(o,cdOff,true);o+=4; v.setUint16(o,0,true);
  return new Blob([buf],{type:"application/zip"});
}
function dosTime(d){return(d.getSeconds()>>1)|((d.getMinutes())<<5)|((d.getHours())<<11);}
function dosDate(d){return d.getDate()|((d.getMonth()+1)<<5)|(((d.getFullYear()-1980))<<9);}
function crc32(data){
  let c=0xFFFFFFFF; const t=new Int32Array(256);
  for(let n=0;n<256;n++){let v=n;for(let k=0;k<8;k++)v=v&1?0xEDB88320^(v>>>1):v>>>1;t[n]=v;}
  for(let i=0;i<data.length;i++) c=t[(c^data[i])&0xFF]^(c>>>8);
  return(c^0xFFFFFFFF)>>>0;
}
function clearHistory(){ if(confirm("Clear all saved history?")){ localStorage.removeItem(STORE.history); updateHistoryCount(); } }

// ── Settings panel ──
function openSettings(){ settingsOverlay.hidden=false; updateHistoryCount(); restoreProfile(); }
function closeSettings(){ settingsOverlay.hidden=true; saveProfile(); }

// ── API ──
async function api(path,opts={}){
  const u=baseUrl();
  const url = u ? `${u}${path}` : path;
  const res=await fetch(url,{...opts,headers:{Accept:"application/json",...(opts.headers||{})}});
  const text=await res.text(); const body=text?JSON.parse(text):{};
  if(!res.ok){ const d=body.detail||res.statusText; throw new Error(typeof d==="string"?d:JSON.stringify(d)); }
  return body;
}
async function checkHealth(){
  statusDot.className="status-dot";
  try{ const h=await api("/health"); statusDot.classList.add(h.model_loaded?"ok":"err");
  }catch{ statusDot.classList.add("err"); }
}

// ── Canvas: Gauge ──
function drawGauge(id,value,max,colors){
  const cv=document.getElementById(id); if(!cv) return;
  const ctx=cv.getContext("2d"), dpr=window.devicePixelRatio||1;
  const w=parseInt(cv.style.width||cv.width), h=parseInt(cv.style.height||cv.height);
  cv.width=w*dpr; cv.height=h*dpr; ctx.scale(dpr,dpr);
  const cx=w/2,cy=h/2+8,r=Math.min(w,h)/2-16, sa=Math.PI*.75, ea=Math.PI*2.25, pct=clamp(value/max,0,1);
  ctx.beginPath(); ctx.arc(cx,cy,r,sa,ea); ctx.lineWidth=12; ctx.strokeStyle="rgba(128,128,128,.12)"; ctx.lineCap="round"; ctx.stroke();
  if(pct>0){ const fe=sa+(ea-sa)*pct; const g=ctx.createConicGradient(sa,cx,cy); colors.forEach(([o,c])=>g.addColorStop(o,c)); ctx.beginPath(); ctx.arc(cx,cy,r,sa,fe); ctx.lineWidth=12; ctx.strokeStyle=g; ctx.lineCap="round"; ctx.stroke(); }
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--text-0").trim()||"#f4f4fb";
  ctx.font=`800 ${Math.round(w*.17)}px Inter,sans-serif`; ctx.fillText(fmt(value,1),cx,cy-4);
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--text-2").trim()||"#9898b4";
  ctx.font=`600 ${Math.round(w*.055)}px Inter,sans-serif`; ctx.fillText(`/ ${max}`,cx,cy+Math.round(w*.1));
}
function animateGauge(id,target,max,colors,dur=900){
  let st=null; const step=ts=>{ if(!st) st=ts; const p=Math.min((ts-st)/dur,1); drawGauge(id,target*(1-Math.pow(1-p,3)),max,colors); if(p<1) requestAnimationFrame(step); }; requestAnimationFrame(step);
}

// ── Canvas: Radar ──
const RADAR_AXES=[
  {label:"Sleep",best:v=>1-Math.abs(v.sleep_duration_hours-8)/5},
  {label:"Activity",best:v=>Math.min(v.physical_activity_minutes/90,1)},
  {label:"Screen",best:v=>1-Math.min(v.daily_screen_time_hours/12,1)},
  {label:"Caffeine",best:v=>1-Math.min(v.caffeine_intake_cups/8,1)},
  {label:"Mental",best:v=>1-(v.mental_fatigue_score-1)/9},
  {label:"Digital",best:v=>1-Math.min(v.phone_usage_before_sleep_minutes/120,1)},
];
function drawRadar(values){
  const cv=document.getElementById("radarCanvas"); if(!cv) return;
  const ctx=cv.getContext("2d"),dpr=window.devicePixelRatio||1;
  const w=parseInt(cv.style.width||cv.width),h=parseInt(cv.style.height||cv.height);
  cv.width=w*dpr; cv.height=h*dpr; ctx.scale(dpr,dpr);
  const cx=w/2,cy=h/2,maxR=w/2-30,n=RADAR_AXES.length,as=(Math.PI*2)/n;
  const pt=(i,v)=>{const a=-Math.PI/2+as*i,rv=maxR*clamp(v,0,1);return[cx+rv*Math.cos(a),cy+rv*Math.sin(a)];};
  ctx.clearRect(0,0,w,h);
  const gridColor=getComputedStyle(document.documentElement).getPropertyValue("--border").trim()||"rgba(255,255,255,.06)";
  const labelColor=getComputedStyle(document.documentElement).getPropertyValue("--text-2").trim()||"#9898b4";
  for(let ring=1;ring<=4;ring++){ctx.beginPath();const rr=(maxR/4)*ring;for(let i=0;i<=n;i++){const a=-Math.PI/2+as*i;const[x,y]=[cx+rr*Math.cos(a),cy+rr*Math.sin(a)];i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle=gridColor;ctx.lineWidth=1;ctx.stroke();}
  const scores=RADAR_AXES.map(ax=>clamp(ax.best(values),0,1));
  for(let i=0;i<n;i++){const a=-Math.PI/2+as*i;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+maxR*Math.cos(a),cy+maxR*Math.sin(a));ctx.strokeStyle=gridColor;ctx.stroke();const lx=cx+(maxR+16)*Math.cos(a),ly=cy+(maxR+16)*Math.sin(a);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=labelColor;ctx.font="600 10px Inter,sans-serif";ctx.fillText(RADAR_AXES[i].label,lx,ly);}
  ctx.beginPath();for(let i=0;i<n;i++){const[x,y]=pt(i,scores[i]);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.closePath();ctx.fillStyle="rgba(124,92,252,.18)";ctx.fill();ctx.strokeStyle="rgba(124,92,252,.7)";ctx.lineWidth=2;ctx.stroke();
  for(let i=0;i<n;i++){const[x,y]=pt(i,scores[i]);ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fillStyle="#7c5cfc";ctx.fill();}
}

// ── Factor cards ──
function renderFactors(id, rows, model) {
  const el = $(`#${id}`); el.innerHTML = "";
  const top = rows.slice(0, 5);
  const maxA = Math.max(...top.map(r => Math.abs(r.contribution)), 0.01);

  for (const r of top) {
    const meta = FEATURE_META[r.label];
    const abs = Math.abs(r.contribution);
    const strength = abs / maxA >= 0.6 ? "strong" : abs / maxA >= 0.25 ? "moderate" : "minor";

    let desc, icon, cls, badge;

    if (!meta || meta.type === "demographic") {
      // Demographics: neutral presentation, no directional claim
      desc = `Your ${r.label.toLowerCase()} profile has a ${strength} association with this score`;
      icon = `<span class="factor-arrow profile">○</span>`;
      cls = "factor profile-factor";
      badge = "Profile";
    } else {
      // Health-direction: stress(+)=bad, sleep(-)=bad
      const isBad = model === "stress" ? r.contribution > 0 : r.contribution < 0;
      const modelCopy = meta[model];
      desc = isBad ? modelCopy.bad : modelCopy.ok;

      if (isBad) {
        icon = `<span class="factor-arrow concern">⚠</span>`;
        cls = "factor concern";
      } else {
        icon = `<span class="factor-arrow positive">✓</span>`;
        cls = "factor positive";
      }
      badge = strength === "strong" ? "Strong" : strength === "moderate" ? "Moderate" : "Minor";
    }

    const d = document.createElement("div"); d.className = cls;
    d.innerHTML = `${icon}<div class="factor-body"><span class="factor-name">${r.label}${meta?.type === "habit" ? ' <span class="factor-tag">Actionable</span>' : ""}</span><span class="factor-desc">${desc}</span></div><span class="factor-badge ${strength}">${badge}</span>`;
    el.appendChild(d);
  }
}

// ── Render results ──
function renderResults(pred,vals){
  welcomeState.hidden=true; resultsState.hidden=false;
  const sStops=[[0,"#34d399"],[.35,"#fbbf24"],[.7,"#f87171"],[1,"#ef4444"]];
  const slStops=[[0,"#f87171"],[.35,"#fbbf24"],[.7,"#34d399"],[1,"#22d3ee"]];
  animateGauge("stressGauge",pred.stress_level,10,sStops);
  animateGauge("sleepGauge",pred.sleep_quality_score,10,slStops);
  const bnd=(id,band)=>{const el=$(`#${id}`);el.textContent=band;const m={High:"var(--red)",Moderate:"var(--yellow)",Low:"var(--green)",Good:"var(--green)",Fair:"var(--yellow)",Poor:"var(--red)"};el.style.color=m[band]||"";el.style.background=m[band]?.includes("red")?"var(--red-soft)":m[band]?.includes("yellow")?"rgba(251,191,36,.12)":"var(--green-soft)";};
  bnd("stressBandLabel",pred.stress_band); bnd("sleepBandLabel",pred.sleep_band);
  const w=Math.round((clamp(1-pred.stress_level/10,0,1)*.5+clamp(pred.sleep_quality_score/10,0,1)*.5)*100);
  animateNum("wellnessNum",w); const wn=$("#wellnessNum"); wn.style.color=w>=75?"var(--green)":w>=50?"var(--yellow)":"var(--red)";
  $("#wellnessDesc").textContent=w>=75?"Excellent — your habits are well-aligned.":w>=50?"Moderate — a few adjustments could help.":"Needs attention — check the factors below.";
  const cg=$("#compareGrid"); cg.innerHTML="";
  [{l:"Your Stress",v:pred.stress_level,c:"stress"},{l:"Avg. Stress",v:pred.base_stress_score,c:"base"},{l:"Your Sleep",v:pred.sleep_quality_score,c:"sleep"},{l:"Avg. Sleep",v:pred.base_sleep_score,c:"base"}].forEach(x=>{
    const r=document.createElement("div");r.className="cmp-row";r.innerHTML=`<span class="cmp-label">${x.l}</span><div class="cmp-track"><div class="cmp-fill ${x.c}" style="width:0%"></div></div><span class="cmp-val">${fmt(x.v,1)}</span>`;cg.appendChild(r);requestAnimationFrame(()=>r.querySelector(".cmp-fill").style.width=`${(x.v/10)*100}%`);});
  drawRadar(vals); renderFactors("stressFactors",pred.stress_explanations,"stress"); renderFactors("sleepFactors",pred.sleep_explanations,"sleep");
  const rl=$("#recsList"); rl.innerHTML=""; pred.recommendations.forEach((t,i)=>{const d=document.createElement("div");d.className="rec-item";d.innerHTML=`<span class="rec-num">${i+1}</span><span>${t}</span>`;rl.appendChild(d);});
  resultsState.scrollIntoView({behavior:"smooth",block:"start"});
}
function animateNum(id,target,dur=800){const el=$(`#${id}`);let st=null;const step=ts=>{if(!st)st=ts;const p=Math.min((ts-st)/dur,1);el.textContent=Math.round(target*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);}

// ── Run prediction ──
async function runPrediction(e){
  e.preventDefault();
  const lbl=btnAnalyze.querySelector(".btn-label"),ldr=btnAnalyze.querySelector(".btn-loader");
  lbl.textContent="Analyzing…"; ldr.hidden=false; btnAnalyze.disabled=true; msg("Running analysis…"); saveForm();
  try{
    const payload=readForm();
    const pred=await api("/predict",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    renderResults(pred,payload); saveToHistory(payload,pred); msg("Analysis complete — saved to history.");
  }catch(err){ msg(err.message,true); }
  finally{ lbl.textContent="Run Analysis"; ldr.hidden=true; btnAnalyze.disabled=false; }
}

// ── Init ──
buildQuiz(); buildSliders(); restoreForm(); restoreTheme(); restoreProfile(); showDate(); checkHealth();

form.addEventListener("submit",runPrediction);
$("#btnReset").addEventListener("click",resetDefaults);
form.addEventListener("change",saveForm);
$("#btnSettings").addEventListener("click",openSettings);
$("#closeSettings").addEventListener("click",closeSettings);
settingsOverlay.addEventListener("click",e=>{if(e.target===settingsOverlay) closeSettings();});
document.querySelectorAll(".theme-btn").forEach(b=>b.addEventListener("click",()=>setTheme(b.dataset.theme)));
$("#btnExport").addEventListener("click",exportHistory);
$("#btnExportSettings").addEventListener("click",exportHistory);
$("#btnClearHistory").addEventListener("click",clearHistory);
$("#profileName").addEventListener("change",saveProfile);
$("#profileAge").addEventListener("change",saveProfile);
$("#profileGender").addEventListener("change",saveProfile);
$("#profileOccupation").addEventListener("change",saveProfile);
