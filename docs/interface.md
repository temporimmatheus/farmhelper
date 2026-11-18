# Interface do Farm Helper — etapas 1 a 3

Esta entrega implementa a arquitetura das telas, os padrões visuais e a navegação. A composição dos cartões de monstros e das comparações mantém os indicadores existentes. O refinamento desses componentes, a navegação mobile dedicada e as otimizações de desempenho continuam nas etapas seguintes.

## 1. Arquitetura das telas

| Região | Desktop | Tela estreita |
| --- | --- | --- |
| Cabeçalho | Marca, Explorar/Comparar e estado da sincronização | Elementos reorganizados em linhas, sem remover controles |
| Personagem | Configuração em faixa horizontal | Campos em duas colunas |
| Progresso | Experiência e mana em dois painéis | Painéis empilhados, presentes nas duas telas |
| Explorar | Navegador à esquerda e mapa flexível à direita | Navegador e mapa empilhados |
| Navegador | Busca comum e abas Áreas/Monstros | Mesmas abas, listas com altura limitada |
| Alvo selecionado | Terceira coluna a partir de 1440 px; abaixo do mapa em larguras intermediárias | Painel abaixo do mapa |
| Comparar | Tela própria com seleção compartilhada | Mesmo conteúdo, uma coluna |

Selecionar uma área abre sua aba Monstros. Selecionar um monstro abre seus detalhes e o mantém como referência para XP e MP. Fechar os detalhes libera espaço sem apagar a seleção. Os painéis de progresso ficam fora das duas telas, portanto continuam disponíveis ao alternar entre elas.

Comparar suporta uma seleção vazia com orientação e atalho para Explorar. O contador da navegação acompanha a seleção. “Ver no mapa” retorna à exploração, limpa a busca e amplia o escopo quando necessário para mostrar a área escolhida.

## 2. Padrões visuais

As decisões compartilhadas ficam em `src/styles/tokens.css`:

| Papel | Padrão |
| --- | --- |
| Fundo da aplicação | Grafite `--bg` |
| Painéis e campos | `--surface`, `--surface2`, `--surface-input` |
| Texto | `--text`, `--muted`, `--subtle` |
| Navegação, seleção e foco | Dourado `--gold` e suas superfícies |
| Experiência e indicadores positivos | `--mint`, `--green` |
| Falha de sincronização | `--danger` |
| Espaçamento | Escala 4, 8, 12, 16, 24 e 32 px |
| Bordas arredondadas | 8, 12 e 18 px |
| Tipografia | Escala em rem, números tabulares nos indicadores |
| Layout | Largura máxima da página e larguras dos painéis como variáveis |

A marca usa o SVG já aprovado, com duas hastes douradas e sem V central. Há foco visível, atalho para o conteúdo, estados selecionados identificáveis e respeito à preferência de movimento reduzido.

## 3. Composição e navegação

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura semântica, regiões, controles e relações de acessibilidade |
| `src/features/shell/shell-controller.js` | Tela ativa, abas, painel contextual e resumo da seleção |
| `src/features/shell/shell.css` | Cabeçalho e composição das regiões |
| `src/styles/tokens.css` | Valores visuais compartilhados |
| `src/styles/base.css` | Elementos e padrões comuns |
| `src/features/map/map.css` | Estilos do mapa e dos marcadores |
| `src/features/progress/progress.css` | Estilos de XP e MP |
| `src/styles/responsive.css` | Adaptações de layout por largura |

O shell recebe o estado e o modelo existentes. Não mantém uma cópia do personagem nem altera as fórmulas. Os registros `VIEWS` e `BROWSER_TABS` concentram a relação entre botões e painéis. Para acrescentar uma tela, crie sua região HTML, registre-a em `VIEWS` e componha o recurso em `app.js`.

As abas usam `aria-selected`, `aria-controls`, foco alternado e navegação por setas, Home e End. A navegação principal usa `aria-current`. Painéis inativos usam o atributo `hidden`; a regra global correspondente evita que estilos de componentes os tornem visíveis acidentalmente.

Os elementos existentes permanecem montados ao alternar telas e abas, preservando campos, seleção e rolagem. As mudanças na geometria avisam o mapa para atualizar seu enquadramento. A limpeza de listeners do shell acompanha `destroy()` da aplicação.

## Verificação

Execute `npm run verify`. Os testes de integração cobrem alternância de telas com XP/MP compartilhados, teclado nas abas, preservação da rolagem, abertura/fechamento do alvo, restauração de seleção e retorno da comparação ao mapa.

Os testes usam o adaptador de DOM do projeto. A conferência de layout em navegador real deve incluir larguras de 360, 768, 1024 e 1440 px, zoom do navegador em 200%, região com nome longo e navegação por teclado.
