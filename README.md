# Black Visionária — checkout Pix

Checkout responsivo baseado na oferta [Combo Black Visionária Vitalícia](https://chk.eduzz.com/ji3n4bn7), com pagamento exclusivo via Nexum Pay. Valor: **R$ 247,00**, definido no servidor em `lib/checkout.js`.

## Páginas

- `/`: cadastro do comprador, resumo, geração de QR Code/Pix copia e cola e acompanhamento do pagamento.
- `/obrigado`: exibida após a confirmação, com prazo de liberação **após dois dias**, WhatsApp **(75) 98839-3742** e [central de reembolso](https://reembolso-de-alunos.vercel.app/) para quem não quiser esperar.
- `/privacidade`: tratamento dos dados necessários à compra.

O aviso de dois dias e o link de reembolso estão na página de obrigado, não no checkout. Não há cartão, parcelamento ou boleto. A confirmação do Pix não automatiza a entrega do curso: a liberação continua com a equipe pelo canal informado.

## Executar

Requer Node.js 24. Não há dependências externas para instalar.

```sh
cp .env.example .env.local
# Preencher as variáveis no arquivo local, sem enviar ao Git.
npm run dev
npm test
npm run build
```

No Windows, use `Copy-Item .env.example .env.local`. Se o ambiente de execução impedir subprocessos, rode `node --test --test-isolation=none test/checkout.test.mjs`.

## Configuração na Vercel

Importe este repositório, escolha o preset **Other** e mantenha as configurações de `vercel.json`. Use o runtime Node.js 24.

| Variável | Necessidade |
| --- | --- |
| `NEXUM_CHAT_ID` | Chat ID da conta que receberá os pagamentos. |
| `NEXUM_API_CREDENTIAL` | Credencial fixa gerada no painel Nexum, em Integração. Salvar como Secret. |
| `NEXUM_ORIGIN` | Origem autorizada pela Nexum; padrão `https://nexumpaybot.com`. |
| `CHECKOUT_SESSION_SECRET` | Segredo aleatório com pelo menos 32 caracteres. Salvar como Secret. |
| `WHATSAPP_URL` | Opcional. Padrão `https://wa.me/5575988393742`. |

Gere `CHECKOUT_SESSION_SECRET` com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e cadastre diretamente no ambiente. Use valores distintos entre Preview e Production. Depois de alterar as variáveis, faça um novo deploy. Sem a configuração necessária o checkout informa indisponibilidade e bloqueia a geração de cobrança.

## Fluxo de pagamento

1. `POST /api/order` valida nome, CPF e confirmação do e-mail. Salva a preparação em cookie criptografado AES-256-GCM, HttpOnly, SameSite=Strict e Secure em HTTPS.
2. Somente depois de receber esse cookie, o navegador chama `POST /api/pix`. O servidor envia nome normalizado, CPF, e-mail, valor fixo e referência do pedido ao endpoint `/api/public/pix/create`.
3. Retentativas usam o mesmo corpo, `externalReference` e `Idempotency-Key`. A resposta HTTP 202/PROCESSING mantém o pedido e não gera confirmação falsa.
4. `GET /api/status` consulta a Nexum em intervalos de pelo menos 30 segundos pelo fluxo normal. Respostas 429 respeitam `Retry-After`. O navegador pausa consultas em segundo plano. Um cache por instância reduz consultas simultâneas; a API da Nexum é a autoridade de rate limiting global entre instâncias.
5. A confirmação exige transação correspondente, status pago documentado e valor integral. Só então `/api/receipt` fornece os dados da página de obrigado.
6. Em caso de falha, cancelamento ou expiração confirmados pelo provedor, o cliente pode reiniciar. O fim do contador local não autoriza uma nova cobrança por si só.

A Nexum é o registro persistente das transações. Este checkout usa consulta de status, **não depende de webhook nem de banco adicional**. O cliente precisa permanecer/retornar ao mesmo navegador para acompanhar a compra. Se os cookies forem apagados ou expirarem, a equipe deve consultar a transação no painel Nexum. Não há painel de pedidos, disparo automático de mensagens, estorno automático ou integração com área de membros neste escopo.

O cookie expira em sete dias; os dados do pagador são removidos da sessão quando o pagamento é confirmado. As respostas da API não são cacheadas. Credenciais e dados pessoais não são registrados nos logs. O segredo da sessão deve permanecer estável entre deploys, pois sua troca invalida sessões existentes.

## Validação

`test/checkout.test.mjs` verifica CPF, normalização, cifra e adulteração de sessão, preço fixo, idempotência, falhas de conexão, HTTP 202, cooldown, Retry-After, valores divergentes, origem dos POSTs, confirmação e reset seguro.

`node test/browser-fixture.mjs` sobe uma simulação **somente local** em `http://127.0.0.1:4174`, sem chamadas reais à Nexum e sem código de Pix pagável. A rota local `/fixture/paid` muda a resposta simulada para paga. Ela não é importada pela aplicação e não é servida na produção.

Antes de liberar vendas, valide a credencial real pelo endpoint `/api/public/auth/validate`, confirme que o limite da conta aceita R$ 247,00, confira `NEXUM_ORIGIN` com o provedor e realize uma transação de homologação autorizada. Os testes locais não substituem essa validação.

## Referências e imagens

- Contrato da API: [documentação Nexum Pay](https://app.nexumpaybot.com/api/index.html), consultada em 25/11/2026.
- Banner, capa e ícone Pix: arquivos do checkout de referência informado, mantidos em `public/assets`.
- O checkout usa sua própria integração Nexum; não utiliza cobrança Eduzz nem exibe selos de verificação Eduzz/GoDaddy.
