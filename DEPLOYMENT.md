# Zwemstad via GitHub Pages

We gebruiken GitHub Pages voor de installeerbare web-app en GitHub Actions om vier keer per dag de bronroosters te verversen. Een Cloudflare-account of eigen domeinnaam is niet nodig.

De gebruiker heeft op 27 november 2026 ingestemd met openbare broncode. GitHub Free biedt Pages voor openbare repositories. De bestaande lokale GitHub-aanmelding gebruikt account `berengels`; de repositorynaam is `zwemstad`. Het verwachte Pages-adres is https://berengels.github.io/zwemstad/. Publicatie is pas geslaagd als dit adres daadwerkelijk werkt.

## Inrichting

`.github/workflows/pages.yml` bouwt en publiceert bij wijzigingen op `main`, na een handmatige start en volgens `17 3,9,15,21 * * *` UTC. In Nederlandse wintertijd zijn de geplande starts 04:17, 10:17, 16:17 en 22:17; in zomertijd een uur later. GitHub kan een geplande taak vertragen of overslaan.

Elke ronde haalt eerst de openbare zwembadpagina's op. Een mislukte bron houdt zijn vorige momenten, sluitingsdatums en oorspronkelijke ophaaltijd. Een onherkenbaar leeg rooster geldt niet als bewijs van sluiting. Succesvolle gegevens worden bewaard, gecontroleerd, gebouwd en gepubliceerd. Een eventuele bronfout wordt daarna ook als foutstatus van de workflow gemeld.

De app haalt bij openen, terugkeren, elke vijf minuten terwijl hij openstaat en na Ververs roosters de nieuwste gepubliceerde `schedule.json` op. Bij uitval verschijnt een waarschuwing bij de reservekopie. Bronroosters ouder dan 36 uur worden als mogelijk verouderd gemarkeerd. Dit is geen directe koppeling met kassa's of reserveringssystemen.

## Instellingen

- Repository: openbaar, standaardbranch `main`.
- Settings → Pages → Build and deployment → Source: **GitHub Actions**.
- De workflow gebruikt Node 22, configure-pages, upload-pages-artifact en deploy-pages. Er is geen extra API-sleutel nodig.
- De roosterstap heeft schrijfrecht op de inhoud van deze repository. De publicatiestap heeft Pages- en OIDC-rechten.
- Het projectpad wordt uit de Pages-instellingen gehaald. Appbestanden, manifest, service worker en rooster-URL zijn geschikt voor `/zwemstad/`.
- Rechtstreekse commits door de eigen roosterworkflow moeten op `main` zijn toegestaan.

Voor handmatig bouwen:

```sh
npm ci
npm run sync
PAGES_BASE_PATH=/zwemstad npm run build
```

De publiceerbare bestanden staan in `dist`. Zonder PAGES_BASE_PATH bouwt dezelfde broncode voor de hoofdmap van een website.

## Installeren

Open het publieke adres op je telefoon. iPhone/iPad: Safari → Delen → Zet op beginscherm; kies Open als webapp als die optie verschijnt. Android: Chrome → menu → App installeren of Toevoegen aan startscherm. De service worker bewaart appbestanden en eerder geladen roosters voor offline gebruik. Die reserve is geen garantie voor actuele tijden.

## Dekking en beheer

De inventaris bevat de 15 openbare zwembaden op Rotterdam Zwemt. Alexanderhof heeft nog geen automatische koppeling. Sportfondsen levert standaardweken; vakantie- en feestdaguitzonderingen zijn nog niet volledig verwerkt. Claims over volledige of gegarandeerd actuele dekking zijn daarom niet passend.

Zet GitHub Actions-notificaties voor mislukte runs aan als je e-mailmeldingen wilt. In publieke repositories kan GitHub een geplande workflow na 60 dagen zonder repositoryactiviteit uitschakelen. Controleer de workflow als de weergegeven ophaaltijd niet meer verandert. Standaard Linux-runners zijn voor publieke repositories gratis; houd rekening met de gebruikslimieten van GitHub Pages.

## Bronnen

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
