import {describe,it,expect} from 'vitest';
import {normalizeUsername,validateUsername,usernameEmail,loginIdentifier} from './username-auth';
describe('acesso por usuário',()=>{
 it('normaliza maiúsculas e espaços',()=>{
  expect(normalizeUsername('  LaRiSSA  ')).toBe('larissa');
  expect(usernameEmail('  LaRiSSA  ')).toBe('larissa@acesso.boladelas.example.com');
 });
 it('rejeita nomes inseguros',()=>{
  expect(validateUsername('a')).not.toBeNull();
  expect(validateUsername('lara@teste')).not.toBeNull();
  expect(validateUsername('nome com espaço')).not.toBeNull();
 });
 it('permite login da conta de teste com email, sem quebrar transição',()=>{
  expect(loginIdentifier('teste@exemplo.com')).toBe('teste@exemplo.com');
  expect(loginIdentifier('LARA')).toBe('lara@acesso.boladelas.example.com');
 });
});
