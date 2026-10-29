# BolaDelas ⚽

**O jogo é delas. A organização também.**

Aplicativo mobile-first para futebol entre amigas, com importação de listas do WhatsApp, cadastro único de jogadoras e apelidos, gols por rodada, artilharia anual, Pix/dinheiro/pendências e histórico.

## Rodar localmente

```bash
npm install
npm run dev
npm run build
npm test
```

## Estrutura

- `src/App.tsx` — interface e fluxos de registro
- `src/model.ts` — tipos, importação e cálculos
- `src/style.css` — identidade visual responsiva
- `public/` — ícones e PWA

## Importante

Esta é uma versão inicial para validação. Os dados são armazenados **somente neste navegador** via `localStorage` e começam com dados ilustrativos. Ainda não há login, sincronização, banco remoto ou conferência bancária automática. Exporte backups JSON; não use como único registro financeiro antes de implantar persistência segura.

As listas de cada rodada são independentes; as jogadoras têm IDs únicos. Apelidos cadastrados são associados ao mesmo perfil e o ranking é calculado por temporada.
