# Interface do Farm Helper — etapas 1 a 6

Esta entrega implementa a arquitetura das telas, os padrões visuais, a navegação, os componentes, a apresentação do mapa e da comparação e a experiência mobile dedicada. A validação visual completa em navegadores reais e as otimizações de desempenho continuam nas etapas seguintes.

## 1. Arquitetura das telas

| Região | Desktop | Tela estreita |
| --- | --- | --- |
| Cabeçalho | Marca, Explorar/Comparar e estado da sincronização | Elementos reorganizados em linhas, sem remover controles |
| Personagem | Configuração em faixa horizontal | Campos em duas colunas |
| Progresso | Experiência e mana em dois painéis | Resumo compacto fixo durante a rolagem e edição expansível |
| Explorar | Navegador à esquerda e mapa flexível à direita | Uma seção por vez: Áreas, Mapa ou Monstros |
| Navegador | Busca comum e abas Áreas/Monstros | Navegação inferior com listas e rolagem preservadas |
| Alvo selecionado | Terceira coluna a partir de 1440 px; abaixo do mapa em larguras intermediárias | Painel inferior modal com o mesmo conteúdo |
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
| Consumo de mana | `--mana`, `--mana-surface`, `--mana-line` |
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

No desktop, o painel do mapa acompanha a altura disponível na linha do navegador lateral. Sua área interativa cresce entre os controles e a legenda, mantendo as informações de rodapé na base e evitando um vazio externo quando a lista de monstros é mais alta. O navegador e o painel do alvo mantêm sua altura natural. Em telas estreitas, o mapa conserva sua altura própria ao ser empilhado.

## 4. Componentes e hierarquia dos indicadores

Os componentes em `src/ui/components.js` e `src/ui/components.css` definem ícones SVG, etiquetas, métricas, estatísticas curtas e mensagens sem resultados. Os valores e textos são escapados antes de formar HTML. Os estilos específicos de área e comparação ficam nas pastas de cada funcionalidade; o CSS básico mantém os elementos comuns.

- A linha inteira de uma área é um botão com estado de seleção explícito. O índice /100 é relativo às áreas da lista atual.
- Cartões de monstros apresentam XP, HP e defesa em colunas, índice relativo dentro da área, agressividade, qualidade da defesa e registros C1. O alvo atual recebe contorno, etiqueta textual e `aria-pressed`.
- O painel de experiência identifica separadamente o alvo de referência e se sua escolha foi automática ou explícita. A barra, a porcentagem e os indicadores permanecem disponíveis em Explorar e Comparar.
- O painel de mana usa uma cor semântica própria e unidades junto dos campos. Os cálculos continuam usando a mesma média informada de skills por kill.
- O painel contextual identifica agressividade e qualidade da defesa do alvo.

## 5. Mapa e comparação

### Mapa

Os comandos de enquadramento ficam fora da área de arraste e são distintos: **Mapa** mostra o mundo inteiro; **Região** considera os registros de todos os monstros da área; **Alvo** considera somente o monstro selecionado. Comandos sem registros correspondentes ficam desabilitados. O indicador de zoom é relativo ao mapa enquadrado, não à escala real de terreno.

As camadas **Concentrações** e **Posições** podem ser ocultadas separadamente. Essa escolha permanece durante a navegação e as edições da sessão, mas reinicia ao recarregar a aplicação. Ocultar concentrações também fecha a concentração aberta e impede a seleção de manchas invisíveis.

A legenda distingue concentrações, posições fixas e o alvo, que usa um marcador dourado em losango. Posições fixas continuam aparecendo a partir de 2,4× de zoom. Amostras de território são aproximações e não se tornam marcadores de posições fixas; o aviso e a legenda respeitam essa diferença. A seleção do mundo usa `aria-pressed`.

### Comparação

Cada área tem um cartão de resumo com seu índice, alvo líder e ação de retorno ao mapa. É possível remover uma área individualmente. Com apenas uma seleção, um espaço orienta a escolha da segunda. Com duas seleções, a tabela alinha os mesmos indicadores por linha.

Os destaques consideram maior índice, maior XP/kill, menor número de kills e menor consumo de MP. HP, defesa, variedade de monstros e registros C1 não recebem indicação automática de melhor resultado. Empates e valores indisponíveis também não recebem destaque.

As estimativas de kills, MP e XP/MP usam `calculateProgress`, a mesma função do painel de progresso. No nível zero elas ficam indisponíveis. Com consumo de MP igual a zero, XP/MP aparece como indisponível em vez de infinito. O índice é arredondado a uma casa para comparação visual e os empates consideram essa precisão. As fórmulas do ranking não foram alteradas.

## 6. Experiência mobile dedicada

O modo mobile é ativado até 760 px de largura ou até 1024 px em dispositivos com ponteiro de toque. A mudança de modo responde à largura atual, inclusive ao girar o aparelho. Não usa identificação por navegador.

### Navegação e edição

A barra inferior oferece **Áreas**, **Mapa** e **Monstros**, mostrando uma seção por vez. As três abas usam `aria-selected`, foco alternado e teclado com setas, Home e End. Os elementos permanecem montados: a rolagem interna das listas, o mundo e o zoom do mapa são mantidos ao trocar abas. O enquadramento solicitado enquanto o mapa está oculto é aplicado quando ele volta a ter dimensões visíveis.

O resumo compacto acompanha a rolagem e mostra nível, porcentagem/barra de XP, XP restante, MP por skill, MP por kill, kills/MP até subir e alvo de referência. Ele usa o resultado da mesma função que alimenta o painel completo. O botão **Configurar** abre os campos existentes de personagem, experiência e mana, sem criar inputs ou configurações duplicados. Há também um atalho para Comparar com contador de áreas selecionadas.

A altura real do resumo informa o espaço das listas. A navegação inferior e o painel do alvo respeitam as áreas seguras do aparelho. Campos usam fonte de 16 px no modo mobile. Em janelas de pouca altura, o resumo reduz informações secundárias para liberar espaço.

### Painel inferior do alvo

O controlador mobile move o mesmo painel de detalhes para um `<dialog>` nativo. A abertura modal mantém o foco dentro do painel e torna o restante da página inerte. O botão de fechar, Esc e o toque fora da área do painel fecham a apresentação, preservando o monstro selecionado como referência de XP/MP. O foco retorna à aba de origem. O atalho **Detalhes** no resumo permite reabrir a seleção.

Ao voltar para desktop, o conteúdo retorna à posição original no workspace. O modal é fechado, a rolagem da página é liberada e os painéis completos de configuração/progresso reaparecem. Ao destruir a aplicação, listeners de mídia e observadores também são removidos.

Os arquivos `src/features/mobile/mobile-controller.js` e `mobile.css` concentram esse comportamento. A camada mobile controla apresentação e navegação; não mantém uma segunda cópia do personagem nem modifica as fórmulas.

## Verificação

Execute `npm run verify`. Além dos fluxos anteriores, os testes cobrem estados dos cartões, remoção individual de áreas, alinhamento dos indicadores, camadas do mapa, enquadramentos distintos, territórios sem posições fixas e estimativas com nível zero ou MP zero.

Os fluxos mobile cobrem resumo e edição compartilhados, abas, conservação de rolagem/zoom, fechamento do painel inferior, retorno de foco, acesso à comparação, transição desktop/mobile, enquadramento após ocultação e limpeza do modal e dos listeners.

Os testes usam o adaptador de DOM do projeto. A conferência de layout em navegador real deve incluir larguras de 360, 768, 1024 e 1440 px, zoom do navegador em 200%, região com nome longo e navegação por teclado.
