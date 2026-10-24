# Referência de legislação brasileira

Este ramo mantém uma referência versionada ao repositório original [ctresb/leis](https://github.com/ctresb/leis), sem copiar o corpus para o repositório SocialTrade e sem incluí-lo no aplicativo ou no processo de publicação.

## Versão vinculada

- Submódulo: `referencias/leis-brasileiras`
- Repositório de origem: <https://github.com/ctresb/leis>
- Ramo upstream: `main`
- Commit fixado neste ramo: `15eb09b618ff08a38c4dfee06a91bd139d093f5d`
- Licença informada pela origem: os scripts estão sob MIT; os textos de normas são atos oficiais. Consulte o [LICENSE upstream](https://github.com/ctresb/leis/blob/main/LICENSE).

O ponteiro do submódulo fixa uma versão. Atualizações na origem não alteram este ramo automaticamente. Para obter o conteúdo completo, inicialize o submódulo explicitamente:

```powershell
git submodule update --init --depth 1 referencias/leis-brasileiras
```

O GitHub informa cerca de 4,2 GB para o repositório de origem. O download do submódulo foi intencionalmente deixado desativado: para consultar as normas, use o link de origem; inicialize o acervo local apenas se realmente precisar dele.

## Escopo e limitações declaradas pela origem

O README da origem contabiliza 323.849 normas em Markdown, coletadas de fontes oficiais federais e estaduais. O próprio projeto informa que o acervo está incompleto: há lacunas por estado e categoria, textos obtidos por OCR podem conter erros e parte do conteúdo infralegal, jurisprudencial e municipal ainda não foi coletada. A cobertura e as pendências atuais devem ser conferidas nos arquivos [COBERTURA.md](https://github.com/ctresb/leis/blob/main/COBERTURA.md), [PROGRESSO.md](https://github.com/ctresb/leis/blob/main/PROGRESSO.md) e no README upstream.

Os arquivos desta referência são material de pesquisa. Eles não atestam vigência, interpretação, adequação tributária ou conformidade do SocialTrade. Antes de implementar uma modalidade de doação ou anunciar benefício fiscal, confira o texto e a vigência em fontes oficiais — começando pela [Legislação Federal do Planalto](https://www.planalto.gov.br/ccivil_03/) e pelo [Portal de Legislação do Senado](https://www25.senado.leg.br/web/atividade/legislacao) — e valide o fluxo concreto com assessoria contábil e jurídica.

## Uso no SocialTrade

Este ramo contém apenas a referência documental ao acervo. O backend não consulta o submódulo, não classifica doações como dedutíveis e não bloqueia ou autoriza operações com base em textos legais. A rede Solana também não substitui essa análise: um hash público pode ajudar a demonstrar que determinado registro foi ancorado, mas não certifica que a fonte estava correta ou que a operação cumpriu a lei.
