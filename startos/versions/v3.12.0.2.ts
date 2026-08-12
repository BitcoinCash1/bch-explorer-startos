import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_12_0_2 = VersionInfo.of({
  version: '3.12.0:2',
  releaseNotes: {
    en_US:
      'Adds a Repair MariaDB action. After an unclean shutdown or a full disk, MariaDB can crash-loop on a corrupt tc.log (Bad magic header). A StartOS Rebuild leaves that file on the database volume; this action deletes it and restarts, keeping the indexed explorer data.',
    es_ES:
      'Añade la acción Reparar MariaDB. Tras un apagado sucio o un disco lleno, MariaDB puede entrar en bucle por un tc.log corrupto (Bad magic header). Un Rebuild de StartOS deja ese archivo en el volumen; esta acción lo elimina y reinicia, conservando los datos indexados.',
    de_DE:
      'Fügt die Aktion „MariaDB reparieren“ hinzu. Nach einem unsauberen Shutdown oder vollem Datenträger kann MariaDB wegen einer beschädigten tc.log in einer Absturzschleife hängen (Bad magic header). Ein StartOS-Rebuild lässt die Datei auf dem Volume; diese Aktion löscht sie und startet neu, die indexierten Daten bleiben.',
    pl_PL:
      'Dodaje akcję Napraw MariaDB. Po nieczystym wyłączeniu lub zapełnieniu dysku MariaDB może zapętlać się na uszkodzonym tc.log (Bad magic header). Rebuild w StartOS zostawia ten plik na wolumenie; ta akcja go usuwa i restartuje, zachowując zindeksowane dane.',
    fr_FR:
      "Ajoute l'action Réparer MariaDB. Après un arrêt brutal ou un disque plein, MariaDB peut boucler sur un tc.log corrompu (Bad magic header). Un Rebuild StartOS laisse ce fichier sur le volume ; cette action le supprime et redémarre, en conservant les données indexées.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async () => {},
  },
})
