# Murdle - Quadro Lógico de Dedução

Aplicativo interativo para resolver puzzles do tipo **Murdle** (logic grid puzzle). Gera o quadro lógico com três matrizes de relação e aplica regras de consistência automaticamente.

## Funcionalidades

- Três grids interativos: Suspeitos × Armas, Suspeitos × Locais, Armas × Locais
- Clique para alternar: vazio → ✕ → ✓ → vazio
- Regras automáticas de consistência (eliminação, auto-completar, propagação entre matrizes)
- Categorias configuráveis (3×3, 4×4, 5×5, etc.)
- Desfazer (undo) com histórico
- Detecção de puzzle resolvido

## Deploy no Vercel

1. Crie um repositório no GitHub e faça push deste projeto
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Framework Preset: **Vite**
4. Clique em **Deploy**

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Stack

- React 18
- Vite 6
- CSS-in-JS (inline styles)
