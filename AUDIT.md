# Kwaliteitsaudit — Minimalist Launcher (dumb phone launcher)

**Wat is geaudit:** alleen de Android-launcher in `minimalist-launcher/` (jouw keuze).

**Welke versie:** branch `claude/dumb-phone-launcher-blocker-dh6ag9`, commit `5394d0e`. Dat is dezelfde code als de APK achter de vaste downloadlink.

**Datum:** 23 oktober 2026.

**Buiten scope:** de webapp "Planken Wambuis" op `main`, die op Vercel draait. Eén uitzondering: bevinding B12 gaat wél over Vercel, omdat Vercel ook deze launcher-branch bouwt.

**Niet van toepassing:** de web-onderdelen uit de opdracht (Lighthouse, Core Web Vitals, PWA, OWASP ASVS). De launcher is een native Android-app. Ik heb daarom de Android-tegenhangers gebruikt: OWASP MASVS en Mobile Top 10, Android-kwaliteits- en toegankelijkheidsrichtlijnen en Android vitals. Zie §8 en bijlage C.

**Woordjes die vaak terugkomen:**
- **APK:** het installatiebestand.
- **CI:** de automatische bouwstraat op GitHub.
- **Lint:** automatische codecontrole.
- **Debug-build:** testversie.
- **Release-build:** echte, geoptimaliseerde versie.
- **Main thread:** de thread die het scherm tekent; als die wacht, hapert de app.

---

## 1. Samenvatting

1. De launcher is als app netjes opgebouwd. De kernlogica (blokkeren, schema's, dag/avond) staat los van de schermen, en de 84 bestaande tests slagen allemaal.
2. Het zwakke punt is de manier waarop de app wordt gebouwd en verspreid, niet de app-logica.
3. De sleutel die elke APK ondertekent staat met wachtwoord in je **openbare** repo (B01). Iedereen kan daarmee een "update" van jouw launcher maken die Android accepteert.
4. Je installeert een **debug-build**: trager, groter en uitleesbaar via USB-foutopsporing (B02).
5. Elke push naar **elke** branch vervangt de APK achter je vaste downloadlink (B03).
6. De automatische controles zeggen weinig. Lint kan de build niet laten falen en de uitkomst ziet niemand (B05). 86% van de code heeft geen tests (B10).
7. Toegankelijkheid is in de standaardthema's goed (contrast 5,7–18,9:1). Groene tekst op het lichte thema is wel onleesbaar (1,36:1, B06).
8. In de 37 meegeleverde bibliotheken zitten geen bekende kwetsbaarheden. Wel loopt alles 1–2 jaar achter, en de buildtool Kotlin 2.0.21 heeft een bekende kwetsbaarheid (B09, B13).
9. Totaal 36 bevindingen: **0 kritiek, 2 hoog, 10 middel, 24 laag**. Vijf daarvan zijn als "onzeker" gemarkeerd en hebben een korte test erbij.
10. Begin met B01 + B02 (samen in één keer) en B03/B04. Zie §7.

---

## 2. Scorekaart

| Dimensie | Score | Uitleg in één zin |
| --- | --- | --- |
| 1. Correctheid | redelijk | De kernregels kloppen en zijn getest, maar er zijn enkele randgevallen: zoeken met toetsenbord (B08), een dubbel blokkeerscherm (B14), een toestemming die vóór de daglimiet gaat (B16) en ontbrekende invoercontrole (B26). |
| 2. Consistentie | redelijk | De structuur en naamgeving zijn helder, maar er is geen vastgelegde codestijl: ktlint vindt 570 opmaakafwijkingen (B28). |
| 3. Stabiliteit | redelijk | Zwaar werk gebeurt meestal netjes op de achtergrond; wel: twee threads op één object (B17), app-start zonder foutafhandeling (B19) en geen enkel log (B31). |
| 4. Performance | redelijk | De code houdt de main thread grotendeels vrij, maar je draait een niet-geoptimaliseerde debug-build (B02) en het weer kan het beginscherm ophouden (B07). |
| 5. Security en privacy | zwak | De privacy-opzet is goed (alles op het toestel, HTTPS, grove locatie), maar de ondertekeningssleutel ligt op straat (B01) en de app is debuggable (B02). |
| 6. Toegankelijkheid | redelijk | Goed contrast en schaalbare tekst (sp); wel onleesbaar groen op wit (B06), kleine aanraakvlakken (B20) en knoppen zonder knop-rol (B21). |
| 7. Mobiel/launcher-gedrag | redelijk | Correct opgezet als startscherm met snelle, asynchrone lijsten, maar targetSdk 34 en de nodige migraties voor nieuwere Android-versies (B09) staan nog open. |
| 8. Onderhoudbaarheid | redelijk | Duidelijke pakketindeling met gedocumenteerde pure logica, maar ook grote klassen (B29), dode code (B30), geen Gradle-wrapper (B33) en verouderde bibliotheken (B09). |
| 9. Testdekking | zwak | De 84 tests raken alleen de 14% Android-vrije code; dienst, schermen en opslag zijn ongetest en er wordt geen dekking gemeten (B10). |
| 10. Deployment en CI | zwak | Er wordt vanaf elke branch gepubliceerd (B03), het schrijf-token is voor de hele build bereikbaar (B04), lint is onzichtbaar (B05) en de actions zijn verouderd (B34). |

---

## 3. Bevindingen

### Afkortingen in de kolom "Locatie"

| Afkorting | Betekent |
| --- | --- |
| `…/` | `minimalist-launcher/app/src/main/java/io/github/minilauncher/` |
| `res/` | `minimalist-launcher/app/src/main/res/` |
| `app/` | `minimalist-launcher/app/` |
| `wf` | `.github/workflows/android-build.yml` |

"Bijlage B" verwijst naar de uitvoer van de checks die ik heb gedraaid.

Ernst: **Kritiek** = direct misbruik of uitval zonder actie van jou, **Hoog** = ernstig risico dat een kleine stap vraagt, **Middel** = merkbaar risico of gemis, **Laag** = verbetering of klein risico.

| ID | Dimensie | Ernst | Locatie | Wat is er mis | Waarom het ertoe doet | Onderbouwing / bron |
| --- | --- | --- | --- | --- | --- | --- |
| B01 | Security en privacy | **Hoog** | `app/build.gradle.kts:18-27`; `minimalist-launcher/keystore/shared-debug.keystore` | De sleutel die elke APK ondertekent staat in de openbare repo. Het keystore-wachtwoord staat leesbaar op regel 23 en 25. Het is exact de sleutel van de gepubliceerde APK. | Iedereen kan hiermee een APK maken die Android als "update" van jouw launcher accepteert. Zo'n nep-update krijgt de rechten die je de launcher gaf: standaard-startscherm, gebruiks- en meldingentoegang, en waarschijnlijk ook de toegankelijkheidsdienst. Android: wie je sleutel heeft, kan apps verspreiden "that maliciously replace your authentic apps". | De vingerafdruk van de keystore (`keytool`) en van het APK-certificaat zijn beide SHA-256 `F8:0E:30:EF…5F:0A:0A` (bijlage B). detect-secrets meldt `build.gradle.kts:23`. De repo is `public` (GitHub API). Bronnen: [Android: Keep your key secure]; OWASP Mobile Top 10 2024 M1. |
| B02 | Security en privacy / Performance | **Hoog** | `wf:34,40,49`; `app/build.gradle.kts:33-36` | De APK die je installeert is een debug-build: `debuggable=true` en zonder codeverkleining (R8). Van de code in de APK is 97,6% bibliotheekcode die niet is verkleind: eigen code is 1.206 van 49.946 methodes, in 11 dex-bestanden van samen 10,5 MB. | Debuggable betekent: wie je telefoon met USB-foutopsporing in handen heeft, kan de app-gegevens uitlezen (`run-as`, `adb backup`) en een debugger koppelen. Volgens Android zelf kost een debug-build ook prestaties ("comes with some performance costs"), en hij is groter (5,8 MB). | APK-analyse (androguard): `application@debuggable: true`. Bronnen: [Android: android:debuggable], OWASP MASVS-PLATFORM; [Android 12: adb backup]; [Android Studio: profileable vs debuggable]; Core app quality `Production_Build_Quality`. |
| B03 | Deployment en CI | Middel | `wf:3-9,45-72` | Elke push naar elke branch (`branches: ["**"]`) publiceert een nieuwe APK onder dezelfde vaste link `latest`. De release-tag `latest` wijst bovendien naar `main` (de webapp), niet naar de commit van de APK. | Een experimentele of kapotte branch kan zo ongemerkt op je telefoon belanden via de link die je vertrouwt. Welke code erin zit, staat alleen in de release-notes. | De publish-stap heeft geen branch-voorwaarde. GitHub API: release `latest` heeft `target_commitish: main`. |
| B04 | Security en privacy (CI) | Middel | `wf:15-16,22,24,29,37,76` | Het CI-token met schrijfrechten is tijdens de hele build beschikbaar, ook voor alle Gradle-plugins en bibliotheken die tijdens het bouwen worden gedownload en uitgevoerd (`persist-credentials: true`). De actions staan op een tag (`@v4`) en niet op een vaste commit (SHA). | Een gekaapte bibliotheek of action kan met dat token de release aanpassen, en dus de APK die jij downloadt vervangen. Dat heet een supply-chain-risico. | CI-log run 36600094651: "GITHUB_TOKEN Permissions — Contents: write" en "persist-credentials: true". Bronnen: GitHub Well-Architected (least privilege, pinnen op SHA); OpenSSF Scorecard (Token-Permissions, Pinned-Dependencies); OWASP Mobile Top 10 2024 M2. |
| B05 | Deployment en CI | Middel | `app/build.gradle.kts:48-50`; `wf:74-79` | Android Lint draait wel in CI, maar kan de build nooit laten falen (`abortOnError = false`). Het rapport wordt alleen bewaard als de build mislukt. | Lint is dé automatische controle op Android-specifieke fouten (toegankelijkheid, API-niveaus, beveiliging). Die is nu effectief uitgeschakeld. Lokaal kon ik lint niet draaien (bijlage C). | De CI-log toont alleen "Wrote HTML report to …lint-results-debug.html", zonder aantallen. Het rapport-artefact wordt alleen geüpload bij `if: failure()`. |
| B06 | Toegankelijkheid | Middel | `…/ui/common/BaseActivity.kt:25-27`; `res/values/themes.xml:36-44`; `…/ui/settings/SettingsActivity.kt:181-188` | Groene CRT-tekst kun je ook met het lichte thema kiezen. Dan staat felgroen op wit: contrast 1,36:1. Secundaire tekst komt op 3,52:1. | Dat is vrijwel onleesbaar. WCAG vraagt minimaal 4,5:1. De standaardcombinaties zijn juist uitstekend (5,7–18,9:1). | Contrastberekening (bijlage B). Bronnen: WCAG 2.2 SC 1.4.3; Android Core app quality `Visual_Contrast`. |
| B07 | Performance / Stabiliteit | Middel | `…/ui/home/HomeActivity.kt:48,156-158,195-209,308-327`; `…/data/WeatherFetcher.kt:33-34` | Het ophalen van de temperatuur en het verversen van het beginscherm (favorieten, snelkoppelingen) delen één achtergrondthread, en het weer staat vooraan in de rij. Bij traag of haperend netwerk wacht de lijst op het weer: tot ±10 s (2 × 5 s time-out) of langer. | Na een herstart van de launcher kan het beginscherm dan seconden leeg blijven. Dit speelt alleen als de temperatuur ouder is dan 30 minuten en locatietoegang aan staat. | Code: één `newSingleThreadExecutor`, met in `onResume` eerst `updateTemperature()` en dan `refresh()`. Bron: Core app quality `App_Startup_Time` (zichtbare feedback na 2 s). |
| B08 | Correctheid | Middel (**onzeker**) | `…/ui/drawer/AppDrawerActivity.kt:74-78`; `res/layout/activity_drawer.xml:19-25` | De ruimte boven en onder de lijst (2 × 32% van de hoogte) wordt maar één keer berekend (`doOnLayout`). Opent het toetsenbord, dan krimpt de lijst maar die ruimte niet. Die ruimte kan dan groter worden dan de lijst zelf, en dan worden er géén zoekresultaten getoond zolang het toetsenbord open is. | Zoeken is een kernfunctie van de app-lade. Niet op een toestel geverifieerd. **Test (10 s):** open de app-lade, tik op het zoekveld en typ één letter. | Code-analyse: `doOnLayout` werkt maar één keer. Er is geen `windowSoftInputMode` gezet, dus het venster krimpt waarschijnlijk mee met het toetsenbord. |
| B09 | Onderhoudbaarheid / Mobiel | Middel | `app/build.gradle.kts:8,13`; `minimalist-launcher/gradle/libs.versions.toml:2-8`; `…/ui/home/HomeActivity.kt:329-332`; `…/ui/drawer/AppDrawerActivity.kt:130-146` | De build-onderdelen lopen 1–2 jaar achter (overzicht in bijlage B). CI meldt al dat de build niet werkt met Gradle 9. | Met de stap naar targetSdk 36 verandert gedrag. `onBackPressed` wordt dan niet meer aangeroepen; die regelt nu "terug doet niets" op het beginscherm en terug uit een map in de lade. Edge-to-edge wordt dan ook verplicht. Updates brengen daarnaast bugfixes en beveiliging. | CI-log: "Deprecated Gradle features … incompatible with Gradle 9.0". Bronnen: Android 16 behavior changes; Core app quality `Target_SDK_Version` en `SDK_Maintenance`; officiële versiepagina's (§8). |
| B10 | Testdekking | Middel | `minimalist-launcher/app/src/test/` (8 bestanden) | De 84 tests (alle geslaagd) dekken alleen de 12 Android-vrije bestanden: 532 van de 3.785 regels, dus 14%. De andere 21 bestanden hebben géén tests. Dat zijn de blokkeerdienst, de schermen, de opslag en de app-lijst. Ook `SessionTracker` (pure logica) heeft geen tests, en CI meet de dekking niet. | Juist de delen die de afgelopen maanden problemen gaven (dienst, beginscherm) worden niet automatisch gecontroleerd. Regressies merk je dus pas op je telefoon. | JaCoCo-run: de pure logica haalt 62,8% van de regels en 81,8% van de takken. `SessionTracker`, `BlockState` en `WeatherFetcher` staan op 0% (bijlage B). |
| B11 | Deployment / Onderhoudbaarheid | Middel | branch `claude/dumb-phone-launcher-blocker-dh6ag9` | De launcher staat alleen op een feature-branch. Die loopt 39 commits achter op `main` (met 28 eigen commits) en bevat een verouderde kopie (juli) van de webapp. | Samenvoegen met `main` zou de actuele webapp overschrijven of conflicten geven. GitHub-hulpmiddelen zoals Dependabot kijken alleen naar `main` en zien de launcher dus niet. | `git rev-list --left-right --count origin/main...HEAD` geeft 39 en 28. `main` bevat geen `minimalist-launcher/`. |
| B12 | Security en privacy / Deployment | Middel (**onzeker**) | `api/debug-corrections.js:1-23` (op deze branch); Vercel-status op commit `5394d0e` | Vercel bouwt bij elke push naar deze branch een preview van die verouderde webapp. Daarin zit `api/debug-corrections.js`, dat zonder wachtwoord de inhoud van de KV-database teruggeeft (met CORS `*`). Op `main` bestaat dat bestand niet meer. | Dit wordt een echt lek als twee dingen tegelijk waar zijn. Previews staan dan niet achter Vercel-login. En de preview-omgeving heeft de variabelen `KV_REST_API_URL` en `KV_REST_API_TOKEN`. Dan is die data via de (voorspelbare) preview-URL op te vragen. Beide instellingen kon ik vanuit deze omgeving niet bekijken. | GitHub commit-status "Vercel — Deployment has completed" op `5394d0e`; broncode van het endpoint. |
| B13 | Security en privacy | Laag | `minimalist-launcher/gradle/libs.versions.toml:3` | De Kotlin Gradle-plugin 2.0.21 heeft een bekende kwetsbaarheid: CVE-2026-53914 / GHSA-r937-wjx7-w2jp, onveilige deserialisatie in de build-cache. Opgelost in 2.4.20. | Dit raakt alleen het bouwen (lokaal en in CI), niet de app op je telefoon. Misbruik vraagt lokale toegang met hoge rechten (CVSS AV:L/AC:H/PR:H, "moderate"). | OSV-controle (bijlage B). |
| B14 | Correctheid | Laag (**onzeker**) | `…/blocking/AppBlockerAccessibilityService.kt:195,215-221`; `…/ui/home/HomeActivity.kt:153-155`; `…/blocking/BlockState.kt:11-19` | De dienst zet een "reserve-blokkade" klaar én opent het blokkeerscherm direct. Lukt dat directe openen, dan wordt de reserve niet gewist. Komt het beginscherm daarna terug, dan kan het blokkeerscherm voor dezelfde app nóg een keer verschijnen. | Dat is verwarrend: je had toch al teruggedrukt? Of het gebeurt, hangt af van de timing. **Test:** blokkeer een app, open hem en tik op "Back to focus". Verschijnt het blokkeerscherm opnieuw, dan is het bevestigd. | Code-analyse van `pendingBlock`. |
| B15 | Correctheid | Laag (**onzeker**) | `…/ui/settings/SettingsActivity.kt:181-197`; `…/ui/common/BaseActivity.kt:13-28` | Na het wijzigen van tekstkleur of lettergrootte wordt alleen het instellingenscherm opnieuw opgebouwd. Het beginscherm blijft op de achtergrond open met de oude kleur en grootte, tot de launcher herstart. | Het lijkt dan alsof de instelling niet werkt. **Test:** zet de tekstkleur op groen en ga terug naar het beginscherm. | `recreate()` staat alleen in Settings. De kleur- en lettergrootte-instelling wordt alleen bij `attachBaseContext`/`onCreate` toegepast. |
| B16 | Correctheid | Laag | `…/blocking/BlockDecisionEngine.kt:41-42,55-56`; `app/src/test/java/io/github/minilauncher/blocking/BlockDecisionEngineTest.kt:150-156` | Een tijdelijke toestemming (mindful pauze tot 15 min, of "5 more minutes") gaat vóór álle regels, ook vóór de daglimiet en de focusmodus. Het commentaar en de testnaam ("pause allowances cannot bypass the daily cap") beweren het tegendeel, maar de test bevat geen toestemming. | Je kunt de daglimiet zo met maximaal de gekozen pauzeduur overschrijden, en de test geeft vals vertrouwen. | Code en test vergeleken. |
| B17 | Stabiliteit | Laag | `…/blocking/AppBlockerAccessibilityService.kt:44,212,225,248,267-269`; `…/blocking/SessionTracker.kt:9-13` | `SessionTracker` wordt zonder synchronisatie vanuit twee threads gelezen en gewijzigd: de hoofdthread en de achtergrondthread. | Dat kan zelden een herinnering te vroeg, te laat of dubbel geven. | Code-analyse. |
| B18 | Performance | Laag | `…/ui/stats/StatsActivity.kt:39-41`; `…/ui/blocked/BlockedActivity.kt:45`; `…/ui/common/AppLauncher.kt:51-55`; `…/usage/UsageRepository.kt:40-70` | De schermtijd wordt op de main thread berekend, door alle gebruiksgebeurtenissen sinds middernacht door te lopen. Dat gebeurt in het statistiekscherm, het blokkeerscherm, en bij het openen van een app met daglimiet. | Op een drukke dag kan het scherm daardoor haperen. Langer dan 5 s blokkeren geeft een "app reageert niet"-melding (ANR). | Code. Bronnen: Android ANR-documentatie; Core app quality `StrictMode_Compliance` en `Stability_ANR`. |
| B19 | Stabiliteit | Laag | `…/data/AppRepository.kt:97-104` | Een app wordt gestart zonder foutafhandeling. Is een app net verwijderd of uitgeschakeld, dan kan `startActivity` een fout geven en de launcher laten crashen. Is er geen start-intent, dan gebeurt er stil niets. | De launcher is je startscherm, dus een crash daarvan is extra hinderlijk. De telefoon-snelkoppeling doet het wél veilig (`HomeActivity.kt:216`). | Code. |
| B20 | Toegankelijkheid | Laag | `res/layout/activity_home.xml:34-54,102-138`; `res/layout/item_onboarding_step.xml:24-33`; `res/layout/activity_blocked.xml:53-61`; `res/layout/activity_pause.xml:50-59` | Een aantal aanraakvlakken is kleiner dan 48 dp (schatting: tekstgrootte × 1,33 + padding):<br>• temperatuur ±29 dp hoog<br>• dag/avond-label ±27 dp<br>• "Grant" ±37 dp<br>• onderste balk, "5 more minutes" en "Never mind" ±45–48 dp. | Kleine vlakken zijn lastig te raken. Ze voldoen wel aan WCAG 2.5.8 (24 dp), maar niet aan de Android-richtlijn van 48 dp. | Layouts. Bronnen: Android "Make apps more accessible" (48×48 dp); Core app quality `Touch_Target_Size`; WCAG 2.2 SC 2.5.8. |
| B21 | Toegankelijkheid | Laag | `res/layout/activity_home.xml:34-54,102-138`; `res/layout/activity_blocked.xml:42-61`; `res/layout/activity_pause.xml:50-59`; `res/layout/item_onboarding_step.xml:24-33` | Knoppen zijn gewone tekstvelden met een klik-actie. Een schermlezer (TalkBack) noemt ze daardoor niet "knop". | Voor blinde en slechtziende gebruikers is dan onduidelijk wat aanklikbaar is. | Layouts. Bronnen: WCAG 2.2 SC 4.1.2 (Name, Role, Value), toegepast op apps via WCAG2ICT. |
| B22 | Toegankelijkheid | Laag | `…/util/WheelTransform.kt:17-18`; `…/ui/common/WheelLayoutManager.kt:63-67` | Het trommel-effect in de app-lade dimt rijen aan de rand tot 45% zichtbaarheid. Het contrast zakt daar naar 3,0–3,9:1. | De bovenste en onderste rijen zijn slecht leesbaar. Dit is een bewuste vormgeving; de middelste rijen zijn prima. | Contrastberekening (bijlage B); WCAG 2.2 SC 1.4.3. |
| B23 | Toegankelijkheid / Mobiel | Laag | `app/src/main/AndroidManifest.xml:55,82` | Beginscherm en app-lade staan vast op staand (portret). Dat was jouw eigen wens. | WCAG 1.3.4 (AA) vraagt geen vaste oriëntatie tenzij die essentieel is; denk aan iemand met de telefoon in een houder. Vanaf targetSdk 36 negeert Android dit op grote schermen. | Manifest. Bronnen: WCAG 2.2 SC 1.3.4; Android 16 behavior changes. |
| B24 | Security en privacy | Laag (**onzeker**) | `app/src/main/AndroidManifest.xml:23-24`; `…/ui/onboarding/OnboardingActivity.kt:84-96` | De app vraagt "Weergeven over andere apps" aan (`SYSTEM_ALERT_WINDOW`), maar tekent nergens een overlay. Het enige effect is een uitzondering op de regels voor het openen van schermen vanaf de achtergrond. Daar heeft de code al een terugvaloptie voor. Het commentaar ("instant block overlay") klopt niet met de code. | Elke extra speciale toegang vergroot de schade bij misbruik (zie B01). Of het blokkeerscherm zonder deze toegang even snel verschijnt, kon ik niet op een toestel testen. | Code. Bronnen: Android "Background activity starts" (lijst met uitzonderingen); Core app quality (minimale permissies). |
| B25 | Security en privacy | Laag | `app/src/main/AndroidManifest.xml:36`; APK-analyse | Er is geen `networkSecurityConfig` en geen back-upregels (`dataExtractionRules`), terwijl `allowBackup="true"`. | Kleine hygiëne. Android's kwaliteitslijst vraagt om een network security config, en back-upregels maken expliciet wat er mee mag. Nu gaat alles mee, wat bij deze gegevens acceptabel is. | Core app quality `Network_Security_Configuration`; Android backup best practices. |
| B26 | Correctheid | Laag | `…/ui/common/AppLongPressDialog.kt:216-218` en `…/data/Prefs.kt:213-215`; `…/ui/settings/ScheduleEditorActivity.kt:79-84` | Invoer wordt nauwelijks gecontroleerd:<br>• een daglimiet van 0, leeg of een te groot getal verwijdert de limiet stilzwijgend<br>• een schema zonder dagen wordt opgeslagen, maar is nooit actief. | Je denkt een limiet of schema te hebben dat er in werkelijkheid niet is. | Code; zie ook `…/blocking/ScheduleEvaluator.kt:14`. |
| B27 | Correctheid (ontwerp) | Laag | `…/ui/common/AppLongPressDialog.kt:37-41`; `…/ui/settings/SettingsActivity.kt:40-47` | Een blokkade of focusmodus is met twee tikken op te heffen, ook midden in een focussessie of schema. | Voor een zelfbeheersings-app is dit de makkelijkste ontsnapping. Het is een ontwerpkeuze, geen fout. | Code. |
| B28 | Consistentie | Laag | 34 van de 41 Kotlin-bestanden | Er is geen vastgelegde codestijl of automatische formatter. ktlint (Android Studio-stijl) vindt 570 afwijkingen:<br>• regelafbreking: 234<br>• komma's: 103<br>• te lange regels: 51. | Geen functioneel probleem, maar wisselende opmaak maakt wijzigen en reviewen lastiger. Bijna alles is automatisch te herstellen. | ktlint 1.8.0 (bijlage B). |
| B29 | Onderhoudbaarheid | Laag | `…/ui/settings/SettingsActivity.kt:35` (`render()`, 183 regels); `…/data/Prefs.kt` (23 functies); `…/ui/common/AppLongPressDialog.kt:18` (75 regels) | Een paar zeer grote klassen en methodes. detekt meldt 100 punten, waarvan 74 "magische getallen" (losse getallen zonder naam). | Grote methodes zijn foutgevoeliger bij aanpassen. | detekt 1.23.8 (bijlage B). |
| B30 | Onderhoudbaarheid | Laag | `…/util/Clock.kt:1-10`; `…/data/Prefs.kt:296-298`; `res/values/colors.xml:8`; `…/ui/settings/ScheduleEditorActivity.kt:25-33,55-56` | Dode code:<br>• `Clock` wordt nergens gebruikt<br>• de instelling `showDrawerHint` wordt nergens gelezen<br>• de kleur `oled_black` wordt niet gebruikt<br>• een schema toont een naam en Aan/Uit, maar beide zijn nergens te wijzigen. | Verwarrend voor wie de code later leest, en het geeft schijnfuncties in de app. | Zoekopdrachten (bijlage B). |
| B31 | Stabiliteit | Laag | hele app | De app logt niets en registreert geen crashes. | Problemen op de telefoon, zoals het open-apps-scherm, zijn achteraf niet te onderzoeken. Je hebt het diagnoselog onlangs bewust laten verwijderen; zie §4 voor een lichte optie. | Zoekopdracht op `Log.` en crash-handlers: 0 treffers. |
| B32 | Deployment en CI | Laag | `app/build.gradle.kts:14-15` | Elke build heeft `versionCode 1` / `versionName "1.0"`. | Op de telefoon is niet te zien welke versie je hebt, en Android kan een nieuwere versie niet herkennen. | APK-analyse: versionCode 1. |
| B33 | Deployment en CI | Laag | ontbrekend: `gradlew` en `gradle/wrapper/`; `minimalist-launcher/README.md:121-129` | Er is geen Gradle-wrapper. Lokaal bouwen hangt af van de Gradle-versie die toevallig geïnstalleerd is; CI kiest 8.14.3 (`wf:29-31`). | Builds zijn daardoor minder reproduceerbaar, en een nieuwere Gradle (9.x) breekt de build nu al (B09). | Bestandsoverzicht; workflow. |
| B34 | Deployment en CI | Laag | `wf:22,24,29,37,76` | GitHub meldt dat `setup-java@v4` verouderd is en dat de gebruikte actions nog voor Node 20 zijn gebouwd. | Het werkt nu nog, maar gaat op termijn stuk. Nieuwere versies bestaan, waaronder `setup-java@v5`. | Waarschuwingen in de CI-log; GitHub changelog over de Node 20-uitfasering. |
| B35 | Deployment en CI | Laag | repo-instellingen | Bibliotheken worden niet automatisch bewaakt: Dependabot-meldingen staan uit en er is geen Dependabot- of Renovate-configuratie. | Nieuwe kwetsbaarheden of updates merk je niet vanzelf (zie B09 en B13). | GitHub API: "Dependabot alerts are disabled for this repository". |
| B36 | Onderhoudbaarheid (documentatie) | Laag | `minimalist-launcher/README.md:60-73` | De installatie-uitleg verwijst naar het Actions-artefact, dat alleen met GitHub-login te downloaden is, en niet naar de vaste release-link. De sleutel heet er "throwaway", terwijl hij echte updates ondertekent. | Verouderde uitleg leidt tot fouten bij (her)installatie. | README. |

---

## 4. Verbetervoorstellen

Inspanning: **S** = uurtje of minder, **M** = een dagdeel tot een dag, **L** = meerdere dagen.

| ID | Concreet voorstel | Inspanning |
| --- | --- | --- |
| B01 | 1. Maak een nieuwe, geheime sleutel buiten de repo.<br>2. Zet keystore en wachtwoorden als GitHub Actions-secrets en laat de build ze daar uitlezen; verwijder ze uit `build.gradle.kts`.<br>3. Behandel de oude sleutel als openbaar: hij blijft in de git-geschiedenis vindbaar.<br>4. Overstappen kan op twee manieren. Eenmalig verwijderen en opnieuw installeren: eenvoudig, maar instellingen gaan verloren, dus noteer ze eerst. Of sleutelrotatie via APK Signature Scheme v3: ingewikkelder; laat dan eerst uitzoeken of de oude sleutel daarna geen updates meer mag leveren.<br>5. Combineer dit met B02, zodat je maar één keer opnieuw hoeft te installeren. | M |
| B02 | Laat CI een release-build maken (`assembleRelease`) met `isMinifyEnabled = true` en `isShrinkResources = true`, ondertekend met de nieuwe sleutel. Test R8 één keer goed op de telefoon. De diensten en schermen staan in het manifest en blijven dus automatisch behouden. | M |
| B03 | Publiceer alleen vanaf één branch, bijvoorbeeld met `if: github.ref == 'refs/heads/<jouw-branch>'`, of alleen bij een handmatige start of een versietag. Andere branches bouwen en testen alleen. Koppel de release-tag aan de gebouwde commit (`--target $GITHUB_SHA`), of maak per versie een eigen tag. | S |
| B04 | Zet bovenaan `permissions: contents: read`. Maak een aparte publish-job met `contents: write`, die alleen het artefact downloadt en publiceert. Zet `persist-credentials: false` bij checkout. Pin de actions op een commit-SHA en laat Dependabot ze bijwerken (B35). | S |
| B05 | Upload het lint-rapport altijd (`if: always()`). Maak één keer een lint-baseline van de huidige meldingen en zet daarna `abortOnError = true`. Dan laten alleen nieuwe fouten de build falen. | S |
| B06 | Kies één van drie oplossingen:<br>• laat de groene tekstkleur alleen toe bij het zwarte thema;<br>• schakel bij de keuze groen automatisch het zwarte thema in;<br>• gebruik in het lichte thema een donkergroen, bijvoorbeeld `#1B5E20` (7,87:1 op wit) of `#2E7D32` (5,13:1). | S |
| B07 | Geef het weer een eigen achtergrondthread, of start het pas nadat de lijst ververst is. Toon `--°` zolang het laadt. | S |
| B08 | Doe eerst de test uit §3. Is het bevestigd, bereken de ruimte dan opnieuw bij elke hoogteverandering (`addOnLayoutChangeListener`), of laat de extra ruimte weg zolang er een zoekterm is. | S |
| B09 | Plan één upgrade-ronde, in deze volgorde:<br>1. Gradle-wrapper 9.x<br>2. AGP 9.4.x<br>3. Kotlin 2.4.21<br>4. compile/targetSdk 36<br>5. AndroidX en Material.<br>Vervang `onBackPressed` door `OnBackPressedCallback`, voeg edge-to-edge-insets toe, en test daarna op je telefoon. Doe dit pas als B10 stap 1–2 staan. | L |
| B10 | Zie §6 (teststrategie). Begin met dekking meten in CI en met tests voor `SessionTracker` en de schema-opslag. | M (start) – L (volledig) |
| B11 | Geef de launcher een vaste plek. Aanbevolen: een eigen repository, zodat webapp en launcher elkaar niet raken. Alternatief: een schone map op `main` via een PR, zonder de oude webapp-bestanden. | M |
| B12 | Controleer in Vercel (Settings → Deployment Protection) of previews achter een login staan, en of de preview-omgeving de KV-variabelen heeft. Overweeg previews voor deze branch uit te zetten (Ignored Build Step). Dit zijn instellingen die je zelf moet aanpassen; ik heb er niets aan veranderd. | S |
| B13 | Neem dit mee in de Kotlin-upgrade naar 2.4.20 of hoger (B09). | S |
| B14 | Wis `pendingBlock` zodra het blokkeerscherm echt opent, bijvoorbeeld in `BlockedActivity`/`PauseActivity.onCreate`. Of zet de reserve alleen als het direct openen mislukt. | S |
| B15 | Laat het beginscherm in `onResume` controleren of kleur of lettergrootte veranderd is, en zo ja `recreate()` doen. | S |
| B16 | Besluit of de daglimiet hard moet zijn. Pas daarna code, commentaar en test aan, en voeg een test toe met een actieve toestemming én een bereikte limiet. | S |
| B17 | Laat alle toegang tot `SessionTracker` via één thread lopen (bijvoorbeeld de executor), of maak de methodes `@Synchronized`. | S |
| B18 | Bereken de schermtijd op een achtergrondthread en toon het resultaat zodra het klaar is; de cache bestaat al. Bij het openen van een app met limiet kan de dienst de controle doen in plaats van de UI. | S–M |
| B19 | Vang fouten bij het starten van een app af, toon een korte melding ("App niet gevonden") en ververs de lijst. | S |
| B20 | Geef kleine klikbare teksten `minHeight`/`minWidth` van 48dp, of meer padding. Controleer daarna met de app Accessibility Scanner. | S |
| B21 | Gebruik echte knoppen in tekststijl (`MaterialButton`/`TextButton`-stijl), of geef via `ViewCompat.setAccessibilityDelegate` de rol "Button" mee. Test met TalkBack. | S |
| B22 | Verhoog `MIN_ALPHA` naar ±0,6–0,7 (geeft 6,5–8,7:1 op zwart). Of maak het effect uitschakelbaar en volg de systeeminstelling "animaties verwijderen". | S |
| B23 | Maak de vergrendeling een instelling die standaard aan staat, zoals nu. | S |
| B24 | Trek de toegang op je telefoon in en test of het blokkeerscherm even snel verschijnt. Zo ja: verwijder de permissie en de onboarding-stap. Zo nee: pas het commentaar aan. | S |
| B25 | Voeg een minimale `network_security_config.xml` toe (alleen HTTPS) en `dataExtractionRules`. | S |
| B26 | Controleer invoer: limiet 1–1440 minuten en minstens één dag per schema. Toon een melding bij ongeldige invoer. | S |
| B27 | Overweeg een "strikte modus": niets opheffen tijdens een sessie of schema, of een wachttijd voordat het kan. | M |
| B28 | Voeg een `.editorconfig` en ktlint (of Spotless) toe. Draai één keer `ktlint --format` en laat daarna CI controleren. | S |
| B29 | Splits `SettingsActivity.render()` per sectie, verplaats de lijst-dialogen naar eigen klassen en geef getallen een naam (constanten). | M |
| B30 | Verwijder `Clock.kt`, `showDrawerHint` en `oled_black`. Maak de naam en Aan/Uit van een schema bewerkbaar, of verberg ze. | S |
| B31 | Alleen als je dat wilt: een klein, lokaal foutlog. Alleen de laatste crash, die blijft op het toestel en is in Instellingen te bekijken of te delen. Zonder dat is `adb logcat` de enige weg. | S–M |
| B32 | Laat `versionCode` meetellen met het CI-runnummer (`GITHUB_RUN_NUMBER`), zet de commit in `versionName` en toon die in Instellingen. | S |
| B33 | Voeg de Gradle-wrapper toe (`gradle wrapper --gradle-version …`) en gebruik `./gradlew` in CI en README. | S |
| B34 | Stap over op de Node 24-versies, waaronder `actions/setup-java@v5` en de nieuwere checkout-, upload-artifact- en setup-gradle-versies. Pin ze op SHA (B04). | S |
| B35 | Zet Dependabot alerts en security updates aan, en voeg `.github/dependabot.yml` toe voor `gradle` en `github-actions`. Dit werkt pas als de launcher op de standaardbranch staat (B11). | S |
| B36 | Werk de README bij: noem de vaste release-link en leg uit hoe het ondertekenen werkt na B01. | S |

---

## 5. Quick wins

De vijf verbeteringen met de meeste waarde voor de minste moeite:

1. **B02 – Release-build in plaats van debug-build (S–M).** De app wordt sneller en kleiner, en is niet meer debuggable. Doe dit meteen samen met B01, dan installeer je maar één keer opnieuw.
2. **B03 + B04 – De publicatiestraat dichtzetten (S).** Publiceer alleen vanaf één branch en geef schrijfrechten alleen aan de publish-stap. Een paar regels YAML.
3. **B05 – Lint zichtbaar en meetellend (S).** Rapport altijd uploaden, baseline maken en `abortOnError` aanzetten.
4. **B06 – Groen alleen bij het zwarte thema (S).** Dat haalt een onleesbare combinatie weg.
5. **B07 – Het weer op een eigen thread (S).** Het beginscherm wacht dan nooit meer op het netwerk.

---

## 6. Voorstel teststrategie

**Uitgangspunt:** de tests draaien in CI bij elke push, en een rode test blokkeert het publiceren (B03).

| Stap | Wat testen | Tooling (versie gecontroleerd 23-10-2026) | Waarom eerst/later |
| --- | --- | --- | --- |
| 1 | **Unit tests van pure logica aanvullen:**<br>• `SessionTracker`<br>• opslag en terugladen van `Schedule` (JSON)<br>• `BlockDecisionEngine` met toestemming + limiet (B16)<br>• randgevallen van `WebsiteMatcher`<br>**Dekking meten in CI.** | JUnit 4.13.2 (aanwezig); later JUnit 6.1.3. Dekking: AGP `enableUnitTestCoverage` (JaCoCo) of Kover 0.9.11. | Goedkoop en snel. Maakt meteen zichtbaar wat er nog ontbreekt. |
| 2 | **Logica uit de dienst losmaken en testen.** Haal de beslissingen uit `AppBlockerAccessibilityService`, zoals "is dit het actieve venster?" en "nu blokkeren?", naar pure functies, zoals al met `SystemSurfaces` gebeurt. | JUnit | Hier zaten de lastigste bugs (open-apps-scherm). |
| 3 | **Android-delen op de JVM testen, zonder toestel:**<br>• `Prefs`<br>• `AppRepository` (met nep-apps via `ShadowPackageManager`)<br>• `BlockedActivity`/`PauseActivity` (teksten per reden)<br>• het beginscherm (favorieten, lege-lijst-hint)<br>• de app-lade (zoeken, mappen). | Robolectric 4.17 + AndroidX Test core 1.7.0 / ext.junit 1.3.0 | Dekt de 86% ongeteste code, zonder emulator. |
| 4 | **Controles in CI:**<br>• Android Lint met baseline<br>• ktlint<br>• detekt. | AGP-lint, ktlint 1.8.0, detekt 1.23.8 | Vangt hele categorieën fouten automatisch. |
| 5 | **Instrumented smoke-tests op een emulator in CI:**<br>• launcher als startscherm instellen<br>• Home indrukken<br>• lade openen<br>• zoeken met toetsenbord (B08)<br>• een geblokkeerde app openen (B14).<br>Zet hierbij de Espresso-toegankelijkheidschecks aan. | Espresso 3.7.0, UI Automator, Gradle Managed Devices; Espresso `AccessibilityChecks` (ATF) | Test echt launcher-gedrag. De toegankelijkheidschecks vangen te kleine knoppen en ontbrekende labels. |
| 6 | **Screenshot-tests** van alle thema- en kleurcombinaties, inclusief licht + groen (B06). | Roborazzi 1.77.0 | Voorkomt visuele regressies. |
| 7 | **Opstartmeting** van het beginscherm, en later een Baseline Profile. | Macrobenchmark 1.5.0 | Pas zinvol na B02. Android raadt aan te meten op een niet-debuggable build met minify. |
| 8 | **Handmatige toesteltest:** de checklist uit de README, uitgebreid met:<br>• een TalkBack-rondje<br>• Accessibility Scanner<br>• het open-apps-scherm<br>• de testjes bij B08, B14 en B15. | Je telefoon | Wat automatisch niet kan (One UI-gedrag). |

**Volgorde:** 1 → 4 → 2 → 3 → 5 → 6 → 7, met 8 bij elke release. Het meeste risico zit in de blokkeerdienst en het beginscherm, dus stap 2 en 3 hebben na de basis de hoogste prioriteit.

---

## 7. Aanbevolen volgorde van aanpak

1. **Veiligheid en distributie** (±1 dag):
   - B01 + B02 samen: nieuwe geheime sleutel, release-build, één keer opnieuw installeren.
   - B03, B04: publicatiestraat dichtzetten.
   - B32: echte versienummers.
   - B12: Vercel-preview controleren (5 minuten).
   - B36: README bijwerken.
2. **Kwaliteitspoorten:**
   - B05: lint.
   - B28: codestijl.
   - B33: wrapper.
   - B34: actions bijwerken.
   - B10: stap 1, dekking meten.
3. **Bugs die je merkt:**
   - B08: eerst testen.
   - B07, B06, B15, B14, B19, B26, B16, B17, B18.
4. **Thuis voor de launcher:**
   - B11: eigen repo of schone plek op `main`.
   - Daarna B35 (Dependabot).
5. **Upgrade-ronde:**
   - B09 + B13, met de tests uit stap 2–3 van §6 als vangnet.
   - B23 neem je hierin mee.
6. **Tests uitbreiden:** §6, stap 2 t/m 7.
7. **Afwerking:**
   - Toegankelijkheid: B20, B21, B22.
   - Rechten en configuratie: B24, B25.
   - Ontwerp: B27.
   - Opruimen: B29, B30, B31.

---

## 8. Bronnenlijst

Zo lees je de kolom **Opgehaald**:
- **direct:** de pagina zelf gelezen op 23-10-2026.
- **zoekresultaat:** de site was vanuit de auditomgeving niet bereikbaar. Versie en datum komen dan uit meerdere zoekresultaten en zijn niet op de officiële pagina zelf nagelezen.

| Standaard / bron | Versie / datum | URL | Opgehaald |
| --- | --- | --- | --- |
| OWASP MASVS (Mobile Application Security Verification Standard) | v2.1.0 (jan 2024, in okt 2026 nog de actuele versie) | https://mas.owasp.org/MASVS/ | zoekresultaat |
| OWASP MASTG (Testing Guide) | v2.0.0 (juni 2026) | https://mas.owasp.org/MASTG/ | zoekresultaat |
| OWASP MASWE (Weakness Enumeration) | v1.0.0 (aug 2026) | https://mas.owasp.org/news/2026/08/17/maswe-v100-release/ | zoekresultaat |
| OWASP Mobile Top 10 | 2024 (final release) | https://owasp.org/www-project-mobile-top-10/ | zoekresultaat |
| WCAG | 2.2, W3C Recommendation (WCAG 3.0 is nog een Working Draft) | https://www.w3.org/TR/WCAG22/ | zoekresultaat |
| WCAG2ICT (WCAG toepassen op apps en software) | W3C Group Note, 11 dec 2025 | https://www.w3.org/TR/wcag2ict-22/ | zoekresultaat |
| Android: Make apps more accessible (48 dp, contrast) | bijgewerkt 2026-10-19 | https://developer.android.com/guide/topics/ui/accessibility/apps | direct |
| Android Core app quality guidelines | bijgewerkt 2026-10-20 | https://developer.android.com/docs/quality-guidelines/core-app-quality | direct |
| Target API level requirements (API 36 vanaf 31-08-2026) | bijgewerkt 2026-10-16 | https://developer.android.com/google/play/requirements/target-sdk | direct |
| Android vitals (crash 1,09%, ANR 0,47%) | bijgewerkt 2026-10-19 | https://developer.android.com/topic/performance/vitals | direct |
| ANRs (5 seconden) | — | https://developer.android.com/topic/performance/vitals/anr | direct |
| Activity security / background activity starts | bijgewerkt 2026-05-18 | https://developer.android.com/guide/components/activities/background-starts | direct |
| Risico `android:debuggable` (MASVS-PLATFORM) | bijgewerkt 2024-09-24 | https://developer.android.com/privacy-and-security/risks/android-debuggable | direct |
| Android 12 behavior changes (adb backup) | — | https://developer.android.com/about/versions/12/behavior-changes-12 | direct |
| Android 16 behavior changes (predictive back, edge-to-edge, oriëntatie) | bijgewerkt 2026-10-16 | https://developer.android.com/about/versions/16/behavior-changes-16 | direct |
| Edge-to-edge | bijgewerkt 2026-10-19 | https://developer.android.com/develop/ui/views/layout/edge-to-edge | direct |
| App signing ("Keep your key secure") | bijgewerkt 2026-03-06 | https://developer.android.com/studio/publish/app-signing | direct |
| R8 / app-optimalisatie | bijgewerkt 2026-08-27 | https://developer.android.com/build/shrink-code | direct |
| Profileable vs debuggable (prestatiekosten) | — | https://developer.android.com/studio/profile | direct |
| Macrobenchmark (meten op niet-debuggable build) | — | https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview | direct |
| Backup best practices | — | https://developer.android.com/privacy-and-security/risks/backup-best-practices | direct |
| Android testing fundamentals en strategies | bijgewerkt 2026-09-01 / 2026-10-08 | https://developer.android.com/training/testing/fundamentals | direct |
| Android Gradle Plugin (actueel 9.4.1; 9.4.0 = sep 2026) | — | https://developer.android.com/reference/tools/gradle-api | direct |
| Kotlin releases (2.4.21, 8 okt 2026) | — | https://kotlinlang.org/docs/releases.html | direct |
| Gradle (actueel 9.8.2, 19 okt 2026) | — | https://services.gradle.org/versions/current | direct |
| AndroidX releases (core 1.19.1, appcompat 1.8.0, recyclerview 1.4.0, test, benchmark 1.5.0) | — | https://developer.android.com/jetpack/androidx/releases/core (en /appcompat, /recyclerview, /test, /benchmark) | direct |
| Material Components for Android | 1.14.0 (mei 2026) | https://github.com/material-components/material-components-android/releases | zoekresultaat |
| OSV-kwetsbaarhedendatabase, Maven-export | 7.198 meldingen, gedownload 23-10-2026 | https://osv-vulnerabilities.storage.googleapis.com/Maven/all.zip | direct |
| GitHub Well-Architected: Actions security | — | https://wellarchitected.github.com/library/application-security/recommendations/actions-security/ | zoekresultaat |
| GitHub Docs: security hardening for GitHub Actions | — | https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions | zoekresultaat |
| actions/checkout (`persist-credentials`) | — | https://github.com/actions/checkout | zoekresultaat |
| OpenSSF Scorecard (Token-Permissions, Pinned-Dependencies) | — | https://github.com/ossf/scorecard/blob/main/docs/checks.md | zoekresultaat (secundaire bronnen) |
| GitHub changelog: uitfasering Node 20 | 19-09-2025 | https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/ | genoemd in de CI-log |
| Core Web Vitals (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1) | **n.v.t.**: geldt voor webpagina's | https://web.dev/articles/vitals | zoekresultaat |
| PWA / Lighthouse / OWASP ASVS | **n.v.t.**: webstandaarden; vervangen door de Android-bronnen hierboven | — | — |

**Gebruikte tools:**
- ktlint 1.8.0
- detekt 1.23.8
- Kotlin 2.0.21 met Gradle 8.14.3 (JVM-testproject)
- JaCoCo 0.8.12
- androguard 4.1.4
- detect-secrets 1.5.0
- keytool (OpenJDK 21.0.10)

---

## Bijlage A — Inventarisatie

**Wat is het:** een Android-launcher in Kotlin. Een startscherm met alleen tekst, met:
- app-blokker, schema's, daglimieten en een website-blokker;
- mindful pauze en focussessies;
- dag/avond-modus en een meldingenfilter;
- thema's: zwart, wit of CRT-groen, met een systeemgrijs-optie;
- mappen, hernoemen en verbergen van apps;
- schermtijd-overzicht.

**Framework en versies:**

| Onderdeel | Versie |
| --- | --- |
| Kotlin | 2.0.21 |
| Android Gradle Plugin | 8.7.3 |
| Gradle | 8.14.3 (alleen in CI) |
| Java | doel 17 |
| compileSdk / targetSdk | 34 |
| minSdk | 26 |
| UI | Views en XML met RecyclerView, geen Compose |

**Bibliotheken:**
- AndroidX core-ktx 1.13.1, appcompat 1.7.0, recyclerview 1.3.2;
- Material 1.12.0;
- voor tests: JUnit 4.13.2 en org.json 20240303.

In de APK zitten in totaal 43 AndroidX-, Material- en coroutines-bibliotheken (de directe meegeteld), onder andere fragment 1.5.4, activity 1.8.0 en kotlinx-coroutines 1.6.4.

**Structuur van `minimalist-launcher/`:**
- `app/src/main/java/io/github/minilauncher/` bevat 33 bestanden, 3.785 regels:
  - `blocking/`: toegankelijkheidsdienst plus pure beslislogica;
  - `data/`: opslag, app-lijst, weer, modellen;
  - `mode/`: dag/avond;
  - `notifications/`: meldingenfilter;
  - `ui/`: beginscherm, lade, instellingen, schema's, statistiek, onboarding, blokkeer- en pauzescherm;
  - `usage/`: schermtijd;
  - `util/`.
- `app/src/test/` bevat 8 testbestanden, 769 regels, 84 tests.
- 25 resourcebestanden.

**Toestemmingen in de APK:**
- `ACCESS_COARSE_LOCATION`
- `INTERNET`
- `PACKAGE_USAGE_STATS`
- `POST_NOTIFICATIONS`
- `QUERY_ALL_PACKAGES`
- `SYSTEM_ALERT_WINDOW`
- `WRITE_SECURE_SETTINGS` (alleen via adb)

Daarnaast zijn er twee beschermde diensten: toegankelijkheid en de meldingenlistener.

**Gegevensopslag:** één SharedPreferences-bestand (`minilauncher`), met lijsten en tabellen als JSON-tekst. Schermtijd wordt niet opgeslagen; die komt telkens opnieuw uit Android (UsageStatsManager). Er is geen account, backend of analytics.

**Externe API:** alleen Open-Meteo (`https://api.open-meteo.com/v1/forecast`), met grove coördinaten, een time-out van 5 s en 30 minuten cache.

**Deployment:** één GitHub Actions-workflow (`.github/workflows/android-build.yml`). Die draait lint, unit tests en `assembleDebug`, en publiceert het resultaat als artefact en in de doorlopende release `latest` (APK + zip). De link is `…/releases/latest/download/minimalist-launcher-apk.zip`. Er is geen Play Store, en Vercel en PWA spelen voor de launcher geen rol.

**Documentatie:** `minimalist-launcher/README.md`. Daarin staan:
- functies en installatie;
- grijstinten via adb;
- hoe het blokkeren werkt;
- bouwen;
- een toestel-checklist;
- hulp bij het open-apps-scherm.

Er is geen CLAUDE.md, LICENSE, CHANGELOG of SECURITY.md.

---

## Bijlage B — Automatische checks: commando's en uitvoer (samengevat)

Al het werk gebeurde op een kopie in de scratchpad. De repo zelf is niet aangeraakt.

**1. CI-log, laatste run (36600094651, commit `5394d0e`):**
- `BUILD SUCCESSFUL in 2m 35s`.
- Lint: alleen `Wrote HTML report to …/lint-results-debug.html`, zonder aantallen.
- Waarschuwingen:
  - `setup-java v4 is deprecated … migrate to actions/setup-java@v5`
  - `Node.js 20 is deprecated … actions/checkout@v4, actions/setup-java@v4, actions/upload-artifact@v4, gradle/actions/setup-gradle@v4`
  - `Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0`
- Token: `GITHUB_TOKEN Permissions: Contents: write`, `persist-credentials: true`.

**2. Unit tests en dekking:** een JVM-project met de 12 Android-vrije bronbestanden en de 8 bestaande testbestanden. `gradle test jacocoTestReport` (Kotlin 2.0.21, JaCoCo 0.8.12) geeft:

```
84 tests, 0 failures, 0 errors
BlockDecisionEngine 100% regels | ScheduleEvaluator 100% | DayEveningEvaluator 100% | WebsiteMatcher 100%
SystemSurfaces 100% | WheelTransform 100% | Folder 100% | Schedule (JSON) 46.7%
SessionTracker 0% | BlockState 0% | WeatherFetcher 0% | Clock 0%
Totaal pure logica: regels 120/191 = 62.8%, takken 121/148 = 81.8%
Hele code: 532 van 3.785 regels (14%) zit in testbare pure bestanden; 3.253 regels Android-code zonder tests.
```

**3. ktlint 1.8.0:**

```
$ java -jar ktlint-cli-1.8.0-all.jar "app/src/**/*.kt" "*.kts" "app/*.kts"
ktlint_official-stijl: 574 meldingen
android_studio-stijl:  570 meldingen in 34 van 41 bestanden
  argument-list-wrapping 234, trailing-comma-on-call-site 80, max-line-length 51,
  function-literal 45, statement-wrapping 30, binary-expression-wrapping 29, function-signature 26,
  trailing-comma-on-declaration-site 23, multiline-if-else 14, blank-line-between-when-conditions 13, overig 25
```

**4. detekt 1.23.8, standaardregels:**

```
$ java -jar detekt-cli-1.23.8-all.jar --input app/src
100 weighted issues: MagicNumber 74, ReturnCount 14, TooManyFunctions 5
(Prefs 23, SettingsActivity 22, HomeActivity 18, AppBlockerAccessibilityService 17, AppDrawerActivity 14),
LongParameterList 3, LongMethod 2 (SettingsActivity.render 183 regels, AppLongPressDialog.show 75),
CyclomaticComplexMethod 1 (BlockedActivity.onCreate 17), ComplexCondition 1
```

**5. Kwetsbaarheden:** de OSV Maven-export (7.198 meldingen). De methode is eerst gecontroleerd: `junit 4.12` en `org.json 20230227` worden terecht als kwetsbaar gemeld. Uitkomst:

```
36 runtime-bibliotheken uit de APK (META-INF/*.version) + kotlin-stdlib 2.0.21 = 37: 0 bekende kwetsbaarheden
(7 lifecycle/arch-bibliotheken hebben geen leesbaar versienummer in de APK; OSV kent geen enkele
 melding voor androidx.* of Material, dus ook daar geen treffers)
Build-tools: com.android.tools.build:gradle 8.7.3 -> geen meldingen
             org.jetbrains.kotlin:kotlin-gradle-plugin 2.0.21 -> GHSA-r937-wjx7-w2jp / CVE-2026-53914
             (moderate, CVSS:3.1/AV:L/AC:H/PR:H/UI:N/S:C/C:H/I:L/A:L, opgelost in 2.4.20)
```

De GitHub-route voor kwetsbaarheden (Dependabot alerts) gaf: `Dependabot alerts are disabled for this repository`.

**6. Verouderde onderdelen** (bron: officiële versiepagina's, §8):

| Onderdeel | In project | Actueel (23-10-2026) |
| --- | --- | --- |
| compileSdk / targetSdk | 34 | 36 (Play-eis sinds 31-08-2026); AGP 9.4 ondersteunt tot 37 |
| Android Gradle Plugin | 8.7.3 | 9.4.1 |
| Kotlin | 2.0.21 | 2.4.21 |
| Gradle | 8.14.3 | 9.8.2 |
| androidx.core | 1.13.1 | 1.19.1 |
| androidx.appcompat | 1.7.0 | 1.8.0 |
| androidx.recyclerview | 1.3.2 | 1.4.0 |
| Material Components | 1.12.0 | 1.14.0 |
| org.json (alleen tests) | 20240303 | 20260814 |
| JUnit | 4.13.2 | 4.13.2 (laatste 4.x; JUnit 6.1.3 beschikbaar) |

**7. APK-analyse (androguard 4.1.4)** van de gepubliceerde `minimalist-launcher.apk`. De SHA-256 `330793a8…587035` is gelijk aan die in de release-notes.

```
package io.github.minilauncher  versionCode 1  versionName 1.0  minSdk 26  targetSdk 34
application@debuggable: true   allowBackup: true   networkSecurityConfig: none   dataExtractionRules: none
handtekening: alleen APK Signature Scheme v2; certificaat CN=MiniLauncher Debug, RSA 2048,
  geldig 2026-07-17 t/m 2053-12-02, SHA-256 F8:0E:30:EF:…:5F:0A:0A
grootte: 5.848.983 bytes; 11 dex-bestanden = 10,5 MB code (onverkleind), resources.arsc 1,1 MB, 843 res-bestanden
eigen code: 244 van 6.752 klassen (3,6%), 1.206 van 49.946 methodes (2,4%)
```

**8. Sleutelvergelijking:** `keytool -list -v` op `keystore/shared-debug.keystore` toont alias `shareddebug`, CN=MiniLauncher Debug en SHA-256 `F8:0E:30:EF:…:5F:0A:0A`. Dat is hetzelfde certificaat als in de APK. Het wachtwoord is gebruikt, maar staat niet in dit rapport.

**9. Secret-scan (detect-secrets 1.5.0)** op de launcher en de workflow: 1 treffer, `app/build.gradle.kts:23` (type "Secret Keyword").

**10. Contrast (WCAG-formule):**

| Combinatie | Contrast | Oordeel |
| --- | --- | --- |
| Zwart thema, hoofdtekst | 18,10:1 | OK |
| Zwart thema, secundair | 7,37:1 | OK |
| Licht thema, hoofdtekst | 18,88:1 | OK |
| Licht thema, secundair | 5,74:1 | OK |
| Groen op zwart | 15,49:1 / 5,96:1 | OK |
| **Groen op wit** | **1,36:1 / 3,52:1** | **onvoldoende** |
| Trommel-rand (45%): zwart thema | 3,94:1 | te laag |
| Trommel-rand (45%): licht thema | 3,03:1 | te laag |
| Trommel-rand (45%): groen | 3,50:1 | te laag |

**11. Overige zoekopdrachten:**
- `Clock` wordt nergens gebruikt.
- `showDrawerHint` wordt alleen gedeclareerd.
- `oled_black` wordt nergens gebruikt.
- Alle string-resources worden gebruikt.
- 0 log- of crash-aanroepen.

**12. GitHub API (alleen gelezen):**
- De repo is `public`.
- Release `latest` heeft `target_commitish: main`.
- Commit `5394d0e` heeft de status "Vercel — Deployment has completed".
- De branch loopt 39 commits achter op `main` en heeft er 28 voor.

---

## Bijlage C — Wat niet kon en waarom

- **Android Lint, een volledige Android-build en een release-build lokaal:** de Android SDK en Google Maven (`dl.google.com`) zijn vanuit deze omgeving geblokkeerd. Ik heb daarom de CI-log als bewijs gebruikt (B05). De uitkomst van lint zelf is daardoor onbekend. Dat is precies het probleem van B05.
- **Typecheck van de Android-code:** alleen de Android-vrije code is lokaal gecompileerd, zonder fouten. De rest compileert in CI (build groen).
- **Lighthouse, Core Web Vitals en PWA-checks:** niet van toepassing op een native app. Op een toestel zijn de Android-equivalenten Accessibility Scanner, Macrobenchmark en Android vitals (die laatste alleen via de Play Console).
- **Toesteltests:** er was geen telefoon of emulator beschikbaar. B08, B14, B15 en B24 zijn daarom als "onzeker" gemarkeerd, met een korte test om het zelf na te gaan. De aanraakvlakken in B20 zijn schattingen.
- **Vercel-instellingen** (Deployment Protection, preview-variabelen): niet bekeken, want daar had ik vanuit deze omgeving geen toegang toe. Niet aangepast, conform de opdracht. Daarom staat B12 als "onzeker".
- **Officiële OWASP-, W3C- en GitHub Docs-pagina's:** die waren vanuit deze omgeving niet bereikbaar. Versies en data komen daar uit meerdere zoekresultaten; zie de kolom "Opgehaald" in §8. De Android-, Kotlin- en Gradle-bronnen zijn wel direct gelezen.
- **Transitieve versies van 7 lifecycle/arch-bibliotheken:** de APK bevat daar een placeholder in plaats van een versienummer. OSV kent voor `androidx.*` geen enkele melding, dus het risico daarvan is verwaarloosbaar.
