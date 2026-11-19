# Farm Helper

Atlas de farm para **Lineage II Reborn · Chronicle 1**, extraído do HTML original para uma aplicação JavaScript modular. Mantém os 202 monstros, o ranking de áreas, os mapas, a comparação entre regiões, a barra de XP e as estimativas de MP.

## Rodar localmente

Requer **Node.js 22 ou superior**. Não há pacotes externos para instalar.

```sh
npm run dev
```

Abra **http://localhost:5173**. O servidor fica restrito ao computador local. Após editar um arquivo, atualize a página para carregar a alteração.

Use o servidor em vez de abrir `index.html` com duplo clique: os módulos ES precisam de uma origem HTTP. O arquivo original `FARM_HELPER.html` foi preservado na pasta como referência e está fora do versionamento.

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia o servidor local na porta 5173 |
| `npm run import:c1 -- "<caminho>"` | Importa monstros e bosses de um datapack C1 local autorizado |
| `npm run check` | Verifica a sintaxe e os imports dos módulos |
| `npm test` | Executa os testes unitários e de regressão |
| `npm run test:integration` | Verifica a montagem da aplicação e os fluxos dos controles |
| `npm run build` | Gera a pasta `dist/` para hospedagem estática |
| `npm run preview` | Serve o build de `dist/` localmente |
| `npm run verify` | Executa todas as verificações e gera o build |

Para usar outra porta, defina a variável de ambiente `PORT` antes de executar o servidor.

## Estrutura

A nova interface tem navegação **Explorar/Comparar**, personagem e progresso compartilhados, cartões de alvos, camadas do mapa e comparação por indicadores alinhados. No celular, há navegação **Áreas/Mapa/Monstros**, resumo compacto de XP/MP e detalhes em painel inferior. Os padrões e a organização das seis primeiras etapas estão em [docs/interface.md](docs/interface.md).

| Local | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura semântica da interface, sem lógica ou imagens em base64 |
| `src/main.js` | Entrada da aplicação |
| `src/app.js` | Composição dos módulos e atualização dos painéis |
| `src/core/` | Formatação, validações auxiliares e acesso tolerante a falhas ao armazenamento |
| `src/state/` | Estado do personagem, limites dos campos e salvamento automático |
| `src/data/` | Catálogo de monstros, tabela de XP e calibração dos mapas |
| `src/domain/` | Cálculos de farm e XP, projeção de coordenadas e leitura do datapack C1 |
| `src/services/` | Cache de spawns, sincronização e fontes HTTP |
| `src/features/areas/` | Ranking e detalhes de monstros |
| `src/features/progress/` | Barra de experiência e painel de mana |
| `src/features/compare/` | Comparação de áreas |
| `src/features/map/` | Mapa, heatmap, marcadores e interações de mouse/toque |
| `src/features/shell/` | Composição das telas, navegação e detalhes contextuais do alvo |
| `src/features/mobile/` | Navegação mobile, configuração expansível e painel inferior do alvo |
| `src/assets/maps/` | Imagem local do mapa de Aden |
| `src/styles/` | Estilos gerais e regras responsivas |
| `src/styles/tokens.css` | Cores, tipografia, espaçamentos e dimensões compartilhadas |
| `src/ui/` | Referências ao DOM e eventos dos controles |
| `src/ui/components.js` | Componentes compartilhados de etiquetas, métricas, estatísticas e ícones |
| `scripts/` | Servidor, verificação e build usando apenas Node.js |
| `tests/` | Testes unitários, integração e resultados de referência da versão original |
| `.github/workflows/ci.yml` | Verificação automática em pushes e pull requests |

O domínio não acessa o DOM ou a rede. Os serviços recebem suas dependências por parâmetros e podem ser testados com fontes locais. Os painéis recebem o estado e o modelo de cálculo; `app.js` conecta essas partes. As interações do mapa têm ciclo de montagem e limpeza próprios.

## Como evoluir

- **Novos monstros:** edite `src/data/monsters.js`, mantendo os IDs únicos. Áreas são agrupadas automaticamente pelo campo `zone`.
- **Importar um catálogo C1:** execute `npm run import:c1 -- "C:\caminho\para\o\datapack"` com uma cópia autorizada que contenha `script\NpcData` e `script\NpcPos` (ou passe diretamente a pasta `script`). O importador inclui templates de monstros/bosses que aparecem nos arquivos `.pos`, junto das localizações fixas e territórios encontrados, agrupa-os pela pasta de região e grava o resultado em `src/data/imported-monsters.js`. Os 202 registros atuais prevalecem em caso de nomes repetidos. A agressividade não inferível fica marcada como desconhecida. O diretório `99_customs` é ignorado.
- **Novas fórmulas:** altere `src/domain/farm-model.js` ou `src/domain/progress.js`. Atualize os testes de referência somente se a mudança no resultado for intencional.
- **Outra fonte de spawns:** implemente `listFiles()` e `getFile(path)` e injete a fonte em `createApp({ source })` ou no serviço de sincronização.
- **Novo painel:** crie uma pasta em `src/features/`, adicione a estrutura ao HTML e conecte a renderização em `src/app.js`.
- **Outra crônica:** mantenha catálogos, XP e fontes em conjuntos próprios e selecione-os na composição da aplicação. O conjunto atual continua sendo exclusivamente C1.

## Dados salvos e funcionamento sem conexão

- A primeira abertura inicia no **nível 0**; XP e kills são habilitados ao informar um nível entre 1 e 40.
- Nível, ataques, busca, seleção de área/monstro, comparação, mundo, XP e consumo de MP são salvos automaticamente no navegador.
- As chaves da versão anterior foram mantidas: `legacy-c1-v20-state`, `legacy-c1-v8-spawns` e `legacy-c1-v10-auto-metadata`.
- O armazenamento é separado por origem do navegador. Dados de um HTML aberto por `file://` não são transferidos automaticamente para `http://localhost:5173`; informe suas configurações novamente nessa primeira abertura. Mudar entre `localhost` e `127.0.0.1`, ou trocar a porta, também cria outra origem.
- O catálogo, os cálculos e o mapa de Aden são locais. Consultar novos spawns e carregar a imagem de Elmore requer internet. Spawns já salvos continuam disponíveis quando a consulta falha.
- O serviço usa GitHub e uma alternativa pública por CDN. Atualizações incompletas mantêm os dados obtidos e podem ser tentadas novamente.
- Cache inválido ou armazenamento indisponível não impedem o uso. Se o navegador bloquear a gravação, as alterações ficam somente na sessão atual.

## Build e publicação

```sh
npm run verify
npm run preview
```

Publique o **conteúdo de `dist/`** em uma hospedagem estática. Os caminhos são relativos e suportam publicação em subpastas. O build copia somente o HTML de entrada, o favicon e `src/`; não inclui o HTML antigo, testes ou metadados do Git. Os arquivos permanecem como módulos legíveis, sem etapa de minificação.

Para registrar os arquivos no Git e criar um repositório público com o GitHub CLI já instalado e autenticado, a partir desta pasta, em um terminal com acesso de escrita ao `.git` e conexão ao GitHub:

```sh
git add .editorconfig .gitattributes .github .gitignore README.md favicon.svg index.html package.json package-lock.json scripts src tests
git commit -m "Refactor Farm Helper into modular application"
gh repo create FarmHelper --public --source . --remote origin --push
```

Se o repositório de destino já existir, configure a URL dele como `origin` e execute `git push -u origin main`.

## Verificação e limites

Os testes incluem resultados de ranking extraídos do HTML original para os níveis 0, 17 e 40 em estilos mágico e físico; XP, MP e persistência; parser, deduplicação e sincronização de spawns; calibração dos mapas; e integração entre a estrutura HTML, controles e painéis.

Os testes de integração usam um adaptador mínimo de DOM, sem navegador. Eles verificam os eventos e resultados da aplicação, mas não substituem uma revisão visual, de layout responsivo ou dos gestos em um navegador real.

As fórmulas e as limitações do atlas foram preservadas: o índice é comparativo, não XP/h medido; HP ×1,6 é uma hipótese da versão original; defesas estimadas estão identificadas; as coordenadas e territórios históricos C1 podem divergir do Reborn. O gasto de MP é bruto, sem regeneração.

Spawns: [Master Toma · datapack C1](https://github.com/master-toma/l2datapack). A imagem externa de Elmore e a imagem de Aden são as mesmas referências do HTML fornecido.
