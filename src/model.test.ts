import {describe,it,expect} from 'vitest';
import {parseNames,matchPlayer,ranking,stats,normalize,demo} from './model';
describe('lista do WhatsApp',()=>{
 it('separa nomes com números e ignora duplicados',()=>expect(parseNames('1. Ana\n2) Bia\n3. Ana')).toEqual(['Ana','Bia']));
 it('reconhece apelidos',()=>expect(matchPlayer('Manu',demo.players)?.name).toBe('Manuele'));
 it('ignora diferenças de acento e caixa',()=>expect(normalize('JÉSSICA')).toBe(normalize('jessica')));
});
describe('temporada e caixa',()=>{
 it('totaliza gols e dinheiro',()=>{const x=stats(demo.rounds);expect(x.goals).toBeGreaterThan(0);expect(x.pix+x.cash+x.pending).toBeGreaterThan(0)});
 it('soma gols por pessoa',()=>expect(ranking(demo).find(x=>x.player.name==='Jéssica')?.goals).toBe(9));
 it('permite empates com mesma posição pela pontuação',()=>{const r=ranking(demo);expect(r.every((p,i)=>i===0||r[i-1].goals>=p.goals)).toBe(true)});
});
