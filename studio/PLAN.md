# Schattenchronik – Plan 12.11.–12.12.2026

## Rhythmus
- Formate abwechseln: True Crime / Paranormal / Du-Geschichte / Kuriose Geschichte – pro Tag zwei verschiedene.
- JEDEN TAG 2 lange Videos + 2 Shorts (Wunsch des Kanalbesitzers).
- Produktion startet täglich 00:43 Berlin.
- Upload: Video 1 um 05:00, Video 2 um 15:00 Berlin (Peak laut Metricool 16–17 Uhr, Di–Do am stärksten); Shorts zur GLEICHEN Zeit wie ihr langes Video. So testen wir beide Zeiten jeden Tag.
- Bilder: mindestens ein eigenes Bild pro Zeile, Bilder wechseln ständig. Quelle: tools/sdxl_images.py (lokales SDXL-Turbo, kostenlos, ~1 Min/Bild auf CPU). Ab 5.12. optional Artlist für noch bessere Qualität.
- Fertige Videos (lang + Short) immer auch in den Chat schicken.

## Themen (Reihenfolge, anpassbar nach Zahlen)
1. Hinterkaifeck (1922) – ungelöster Sechsfachmord auf einem bayerischen Hof
2. Dyatlov-Pass (1959) – neun Wanderer, aufgeschlitztes Zelt
3. Gladbecker Geiseldrama (1988) – Presse vs. Polizei
4. Wilhelm Gustloff (1945) – größte Schiffskatastrophe
5. Kaspar Hauser (1828) – das Findelkind von Nürnberg
6. Wunder von Lengede (1963) – 14 Tage unter Tage
7. Ramstein-Flugtagunglück (1988)
8. Tunguska (1908) – die Explosion ohne Krater
9. Grubenunglück von Courrières (1906)
10. Die Titanic-Schwester Britannic
11. Flight 19 – Bermuda-Dreieck (1945)
12. Elisa Lam – Cecil Hotel
13. Der Fall Peter Kürten – Vampir von Düsseldorf
14. Fritz Haarmann – der Schlächter von Hannover
15. Die Kinder von Hameln (1284)
16. Der Ötzi-Fund (1991)
17. ICE-Unglück Eschede (1998) – sachlich, ohne Opferbilder
18. Der Untergang der Estonia (1994)
19. Die Hindenburg-Katastrophe (1937)
20. Der Fall Ursula Herrmann (1981) – Kiste im Wald
21. Das Verschwinden von Flug MH370
22. Der Bernsteinzimmer-Raub
23. Der Rattenfänger-Mythos vs. Fakten
24. Der Mörder Jack Unterweger
25. Die Lachepidemie von Tanganjika (1962)
26. Der Fall Rudolf Hess – Spandau
27. Die Leiche im Bodensee – unbekannte Tote
28. Der Isdal-Frau-Fall (Norwegen 1970)
29. Das Somerton-Rätsel (Tamam Shud)
30. Grubenunglück Lassing (1998)
Weitere Themen nach Zahlen aus der Sonntags-Auswertung ergänzen.

Jedes lange Video endet mit einer Zuschauerfrage + „Folge Schattenchronik“. Ziel 8–10 Min (Skript ~110 Zeilen, weil die Erzählerstimme schnell ist).

## Werkzeuge
- Stimme: tools/omni_voice.py (VoiceStudio/OmniVoice „The Storyteller“, Referenz storyteller_ref.wav). Modell: huggingface k2-fsa/OmniVoice.
- Bilder: bis 5.12. Canva generate-image (Kontingent testen), ab 5.12. Artlist (40.000 Credits, ~50/Bild).
- Upload: Video + Kapak in Branch `videos` von mernis47/lemo-opuscar → raw-Link → Metricool (blogId 7775285) → YouTube public.

## Auswertung (jeden Sonntag)
- Aufrufe, Likes, Kommentare, Wiedergabedauer pro Video.
- Wenn ein Video nach 7 Tagen deutlich unter dem Kanal-Durchschnitt liegt: Hook (erste 3 Sek.) stärker, Titel/Kapak provokanter, Themenrichtung wechseln (mehr Mystery vs. True Crime).

## Paranormal (Wunsch des Kanalbesitzers: regelmäßig einbauen – mindestens jedes zweite Tag eines der beiden Videos)
Streitfrage hier immer: "Echt oder Betrug?" / "Übernatürlich oder erklärbar?"
P1. Der Spuk von Rosenheim (1967) – Anwaltskanzlei, Lampen schwingen, Telefonrechnungen, Annemarie Schaberl
P2. Anneliese Michel (1976) – Exorzismus in Klingenberg, Tod, Prozess gegen Eltern und Priester ("Krankheit oder Besessenheit?")
P3. Der Spuk "Chopper" von Neutraubling (1982) – Stimme in der Zahnarztpraxis
P4. Der Enfield-Poltergeist (1977) – London, zwei Schwestern
P5. Amityville (1974/75) – das Haus nach dem Mord
P6. Borley Rectory – das "Spukhaus Englands"
P7. Die Insel Poveglia – Pest, Irrenanstalt, Verbot
P8. Die Glocke von Bell Witch (Tennessee, 1817)

## Format 3: "Du-Geschichten" (Beobachtung des Kanalbesitzers: erfolgreiche Kanäle erzählen in der Du-Form mit Twist am Ende)
- Erfundene Gruselgeschichte in der zweiten Person ("Du wachst um 3:07 Uhr auf …"), Gegenwart, viele kurze Sätze, langsam steigende Spannung, Ticker-Uhrzeiten als Kapitel, am Ende ein Twist (z. B. die Nachricht kommt von dir selbst).
- Immer als Fiktion kennzeichnen (Titel-Zusatz oder Beschreibung: "Fiktive Geschichte").
- Bilder in der Ich-Perspektive (POV): Hände, Handy-Display ohne lesbaren Text, dunkle Wohnung, Spiegel, Flur.
- Streitfrage am Ende: "Hättest du die Tür geöffnet?" / "Was hättest du getan?"
- Rhythmus: ca. jeden zweiten Tag ersetzt eine Du-Geschichte eines der beiden Videos; Shorts eignen sich besonders.
- Ideen: D1 Die Nachricht um 3:07 (Absender bist du selbst) · D2 Der Nachbar, der jede Nacht klopft (es gibt keine Wohnung nebenan) · D3 Das Babyfon empfängt eine zweite Stimme · D4 Die letzte U-Bahn hält an einer Station, die es nicht gibt · D5 Dein Spiegelbild blinzelt zu spät · D6 Die Mitbewohnerin, die seit einer Woche nicht mehr spricht · D7 Das Foto in deiner Galerie, das du nie gemacht hast · D8 Der Anruf von deiner eigenen Nummer
- Auch echte Fälle können mit einer kurzen Du-Szene beginnen ("Stell dir vor, du bist …").

## Format 4: Kuriose Geschichte (Wunsch des Kanalbesitzers: verrückte, wahre Ereignisse mit unerwarteter Wendung)
Streitfrage: "Genial oder Wahnsinn?" / "Wer ist schuld?" – Legenden immer klar als Legende kennzeichnen.
K1. Das Gu-Ritual – Tiere in einem Gefäß kämpfen, bis nur eins übrig ist (chinesische Legende; Version des Kanalbesitzers mit Ratten im Loch, der überlebende "Rattenkönig" frisst nur noch Ratten)
K2. Die Rattenjagd von Hanoi (1902) – Prämie für Rattenschwänze, Menschen züchten Ratten
K3. Der Kobra-Effekt (Britisch-Indien) – Prämie für tote Kobras, Kobra-Farmen
K4. Maos Spatzenkampagne (1958) – Spatzen ausgerottet, Heuschrecken kommen, Hungersnot
K5. Der Emu-Krieg (Australien 1932) – die Armee verliert gegen Vögel
K6. 24 Kaninchen (Australien 1859) – daraus werden Hunderte Millionen
K7. Die Aga-Kröte (Australien 1935) – gegen Käfer geholt, wird selbst zur Plage
K8. Die Schlacht von Karansebes (1788) – eine Armee kämpft gegen sich selbst
K9. Die Londoner Bierflut (1814) und die Melasseflut von Boston (1919)
K10. Ludger Sylbaris (1902) – überlebt einen Vulkanausbruch in einer Gefängniszelle
K11. Der Schweinekrieg (1859) – USA gegen Großbritannien wegen eines Schweins
K12. Projekt "Acoustic Kitty" – die CIA baut eine Spionage-Katze

## Zuschauerfrage (Erkenntnis 12.11.: beim Bachmeier-Video kam auf die Schlussfrage sofort ein Kommentar)
- Jedes Video bekommt eine klare Streitfrage mit zwei Seiten (z. B. "Heldin oder Mörderin?", "Polizei oder Presse?").
- Die Frage kommt dreimal: kurz im ersten Drittel ("Behalte diese Frage im Kopf: …"), am Ende gesprochen, und als erster Kommentar (Metricool firstCommentText) – dort mit zwei Antwort-Optionen.
- Themen mit moralischem Dilemma oder offener Täterfrage bevorzugen (Selbstjustiz, Schuldfrage, ungelöste Fälle mit Verdächtigen).
- Titel dürfen die Frage andeuten ("Hättest du es auch getan?").

## Status (laufend aktualisieren)
- 12.11. 15:00 – Hinterkaifeck (hint_de + hint_short_de) – geplant in Metricool
- 13.11. 05:00 – Dyatlov-Pass (dyat_de + dyat_short_de) – geplant in Metricool
- 13.11. 15:00 – Gladbecker Geiseldrama (glad_de + glad_short_de) – geplant in Metricool
- 14.11. 05:00 – K1 Rattenkönig (ratt_de + ratt_short_de) – geplant in Metricool
- 14.11. 15:00 – P1 Spuk von Rosenheim (rose_de + rose_short_de) – geplant in Metricool
- Danach weiter abwechselnd: D1 Nachricht um 3:07 + K5 Emu-Krieg, dann P2 Anneliese Michel + K2 Rattenjagd von Hanoi, dann Gustloff + K4 Spatzenkampagne …
- Regel: nie zwei Videos mit gleichem Thema/Tier direkt hintereinander (z. B. nicht zwei Ratten-Videos nacheinander).
- Alle zwei Wochen (Sonntag): Formate nach Zahlen gewichten – was am besten läuft, kommt öfter.
