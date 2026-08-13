import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '3.12.0:2',
  releaseNotes: {
    en_US:
      'Adds a Repair MariaDB action. After an unclean shutdown or a full disk, MariaDB can crash-loop on a corrupt tc.log (Bad magic header). A StartOS Rebuild leaves that file on the database volume; this action deletes it and restarts, keeping the indexed explorer data. Also serves mining-pool logos from the frontend image instead of proxying to bchexplorer.cash (that proxy now returns 403).',
    es_ES:
      'Añade la acción Reparar MariaDB. Tras un apagado sucio o un disco lleno, MariaDB puede entrar en bucle por un tc.log corrupto (Bad magic header). Un Rebuild de StartOS deja ese archivo en el volumen; esta acción lo elimina y reinicia, conservando los datos indexados. También sirve los logos de los pools desde la imagen del frontend en lugar de proxificar a bchexplorer.cash (ese proxy ahora devuelve 403).',
    de_DE:
      'Fügt die Aktion „MariaDB reparieren“ hinzu. Nach einem unsauberen Shutdown oder vollem Datenträger kann MariaDB wegen einer beschädigten tc.log in einer Absturzschleife hängen (Bad magic header). Ein StartOS-Rebuild lässt die Datei auf dem Volume; diese Aktion löscht sie und startet neu, die indexierten Daten bleiben. Liefert Mining-Pool-Logos außerdem aus dem Frontend-Image statt über den Proxy zu bchexplorer.cash (der jetzt 403 liefert).',
    pl_PL:
      'Dodaje akcję Napraw MariaDB. Po nieczystym wyłączeniu lub zapełnieniu dysku MariaDB może zapętlać się na uszkodzonym tc.log (Bad magic header). Rebuild w StartOS zostawia ten plik na wolumenie; ta akcja go usuwa i restartuje, zachowując zindeksowane dane. Serwuje też loga puli z obrazu frontendu zamiast proxy do bchexplorer.cash (to proxy zwraca teraz 403).',
    fr_FR:
      "Ajoute l'action Réparer MariaDB. Après un arrêt brutal ou un disque plein, MariaDB peut boucler sur un tc.log corrompu (Bad magic header). Un Rebuild StartOS laisse ce fichier sur le volume ; cette action le supprime et redémarre, en conservant les données indexées. Sert aussi les logos de pools depuis l'image frontend au lieu de les proxifier vers bchexplorer.cash (ce proxy renvoie désormais 403).",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
