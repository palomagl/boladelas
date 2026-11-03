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

**Estado atual:** com as variáveis Supabase configuradas, o aplicativo exige login e carrega/grava os registros nas tabelas remotas. Ainda é necessário validar os fluxos reais de criação, atualização e exclusão no Samsung. Foi adicionada uma primeira sincronização offline por aparelho: após abrir com internet, alterações feitas sem conexão ficam pendentes no armazenamento local desta conta e são reenviadas ao reconectar. **Ainda é necessário validar no Samsung os cenários de queda de rede, recarregar página, sessão expirada, falta de espaço e alterações feitas em mais de um aparelho.** Não registre movimentações financeiras reais antes desses testes.

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

## Modo offline (primeira implementação)

- Abra o aplicativo **com internet pelo menos uma vez**, autentique e carregue os dados antes de ficar offline.
- Durante a queda de conexão, o app mostra **Sem conexão** e guarda um snapshot local (armazenamento do navegador por UID), marcando os registros como pendentes.
- Quando o navegador detectar internet novamente, tenta salvar os dados pendentes no Supabase. Caso haja erro, mantém a pendência e disponibiliza **Tentar sincronizar**.
- **Não limpe os dados do site, não desinstale o PWA e não use navegação anônima** enquanto houver alterações pendentes.
- O modo offline desta versão é pensado para **uma organizadora usando um único aparelho**. Atualizações simultâneas em aparelhos diferentes ainda não possuem resolução de conflitos e podem sobrescrever registros; é necessária uma arquitetura de sincronização incremental antes de usar em vários dispositivos.
- Os dados no armazenamento do navegador não são criptografados por este projeto. Proteja o Samsung com bloqueio de tela e não compartilhe a sessão.
- Se o login expirar sem internet, pode ser necessário reconectar para autenticar. É importante validar esses cenários antes da entrega.
