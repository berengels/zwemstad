# Zwemstad · installeerbare web-app

Versie 0.3: compacte donkere vormgeving geïnspireerd op Wasp, met gele accenten en zonder introductie- of promotieteksten.

Eén zwemagenda voor Rotterdam, gebaseerd op de bediening van de Cineville Agenda. Gebouwd met React Native, Expo en React Native Web. Eigen naam en vormgeving; geen relatie met Cineville.

**Online: https://berengels.github.io/zwemstad/**

GitHub Pages verzorgt de web-app; GitHub Actions controleert de bronnen vier keer per dag.

Zie [DEPLOYMENT.md](DEPLOYMENT.md) voor de accountkeuze, publicatie-instellingen, kosten en resterende beperkingen.

## Starten en bouwen

Gebruik Node.js 22.13 of nieuwer binnen de 22-reeks, of een andere door Expo ondersteunde versie. De hosting en workflow kiezen Node 22. Voor een GitHub-projectsite: `PAGES_BASE_PATH=/zwemstad npm run build`.

```sh
npm ci
npm run sync
npm run build
```

`npm run build` voert TypeScript, tests en de webbuild uit en controleert daarna het PWA-pakket. `dist/` bevat de publiceerbare website. Open deze via een lokale webserver, niet rechtstreeks als bestand. HTTPS is nodig voor installatie en offline gebruik buiten localhost.

`npm start`, `npm run ios` en `npm run android` blijven beschikbaar voor ontwikkeling van de mobiele code. Er zijn geen ondertekende IPA- of APK-bestanden gemaakt.

## Functionaliteit

Tijdlijn met begin- en eindtijden, dagkeuze, zoeken op activiteit/zwembad/wijk, meerdere baden selecteren, begintijdfilter, toekomstige starts en favoriete baden op dit apparaat. Geen account vereist voor bezoekers.

De app vraagt bij openen, terugkeren, elke vijf minuten en na een handmatige verversing de nieuwste gepubliceerde `schedule.json` op. Het installatiemanifest en de service worker voegen een appicoon, eigen venster en offline reserve toe. Offline gegevens blijven duidelijk gemarkeerd; er is geen garantie dat eerder geladen tijden nog gelden.

## Gegevens en beperkingen

Inventaris: de 15 openbare zwembaden op https://www.rotterdamzwemt.nl/. Privébaden, afzonderlijke zwemscholen, natuurwater en verenigingsroosters zijn niet volledig geïnventariseerd. De laatste ronde op 26 november 2026 bevat 750 momenten uit tien baden. De bronperiodes verschillen; dit is geen aantal per dag.

Sportbedrijf Rotterdam levert gedateerde dagroosters. Sportfondsen levert standaardweken; die worden alleen voor de komende zeven dagen getoond en krijgen het label Standaardweek. Onzekere uitzonderingen worden niet als bevestigde momenten gebruikt. Alexanderhof staat in de inventaris maar heeft nog geen importkoppeling; de website blokkeerde geautomatiseerd ophalen.

Bij Overschie, Hoogvliet, Pernis en Hoek van Holland stonden sluitingsmeldingen in de opgehaalde roosters. De exacte dagen staan per bron in `closedDates`. Er is geen heropeningsdatum aangenomen. Een leeg of onleesbaar rooster wordt nooit zelfstandig als sluiting geïnterpreteerd.

Multisportcentra publiceren ook sporten op het droge. De import selecteert herkenbare zwemactiviteiten. Volledigheid bij afwijkende activiteitnamen en vakantie-uitzonderingen moet nog met de beheerders worden afgestemd. Inschrijving, beschikbaarheid, prijzen en toegangsrechten worden niet bevestigd.

## Onderhoud

- `npm run sync`: openbare pagina's met maximaal twee gelijktijdige verzoeken ophalen.
- `npm run check`: TypeScript.
- `npm test`: parser-, filter-, bronuitval-, validatie- en serviceworkertests.
- `npm run health`: bronuitval en verouderde broncontroles signaleren.
- `npm run build:web`: website exporteren, PWA toevoegen en pakket controleren.

Bij een mislukte bron blijven oude gegevens met hun oorspronkelijke controletijd bewaard. Er wordt via een tijdelijk bestand atomair opgeslagen. De app bewaart lokaal alleen favorieten en een roosterreserve. Externe bronlinks openen de site van het zwembad.

De Node-import en webbuild draaien in GitHub Actions. Een ophaalronde bewaart de nieuwe gegevens en publiceert de gebouwde app via GitHub Pages. De workflow staat actief op de standaardbranch `main`.

## Verificatie

Lokaal getest: nieuwe data via Ververs roosters, herkenbare terugval bij een HTTP 503 op het online rooster, herstel na terugkeer van de bron en een daadwerkelijk geregistreerde service worker met offline reserve. De mobiele installatie-uitleg is op 390 × 844 gecontroleerd. Op 27 november 2026 zijn ook de echte GitHub-publicatieketen en de online filters en offline installatievoorziening gecontroleerd. Installatie op fysieke iPhone- en Androidapparaten moet nog worden getest.

Bronnen: https://cineville.nl/nl-NL/filmagenda, https://www.rotterdamzwemt.nl/ en de officiële zwembadlinks in `data/pools.json`.
