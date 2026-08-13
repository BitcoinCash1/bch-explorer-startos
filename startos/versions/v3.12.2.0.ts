import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_12_2_0 = VersionInfo.of({
  version: '3.12.2:0',
  releaseNotes: {
    en_US:
      'Fix broken mining-pool logos. The frontend image now ships the SVG assets locally; the old nginx proxy to bchexplorer.cash returned 403, so every block showed a broken "Logo of Unknown mining pool" image. Local files are served instead. Chipnet blocks from unnamed miners still show the Unknown icon — that is the pool name, not a missing file.',
    es_ES:
      'Corrige los logos rotos de los pools. La imagen del frontend ya incluye los SVG; el proxy nginx a bchexplorer.cash devolvía 403. Ahora se sirven los archivos locales.',
    de_DE:
      'Behebt kaputte Mining-Pool-Logos. Das Frontend-Image liefert die SVGs mit; der nginx-Proxy zu bchexplorer.cash lieferte 403. Es werden lokale Dateien ausgeliefert.',
    pl_PL:
      'Naprawia zepsute loga puli. Obraz frontendu ma już pliki SVG; stary proxy nginx do bchexplorer.cash zwracał 403. Serwowane są lokalne pliki.',
    fr_FR:
      "Corrige les logos de pools cassés. L'image frontend fournit déjà les SVG ; l'ancien proxy nginx vers bchexplorer.cash renvoyait 403. Les fichiers locaux sont servis.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async () => {},
  },
})
