import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readOffline,writeOffline} from './offline';
import type {Data} from '../model';

const sample:Data={season:2026,players:[{id:'a',name:'Ana',aliases:[]}],rounds:[],extras:[]};
describe('salvamento offline por conta',()=>{
 const memory=new Map<string,string>();
 beforeEach(()=>{
  memory.clear();
  vi.stubGlobal('localStorage',{
   getItem:(key:string)=>memory.get(key)??null,
   setItem:(key:string,value:string)=>{memory.set(key,value)},
  });
 });
 afterEach(()=>vi.unstubAllGlobals());
 it('mantém os dados e o sinal de sincronização pendente',()=>{
  writeOffline('conta-a',sample,true);
  expect(readOffline('conta-a')).toMatchObject({pending:true,data:sample});
 });
 it('mantém notas ao fechar e reabrir offline',()=>{
  const withNotes={...sample,notes:[{id:'nota-1',content:'Comprar bolas para quinta',createdAt:'2026-11-05T12:00:00Z'}]};
  writeOffline('conta-a',withNotes,true);
  expect(readOffline('conta-a')?.data.notes?.[0].content).toBe('Comprar bolas para quinta');
 });
 it('não compartilha registros entre duas contas',()=>{
  writeOffline('conta-a',sample,true);
  expect(readOffline('conta-b')).toBe(null);
 });
 it('só limpa pendências após confirmação de salvamento',()=>{
  writeOffline('conta-a',sample,true);
  expect(readOffline('conta-a')?.pending).toBe(true);
  writeOffline('conta-a',sample,false);
  expect(readOffline('conta-a')?.pending).toBe(false);
 });
 it('não mascara erro de armazenamento como salvamento',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw Error('quota exceeded')}});
  expect(()=>writeOffline('conta-a',sample,true)).toThrow('quota exceeded');
 });
});
