# Tablica: odświeżanie korespondencji i kopie

Zmiana obejmuje wyłącznie tablicę, jej metadane i analizę poczty. Nie zmienia wysyłki, projektów, leadów ani ustawień konta Google.

## Obsługa

1. W edycji kartki wpisz potwierdzony adres klienta. Możesz podać kilka adresów (np. stary i nowy), oddzielając je przecinkiem.
2. „Moje notatki” pozostają ręcznym polem. Analiza poczty ich nie nadpisuje.
3. „Odśwież informacje” tworzy kopię wszystkich kartek i rozpoczyna zadanie na serwerze. Przeglądarka próbuje również pobrać tę kopię jako JSON; jeśli pobranie jest zablokowane, kopia pozostaje dostępna pod „Kopie i przywracanie”.
4. Dla kartki bez adresu wyszukiwanie jej nazwy dostarcza kandydatów do ręcznego potwierdzenia, nigdy automatycznego połączenia historii.
5. Przy pewnym wyniku aktualizuje się status i osobne podsumowanie z Gmaila. Termin z maila widnieje w podsumowaniu; ręcznie wpisany termin nie jest nadpisywany. Wynik niepewny jest oznaczony „Do sprawdzenia”, a status pozostaje bez zmian.

Filtry obejmują ruch po stronie Jakuba, oczekiwanie na klienta, wpisy do sprawdzenia i terminy. W dowodach znajdują się daty i cytaty z odnośnikami do Gmaila oraz liczba odczytanych wiadomości i wątków.

## Zakres analizy

Wymagane są istniejące połączenie Google oraz konfiguracja AI (`ANTHROPIC_API_KEY`, model i adres API z aktualnej konfiguracji panelu). Przycisk działa przez serwer panelu, niezależnie od czatu Codex. Treści korespondencji trafiają do skonfigurowanej usługi AI; nie są zapisywane w repozytorium.

Wyszukiwanie używa dokładnych adresów From/To/Cc, uwzględnia wysłane, odebrane, archiwum, spam i kosz, pomija szkice. Odczytuje wszystkie strony wyników i pełne wątki chronologicznie. Duże treści są dzielone na fragmenty, bez obcinania początku lub końca. Linki w HTML są zachowane. Treści tekstowe przechowywane przez Gmail jako zewnętrzne części MIME też są pobierane.

Ograniczenia są jawne: ponad 300 wątków, 2000 wiadomości na kartkę lub nadmiernie rozbudowana analiza powodują błąd bez nadpisywania kartki. Zawartość załączników nie jest analizowana, tylko ich nazwy. Gdy ustalenie od nich zależy, wynik powinien wymagać sprawdzenia. AI może się pomylić; cytaty są walidowane względem odczytanych wiadomości, ale to nie jest formalny dowód poprawności interpretacji.

Zadanie aktualizuje kartkę tylko jeśli od rozpoczęcia analizy nie zmienił się żaden jej zapisany atrybut. Ręczna edycja lub usunięcie kartki wygrywa z analizą. Równoległe odświeżenie w tym samym procesie jest blokowane. Obsługiwany jest jeden proces panelu z jednym lokalnym SQLite (obecna architektura); dla wielu replik potrzebna jest blokada rozproszona. Restart oznacza niedokończone zadanie jako przerwane.

## Kopie

Kopie wszystkich kolumn kartek powstają przed całym odświeżeniem, przed zapisem każdej analizy oraz przed przywróceniem. Są w tabeli `board_backups` na trwałym wolumenie SQLite. Lista pokazuje 100 najnowszych kopii, bez automatycznego usuwania starszych.

„Pobierz” daje JSON do przechowania poza serwerem. Kopia na tym samym wolumenie chroni przed błędną aktualizacją, ale nie przed utratą wolumenu — dlatego warto zachować pobrane pliki poza panelem. Kopie zawierają prywatne notatki i podsumowania; nie umieszczać ich w publicznym GitHubie.

Przywrócenie jest transakcją i najpierw tworzy nową kopię bieżącego stanu. Aktualizuje istniejące kartki z kopii, pozostawia nowe kartki i nie odtwarza skasowanych. Nie zmienia plików, briefów ani innych części panelu.

## Weryfikacja i wdrożenie

`cd backend && npm test` na Node 22. Testy używają tymczasowej bazy i sztucznych wiadomości, bez połączenia z rzeczywistym Gmailem i bez kosztów AI. Obejmują paginację, pełną treść, szkice, linki HTML, walidację dowodów i dat, konflikty z ręczną edycją oraz kopie i przywracanie przez HTTP.

Migracja jest addytywna: `contact_emails`, `mail_summary`, `board_backups`, `board_refreshes`. Nie ma zmiany ani kasowania istniejących opisów. Przed wdrożeniem należy zachować spójną kopię SQLite przez `db.backup()` / SQLite backup API oraz kopię plików z wolumenu. Zwykłe kopiowanie samego aktywnego pliku SQLite bez WAL nie gwarantuje spójności.

Po wdrożeniu sprawdzić jedną potwierdzoną kartkę: pobranie kopii, pełną historię z Gmaila, wynik i cytaty, zachowanie ręcznej notatki, następnie przywrócenie kopii. Dopiero potem uruchomić całą tablicę.
