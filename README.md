# BolaDelas ⚽

**O jogo é delas. A organização também.**

Aplicativo mobile-first para futebol entre amigas: importar lista do WhatsApp, gols por rodada, artilharia anual, Pix/dinheiro, pendências e doações.

## Rodar localmente

```bash
npm install
npm run dev
npm run build
npm test
```

## Banco de dados — configuração segura (não ativado no app ainda)

1. Crie um projeto no [Supabase](https://supabase.com/dashboard).
2. Em **SQL Editor**, execute nesta ordem:
   - `supabase/migrations/20261029_initial.sql`
   - `supabase/migrations/20261103_single_admin.sql`
3. Em **Authentication → Providers → Email**, habilite login por e-mail e senha. Em **Authentication → Users**, crie manualmente **uma usuária**; confirme o e-mail conforme a configuração do projeto.
4. Em **Authentication → Settings / General**, desative **Allow new users to sign up** e **Allow anonymous sign-ins**. Deixe recuperação de senha por e-mail habilitada se tiver SMTP configurado corretamente.
5. Copie o **UUID (User UID)** da usuária em Authentication → Users. Execute no **SQL Editor** (não versionar o UUID):
   ```sql
   insert into private.boladelas_admin (user_id)
   values ('SUBSTITUA-PELO-UUID-DA-ADMINISTRADORA');
   ```
   O banco impede cadastrar uma segunda administradora, mesmo por engano.
6. Configure na **Vercel → Project → Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   Consulte `.env.example` para os nomes.
7. Faça um novo deploy após ajustar as variáveis.

**Muito importante:** esta etapa só PREPARA o banco e o cliente. O aplicativo atual **ainda usa dados de demonstração no localStorage**. Não interprete a configuração da Vercel como ativação de sincronização. A próxima etapa de desenvolvimento será integrar login, importação inicial com confirmação, persistência remota, erros de rede e sincronização offline. Não comece a operar pagamentos reais antes de testar esse fluxo.

### Segurança

- A migração `20261103_single_admin.sql` revoga privilégios anônimos, mantém RLS nas quatro tabelas e só permite leitura/gravação à conta existente em `private.boladelas_admin` que seja dona dos registros.
- `private.boladelas_admin` não é exposta para leitura/escrita do navegador. A autorização é consultada por função protegida fora do esquema público.
- Nunca publique **senha do banco, service_role, secret API key, access token ou session token** no GitHub, na Vercel como `VITE_...`, nem nesta conversa.
- Apenas a **publishable key** do cliente pode aparecer no front-end; segurança vem das regras do banco. Não confunda esta chave com autorização.
- É recomendável habilitar MFA para a conta quando a autenticação final estiver integrada.
- O PWA atual possui cache offline, mas **não possui sincronização offline confiável** nem armazenamento seguro entre aparelhos.

## Código

- `src/App.tsx` — interface e fluxos de registro
- `src/model.ts` — regras de negócio
- `src/lib/supabase.ts` — cliente Supabase preparado, ainda não ligado ao app
- `supabase/migrations/` — estrutura e regras de acesso
- `public/` — ícones e PWA
