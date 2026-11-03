-- BolaDelas: entrega segura da conta da organizadora, sem exigir email na interface.
-- Execute depois de 20261103_single_admin.sql. Requer pgcrypto no schema extensions.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists private.boladelas_handoffs (
 token_hash text primary key,
 issued_by uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null,
 redeemed_at timestamptz,
 created_at timestamptz not null default now()
);
revoke all on private.boladelas_handoffs from public, anon, authenticated;

-- A administradora atual gera um único link, válido por 24h.
create or replace function public.boladelas_create_handoff()
returns text language plpgsql security definer set search_path=''
as $$
declare
 secret_token text;
 current_user_id uuid := auth.uid();
begin
 if current_user_id is null or not exists (
  select 1 from private.boladelas_admin where user_id=current_user_id
 ) then
  raise exception 'Acesso não autorizado';
 end if;
 delete from private.boladelas_handoffs where issued_by=current_user_id;
 secret_token := encode(extensions.gen_random_bytes(32),'hex');
 insert into private.boladelas_handoffs(token_hash,issued_by,expires_at)
 values(encode(extensions.digest(secret_token,'sha256'),'hex'),current_user_id,now()+interval '24 hours');
 return secret_token;
end;
$$;
revoke all on function public.boladelas_create_handoff() from public, anon;
grant execute on function public.boladelas_create_handoff() to authenticated;

-- A nova conta se torna a única administradora se apresentar o token de uso único.
-- Os registros de teste continuam pertencendo à conta anterior, sem serem transferidos.
create or replace function public.boladelas_claim_handoff(access_token text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare
 issuer uuid;
 new_user_id uuid := auth.uid();
begin
 if new_user_id is null then raise exception 'Faça login antes de ativar o acesso'; end if;
 if access_token is null or length(access_token)<>64 then raise exception 'Link de ativação inválido'; end if;
 select issued_by into issuer
 from private.boladelas_handoffs
 where token_hash=encode(extensions.digest(access_token,'sha256'),'hex')
  and redeemed_at is null and expires_at>now()
 for update;
 if issuer is null then raise exception 'Link expirado ou já utilizado'; end if;
 if issuer=new_user_id then raise exception 'Esta conta já é administradora'; end if;
 update private.boladelas_admin set user_id=new_user_id where user_id=issuer;
 if not found then raise exception 'Acesso anterior já foi transferido'; end if;
 update private.boladelas_handoffs
 set redeemed_at=now()
 where token_hash=encode(extensions.digest(access_token,'sha256'),'hex');
 return true;
end;
$$;
revoke all on function public.boladelas_claim_handoff(text) from public, anon;
grant execute on function public.boladelas_claim_handoff(text) to authenticated;

-- Não expõe IDs/dados privados; serve apenas para bloquear telas de pessoas não autorizadas.
create or replace function public.boladelas_can_access()
returns boolean language sql stable security definer set search_path=''
as $$ select private.boladelas_is_admin(); $$;
revoke all on function public.boladelas_can_access() from public, anon;
grant execute on function public.boladelas_can_access() to authenticated;
