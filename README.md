# Casal no Controle 

Crie um web app mobile-first de controle financeiro pessoal para um casal. Priorize a fundação técnica e não implemente recursos avançados nesta etapa.



ESSENCIAL:

- Criar projeto funcional e responsivo.

- Conectar Supabase de verdade.

- Criar autenticação por email e senha.

- Cada pessoa possui seu próprio login.

- Criar uma conta financeira compartilhada do casal.

- Dois usuários diferentes podem pertencer à mesma conta compartilhada e visualizar os mesmos dados financeiros.

- Os dados devem ficar persistidos no Supabase e protegidos para que usuários externos não tenham acesso.

- Preparar a estrutura de banco e permissões corretamente.



CRIAR APENAS:

1. Login e cadastro.

2. Início.

3. Movimentações.

4. Contas.

5. Metas.

6. Navegação inferior minimalista.



MOVIMENTAÇÃO:

Estrutura básica para salvar entrada ou gasto com:

- descrição

- valor

- categoria

- data de vencimento

- status pago ou em aberto



DESIGN:

Mobile-first, elegante e minimalista. Fundo quase branco, preto suave como cor principal e pequenos detalhes sutis em verde, azul acinzentado e bege. Muito espaço em branco, cards simples e bordas suaves. Use a imagem de referência enviada como guia visual e mantenha a página inicial próxima desse padrão. Não criar logo nesta etapa.



IMPORTANTE:

Não implemente agora recorrência, parcelamento, notificações, limites, relatórios, gráficos ou outras automações. Use dados fictícios apenas quando necessário para demonstrar a interface. Priorize Supabase, autenticação, compartilhamento seguro dos dados do casal, persistência e código organizado para futura edição pelo GitHub.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/90a58458-60e9-4acb-9e64-aaf95f8e8e3b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
