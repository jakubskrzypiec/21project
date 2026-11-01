# Tablica aktualizowana przez asystenta

Panel nie uruchamia automatycznej analizy AI ani nie potrzebuje dodatkowego klucza API.

Napisz asystentowi w czacie „zaktualizuj tablicę”. Asystent wyszukuje wiadomości w Gmailu, odczytuje pełne powiązane wątki, sprawdza aktualne ustalenia, a następnie zapisuje je w edycji kartki. Niepewne dopasowania oznacza do sprawdzenia.

„Wczytaj zapisane zmiany” wyłącznie odświeża widok aktualnymi danymi z serwera. Nie uruchamia czatu ani nie przegląda Gmaila.

Każda kartka ma osobne „Moje notatki” i „Ustalenia z korespondencji”: stan, następny krok, odpowiedzialną osobę, ostatni kontakt, termin z maila i odnośniki do wątków. Edycja ustaleń nie nadpisuje ręcznych notatek. Odnośniki są ograniczone do HTTPS w domenie mail.google.com. Datę sprawdzenia ustala serwer przy zapisie.

Przed każdą edycją jest tworzona migawka wszystkich kolumn wszystkich kartek, w tej samej transakcji co zapis. Edycja ze starego formularza jest odrzucana, jeśli kartkę wcześniej zmieniono. Kopie można pobrać jako JSON i przywrócić w „Kopie i przywracanie”. Przywracanie najpierw zapisuje bieżący stan. Nie usuwa nowych i nie odtwarza skasowanych kartek. Pliki i briefy pozostają poza kopią tablicy.

Kopie w bazie SQLite na trwałym wolumenie chronią przed błędną aktualizacją. Aby chronić się przed utratą wolumenu, pobrane JSON-y trzeba przechowywać poza serwerem. Zawierają prywatne notatki — nie publikować ich w GitHubie.

Starszy POST /board/refresh odpowiada HTTP 410 z wyjaśnieniem nowego sposobu pracy. Nie wykonuje połączeń do usług AI. Istniejące podsumowania i kopie pozostają w bazie.

Testy: `cd backend && npm test` na Node 22. Testy HTTP używają tymczasowej bazy, sprawdzają oddzielne ustalenia i notatki, walidację dat i linków, konflikty, kopie i przywracanie bez wywołań usług zewnętrznych.
