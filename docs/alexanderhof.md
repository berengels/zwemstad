# Alexanderhof: onderzoek automatische roosterbron

Gecontroleerd op 27 november 2026. De automatische koppeling is nog niet actief.

## Bevindingen

De openbare pagina https://www.optisport.nl/zwembad-het-alexanderhof-rotterdam toont het volledige rooster na laden van de roostercomponent. In de gerenderde DOM staan gedateerde Event-records als JSON-LD, met begin- en eindtijd inclusief tijdzone, activiteit en interne locatie.

De publieke JavaScript-component `/themes/custom/optisport_theme/js/app.23de4454.js` verwijst naar:

- GET `/api/optisport/token`: anonieme bezoekers-/CSRF-token voor de websitecomponent.
- POST `/api/optisport/v1/schedule`: openbaar weergegeven rooster, met paginering en locatie-ID.
- POST `/api/optisport/v1/upcomingeventsschedule`: activiteitgebonden rooster.

De Drupal-inhoud van de Alexanderhof-pagina heeft node-ID 2123. Dat is geen bevestiging dat het rooster dezelfde locatie-ID gebruikt; een geldig API-antwoord was niet bereikbaar om die mapping te bevestigen.

## Bereikbaarheid

Zowel lokale HTTP-verzoeken als verzoeken vanaf een standaard GitHub Actions-runner kregen HTTP 403 met een HTML-beveiligingspagina. Getest zijn de anonieme tokenroute en de rechtstreeks benaderde, alleen-lezen roosterroute. De gewone browserweergave werkte. Er zijn geen bezoekerscookies, browserbeveiligingsgegevens of tokens in broncode of configuratie vastgelegd.

De tijdelijke GitHub-testworkflow is na het onderzoek verwijderd. De testresultaten zijn terug te vinden in de workflowgeschiedenis van de repository. De bestaande publicatieworkflow en de andere zwembadkoppelingen zijn niet gewijzigd.

## Wat nog nodig is

Vraag Optisport om een voor automatische verwerking toegankelijke roosterfeed of API en de locatie-identificatie voor Alexanderhof. De contactpagina noemt alexanderhof@optisport.nl. Er is geen bericht verstuurd.

Zodra een werkende bron beschikbaar is, moet de adapter minimaal paginering, expliciete datums/tijdzones, uitval en lege roosters verwerken. Controleer begin- en eindtijden tegen het zichtbare officiële rooster, behoud vorige gegevens bij bronuitval en test de bron vanaf GitHub voordat de koppeling als actief wordt getoond.

Het eenmalig overnemen van het zichtbare rooster is geen automatische koppeling. Alexanderhof blijft daarom als nog niet gekoppeld gemarkeerd.

## Bestaand controleschema

`.github/workflows/pages.yml` heeft cron `17 3,9,15,21 * * *` (UTC): in Nederlandse wintertijd 04:17, 10:17, 16:17 en 22:17. In zomertijd zijn deze starts een uur later. GitHub kan de uitvoering vertragen of een ronde overslaan.

De app vraagt de laatste gepubliceerde verzameling op bij openen, terugkeren naar het venster, een herstelde verbinding, via Ververs roosters en elke vijf minuten terwijl de app openstaat. Dat verandert niet hoe vaak de websites van de zwembaden worden gecontroleerd.
