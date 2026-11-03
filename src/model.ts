export type Payment='pending'|'pix'|'cash';
export type Player={id:string;name:string;aliases:string[]};
export type Entry={playerId:string;goals:number;payment:Payment;verified:boolean;present:boolean};
export type Round={id:string;date:string;fee:number;entries:Entry[];createdAt:string};
export type CashExtra={id:string;date:string;description:string;amount:number;method:'pix'|'cash';type?:'income'|'expense'};
export type Data={players:Player[];rounds:Round[];season:number;extras?:CashExtra[]};
export const id=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g,'');
export const parseNames=(source:string)=>[...new Map(source
 .split(/[\r\n;]+/)
 .map(line=>line
   .replace(/^[\s\u200B\uFEFF]*(?:(?:\d{1,3}\uFE0F?\u20E3?|[\u2776-\u2793])[\s]*[.)\-–—:]?[\s]*|[-*•✅☑️][\s]*)+/gu,'')
   .replace(/^\s*(?:\d{1,3})\s+(?=\p{L})/u,'')
   .replace(/\s*\((?:confirmad[ao]|ok|pago|pix)\)\s*$/iu,'')
   .trim())
 .filter(Boolean)
 .map(name=>[normalize(name),name] as const)).values()];
export const cleanPlayerName=(name:string)=>name.trim().replace(/^\\d{1,3}\\s*(?:[.)\\-–—:]\\s*|\\s+)(?=\\p{L})/u,'').trim();
export const matchPlayer=(name:string,players:Player[])=>{
 const needle=normalize(cleanPlayerName(name));
 return players.find(p=>normalize(p.name)===needle||p.aliases.some(a=>normalize(a)===needle))
   ||players.find(p=>normalize(cleanPlayerName(p.name))===needle||p.aliases.some(a=>normalize(cleanPlayerName(a))===needle));
};
export const mergePlayers=(data:Data,sourceId:string,targetId:string):Data=>{
 if(sourceId===targetId)throw new Error('Escolha duas jogadoras diferentes');
 const source=data.players.find(p=>p.id===sourceId);
 const target=data.players.find(p=>p.id===targetId);
 if(!source||!target)throw new Error('Jogadora não encontrada');
 // Se ambas estão na mesma rodada, não presumir como unir pagamentos nem gols.
 if(data.rounds.some(r=>r.entries.some(e=>e.playerId===sourceId)&&r.entries.some(e=>e.playerId===targetId))){
   throw new Error('As duas jogadoras aparecem na mesma rodada. Confira os gols e pagamentos antes de unir.');
 }
 const aliases=[...new Set([...target.aliases,...source.aliases,source.name].filter(a=>normalize(a)!==normalize(target.name)))];
 return {...data,
  players:data.players.filter(p=>p.id!==sourceId).map(p=>p.id===targetId?{...p,aliases}:p),
  rounds:data.rounds.map(r=>({...r,entries:r.entries.map(e=>e.playerId===sourceId?{...e,playerId:targetId}:e)}))
 };
};
export const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export const prettyDate=(s:string)=>new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long'});
export const today=()=>new Date().toLocaleDateString('en-CA');
export const stats=(rounds:Round[])=>{const all=rounds.flatMap(r=>r.entries.filter(e=>e.present).map(e=>({...e,fee:r.fee})));return{goals:all.reduce((n,e)=>n+e.goals,0),pix:all.filter(e=>e.payment==='pix').reduce((n,e)=>n+e.fee,0),cash:all.filter(e=>e.payment==='cash').reduce((n,e)=>n+e.fee,0),pending:all.filter(e=>e.payment==='pending').reduce((n,e)=>n+e.fee,0),players:all.length}};
export const ranking=(d:Data)=>d.players.map(p=>({player:p,goals:d.rounds.filter(r=>r.date.startsWith(String(d.season))).flatMap(r=>r.entries).filter(e=>e.present&&e.playerId===p.id).reduce((n,e)=>n+e.goals,0),games:d.rounds.filter(r=>r.date.startsWith(String(d.season))&&r.entries.some(e=>e.present&&e.playerId===p.id)).length})).sort((a,b)=>b.goals-a.goals||a.player.name.localeCompare(b.player.name));
const names=['Jéssica','Larissa','Manuele','Carolina','Fernanda','Bruna','Ana','Júlia','Camila','Vitória','Amanda','Gabriela'];
const players=names.map((name,i)=>({id:'p'+i,name,aliases:name==='Manuele'?['Manu']:name==='Jéssica'?['Jess']:[]}));
export const demo:Data={season:2026,players,rounds:[{id:'r1',date:'2026-10-21',fee:15,createdAt:'2026-10-21',entries:players.slice(0,9).map((p,i)=>({playerId:p.id,goals:[5,3,4,2,1,0,2,1,0][i],payment:i===6?'pending':i%3===0?'cash':'pix',verified:i!==6,present:true}))},{id:'r2',date:'2026-10-28',fee:15,createdAt:'2026-10-28',entries:players.map((p,i)=>({playerId:p.id,goals:[4,5,3,1,0,2,1,0,2,3,1,0][i],payment:i===3||i===8?'pending':i%3===0?'cash':'pix',verified:i!==3&&i!==8,present:true}))}]};
