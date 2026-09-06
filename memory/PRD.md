# Pedidos.app — Cardápio Digital Multi-Lojista

## Original problem
Sistema de cardápio digital + pedidos online mobile-first para restaurantes/bares/lanchonetes, multi-lojista (cada lojista em /slug), com painel admin completo (produtos, categorias, adicionais, pedidos com fluxo de status), autenticação de lojista e armazenamento de imagens. Primeiro tenant demo: "Tá Na Hora — Bar e Lanchonete" (Itu-SP), 17 produtos de marmitas P/M/G.

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT em cookie httpOnly + Bearer fallback. bcrypt. Object storage Emergent (integration proxy) para uploads.
- Frontend: React 19 + React Router 7, TailwindCSS + shadcn/ui, Sonner. Fontes: Outfit + Plus Jakarta Sans + JetBrains Mono. Tema dark #0D0D0F com laranja #FF5500.
- Multi-tenancy: cada `user` tem `lojista_id`; endpoints `/api/admin/*` filtram por esse id.

## Personas
- Cliente final (mobile): navega cardápio, adiciona ao carrinho, faz checkout com dados de entrega/pagamento.
- Lojista (owner): loga no /admin, gerencia produtos/categorias/pedidos/configurações da própria loja.
- Super-admin (futuro): visão de todos os lojistas.

## Core requirements (delivered)
- Storefront público em /{slug} com hero, chips de categoria, cards de produto, dialog detalhado (P/M/G + adicionais + observação + qty), floating cart bar e sheet de carrinho.
- Checkout completo (delivery/retirada, pix/dinheiro/cartão, troco, endereço).
- Sucesso do pedido com número sequencial (counters por lojista).
- Painel admin: Dashboard (KPIs + últimos pedidos), Pedidos (filtro por status + avançar/cancelar), Produtos (CRUD + upload imagem + toggle), Categorias (CRUD com ícones + ordem + status), Configurações (logo/capa/nome/descrição/contatos/horário/taxa entrega).
- Auth JWT + seed do owner (santaterezinhaferrovelho@gmail.com).
- Object storage Emergent para logo/capa/fotos de produtos (upload via /api/admin/upload, download via /api/files/{path}).

## What's been implemented (2026-02-XX)
- server.py completo com auth, storage, tenants, categorias, produtos, pedidos, dashboard.
- Frontend com todas as rotas públicas e admin, contexto de auth + carrinho, componentes shadcn.
- Seed automático: lojista tanahora + owner + categoria Marmitas + 17 produtos placeholder editáveis (P=20, M=25, G=30) + 4 adicionais.
- Painel Super-Admin (2026-02): listar/criar/desativar/excluir lojistas com contagem de produtos e pedidos; endpoints /api/super/*, gate is_super_admin=True no owner seed.
- Aviso sonoro + destaque de pedido novo (2026-02): utilitário Web Audio (`lib/sound.js`) toca chime a cada pedido detectado no polling de 10s; toggle ON/OFF persistido em localStorage; badge de "N novos" no título e ring laranja + animate-pulse + fita "NOVO PEDIDO" no card por 20s.
- Impressão de comanda (2026-02): rota /admin/orders/:id/print com layout 80mm (Courier, dashes, carimbo OBRIGADO); auto-abre window.print() ao carregar; botão "Imprimir" em cada card e auto-abertura ao avançar para "Aceito"; seção **ENTREGA** com endereço em bold; endpoint GET /api/admin/orders/:id.
- Cadastro público de lojista (2026-02): POST /api/auth/register cria lojista + owner + auto-login (cookie); GET /api/auth/check-slug/:s valida disponibilidade em tempo real; tela /admin/register com preview da URL pública, slug slugificado automaticamente do nome, e status live (available/taken/invalid); slugs reservados: admin/api/super/public/files.
- Testing agent: backend 100%, frontend ~90% (fluxos-core verificados).

## Backlog (priorizado)
### P1
- Compartilhamento por QR Code do link /slug.
- Domínio próprio por lojista.

### P2
- Integração Pix (link/QR de pagamento).
- Integração WhatsApp (envio automático de confirmação).
- Cupons de desconto.
- Taxa de entrega por bairro.
- Impressão de comanda (janela dedicada).
- Cadastro/histórico de clientes.
- Relatórios avançados / produtos mais vendidos.
- Domínio próprio por lojista.
