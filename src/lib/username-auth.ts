// Supabase Auth exige email ou telefone internamente. Para o login exclusivo
// por nome do BolaDelas usamos um identificador estável em um domínio reservado.
// O email não existe para envio de mensagens: não há recuperação por email.
const USERNAME_RE=/^[a-z0-9_]{3,24}$/;
export function normalizeUsername(input:string):string{
 return input.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'_');
}
export function validateUsername(input:string):string|null{
 const name=normalizeUsername(input);
 if(!USERNAME_RE.test(name))return 'Digite um nome de 3 a 24 caracteres. Pode usar espaços e acentos.';
 return null;
}
export function usernameEmail(input:string):string{
 const name=normalizeUsername(input);
 if(validateUsername(name))throw new Error('Nome de usuário inválido');
 return name+'@acesso.boladelas.example.com';
}
export function loginIdentifier(input:string):string{
 const v=input.trim();
 return v.includes('@')?v:usernameEmail(v);
}
export function activationToken():string|null{
 const m=window.location.hash.match(/(?:^#|&)ativar=([0-9a-f]{64})(?:&|$)/i);
 return m?.[1]??null;
}
