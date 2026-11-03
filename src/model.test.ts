import {describe,it,expect} from 'vitest';
import {parseNames,matchPlayer,mergePlayers,ranking,stats,normalize,demo} from './model';
describe('lista do WhatsApp',()=>{
 it('separa nomes com números e ignora duplicados',()=>expect(parseNames('1. Ana\n2) Bia\n3. Ana')).toEqual(['Ana','Bia']));
 it('remove numeração de listas copiadas do WhatsApp',()=>expect(parseNames('1. Larissa\n02 - Manuele\n3) Jéssica\n4 Ana\n5️⃣ Bruna')).toEqual(['Larissa','Manuele','Jéssica','Ana','Bruna']));
 it('reconhece apelidos',()=>expect(matchPlayer('Manu',demo.players)?.name).toBe('Manuele'));
 it('ignora diferenças de acento e caixa',()=>expect(normalize('JÉSSICA')).toBe(normalize('jessica')));
});
describe('temporada e caixa',()=>{
 it('totaliza gols e dinheiro',()=>{const x=stats(demo.rounds);expect(x.goals).toBeGreaterThan(0);expect(x.pix+x.cash+x.pending).toBeGreaterThan(0)});
 it('soma gols por pessoa',()=>expect(ranking(demo).find(x=>x.player.name==='Jéssica')?.goals).toBe(9));
 it('permite empates com mesma posição pela pontuação',()=>{const r=ranking(demo);expect(r.every((p,i)=>i===0||r[i-1].goals>=p.goals)).toBe(true)});
});

describe('cadastros duplicados',()=>{
 it('transfere gols para a mesma jogadora sem perder histórico em rodadas diferentes',()=>{
  const state={season:2026,players:[{id:'a',name:'1 paloma',aliases:[]},{id:'b',name:'paloma',aliases:[]}],rounds:[{id:'r',date:'2026-11-03',fee:15,createdAt:'2026-11-03',entries:[{playerId:'a',goals:3,payment:'pix' as const,verified:true,present:true}]}],extras:[]};
  const merged=mergePlayers(state,'a','b');
  expect(merged.players).toHaveLength(1);
  expect(merged.rounds[0].entries[0].playerId).toBe('b');
  expect(merged.rounds[0].entries[0].goals).toBe(3);
 });
 it('não mescla pagamentos ambíguos da mesma rodada',()=>{
  const state={season:2026,players:[{id:'a',name:'1 paloma',aliases:[]},{id:'b',name:'paloma',aliases:[]}],rounds:[{id:'r',date:'2026-11-03',fee:15,createdAt:'2026-11-03',entries:[{playerId:'a',goals:1,payment:'pix' as const,verified:true,present:true},{playerId:'b',goals:2,payment:'cash' as const,verified:false,present:true}]}]};
  expect(()=>mergePlayers(state,'a','b')).toThrow(/mesma rodada/);
 });
});
