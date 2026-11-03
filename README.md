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

## Banco de dados — configuração segura

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

**Estado atual:** com as variáveis Supabase configuradas, o aplicativo exige login e carrega/grava os registros nas tabelas remotas. Ainda é necessário validar os fluxos reais de criação, atualização e exclusão no Samsung. A sincronização offline confiável não foi implementada; não registre movimentações financeiras reais sem testar recuperação de dados e comportamento de rede.

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

## Usar no celular

1. Acesse o domínio de produção publicado na Vercel e faça login com a conta autorizada no Supabase.
2. **Início → Novo jogo**: escolha a data e o valor e cole a lista numerada do WhatsApp.
3. **Rodadas**: abra um jogo já criado e atualize gols, presença e Pix/dinheiro.
4. **Ranking**: confira os gols acumulados na temporada.
5. **Caixa**: registre entradas, saídas e consulte pagamentos por rodada. Para saídas funcionar, execute `supabase/migrations/20261103_cash_expenses.sql` no Supabase.
6. **Jogadoras**: cadastre, corrija apelidos e exclua apenas perfis sem gols ou pagamentos.
7. Para sair da conta, use o ícone discreto de perfil no cabeçalho; não existe botão flutuante.

Antes de entregar à organizadora, confirme que criar uma rodada fictícia, editar gols e pagamentos e atualizar a página mantém tudo salvo. Confira também se a Vercel mostra o deploy atual como `Ready`.
