import {describe,it,expect} from 'vitest';
import {checkedWrite} from './cloud-data';
describe('respostas do Supabase ao salvar',()=>{
 it('aceita sucesso sem dados retornados (upsert padrão)',()=>{
  expect(()=>checkedWrite({error:null},'Salvar jogadoras')).not.toThrow();
 });
 it('mostra erro real do banco',()=>{
  expect(()=>checkedWrite({error:{message:'permission denied'}},'Salvar jogadoras')).toThrow('Salvar jogadoras: permission denied');
 });
});
