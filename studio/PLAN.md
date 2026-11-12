# Schattenchronik – Plan 12.11.–12.12.2026

## Rhythmus
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
