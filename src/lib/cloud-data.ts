import type {Data, Entry, Player, Round, CashExtra} from '../model';
import {supabase} from './supabase';

type DBRow=Record<string,any>;
const checked=<T,>(result:{data:T|null;error:any},label:string):T=>{if(result.error)throw new Error(label+': '+result.error.message);if(result.data===null)throw new Error(label+': resposta vazia do banco');return result.data};
export const checkedWrite=(result:{error:{message:string}|null},label:string):void=>{if(result.error)throw new Error(label+': '+result.error.message)};
const cents=(n:number)=>Math.round(n*100);
const trimRemote=async(table:string,owner:string,keep:string[])=>{
 const client=supabase!;
 const existing=checked((await client.from(table).select('id').eq('owner_id',owner)) as {data:DBRow[];error:any},table+' listar');
 const drop=existing.filter(x=>!keep.includes(x.id)).map(x=>x.id);
 if(drop.length)checkedWrite((await client.from(table).delete().eq('owner_id',owner).in('id',drop)) as {data:any;error:any},table+' excluir');
};
export async function loadCloudData(owner:string):Promise<Data>{
 if(!supabase)throw Error('Supabase não configurado');
 const [p,m,mp,c]=await Promise.all([
  supabase.from('players').select('*').eq('owner_id',owner),
  supabase.from('matches').select('*').eq('owner_id',owner),
  supabase.from('match_players').select('*').eq('owner_id',owner),
  supabase.from('cash_entries').select('*').eq('owner_id',owner)
 ]);
 const players=checked(p,'Jogadoras').map((r:DBRow):Player=>({id:r.id,name:r.name,aliases:r.aliases||[]}));
 const entries=checked(mp,'Gols');
 const rounds=checked(m,'Rodadas').map((r:DBRow):Round=>({
  id:r.id,date:r.played_on,fee:r.fee_cents/100,createdAt:r.created_at,
  entries:entries.filter((e:DBRow)=>e.match_id===r.id).map((e:DBRow):Entry=>({
   playerId:e.player_id,goals:e.goals,payment:e.payment_method,verified:e.verified,present:e.present
  }))
 }));
 const extras=checked(c,'Caixa').map((r:DBRow):CashExtra=>({id:r.id,date:r.entry_date,description:r.description,amount:r.amount_cents/100,method:r.payment_method,type:r.entry_type||'income'}));
 return{players,rounds,extras,season:new Date().getFullYear()};
}

export async function saveCloudData(owner:string,data:Data):Promise<void>{
 if(!supabase)throw Error('Supabase não configurado');
 const client=supabase;
 // Escritas sequenciais respeitam as FKs. A fila do componente evita sobreposição.
 if(data.players.length)checkedWrite(await client.from('players').upsert(data.players.map(p=>({id:p.id,owner_id:owner,name:p.name,aliases:p.aliases}))), 'Salvar jogadoras');
 if(data.rounds.length)checkedWrite(await client.from('matches').upsert(data.rounds.map(r=>({id:r.id,owner_id:owner,played_on:r.date,fee_cents:cents(r.fee)}))), 'Salvar rodadas');
 const entries=data.rounds.flatMap(r=>r.entries.map(e=>({
  owner_id:owner,match_id:r.id,player_id:e.playerId,present:e.present,goals:e.goals,
  payment_method:e.payment,verified:e.verified
 })));
 if(entries.length)checkedWrite(await client.from('match_players').upsert(entries,{onConflict:'match_id,player_id'}),'Salvar gols e pagamentos');
 const extras=data.extras||[];
 if(extras.length){
  const payload=extras.map(x=>({
   id:x.id,owner_id:owner,entry_date:x.date,description:x.description,
   amount_cents:cents(x.amount),payment_method:x.method,entry_type:x.type||'income'
  }));
  const response=await client.from('cash_entries').upsert(payload);
  const missingColumn=response.error&&(response.error.code==='PGRST204'||response.error.code==='42703'||/entry_type.*(column|schema cache|does not exist)/i.test(response.error.message));
  if(missingColumn){
   if(payload.some(x=>x.entry_type==='expense'))throw new Error('Para salvar saídas, execute a migração 20261103_cash_expenses.sql no Supabase.');
   const legacy=payload.map(({entry_type: _ignored,...row})=>row);
   checkedWrite(await client.from('cash_entries').upsert(legacy),'Salvar entradas do caixa');
  }else checkedWrite(response,'Salvar movimentações do caixa');
 }
 // Excluir registros removidos da UI, respeitando a ordem de dependências.
 const dbEntries=checked(await client.from('match_players').select('id,match_id,player_id').eq('owner_id',owner),'Conferir participantes');
 const validPairs=new Set(data.rounds.flatMap(r=>r.entries.map(e=>r.id+':'+e.playerId)));
 const expired=dbEntries.filter(x=>!validPairs.has(x.match_id+':'+x.player_id)).map(x=>x.id);
 if(expired.length)checkedWrite(await client.from('match_players').delete().eq('owner_id',owner).in('id',expired),'Excluir participantes');
 await trimRemote('matches',owner,data.rounds.map(r=>r.id));
 await trimRemote('players',owner,data.players.map(p=>p.id));
 await trimRemote('cash_entries',owner,extras.map(e=>e.id));
}
