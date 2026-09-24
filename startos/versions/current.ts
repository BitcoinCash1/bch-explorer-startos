import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

/**
 * Whether users may downgrade from this release to an earlier one. Set it per
 * release: `true` only when earlier versions can still read the data this one
 * leaves behind, `false` when this release is one-way.
 */
const ALLOW_DOWNGRADE = false

export const current = VersionInfo.of({
  version: '3.14.2:0',
  releaseNotes: {
    en_US:
      'Updates BCH Explorer to upstream 3.14.2 and adds Knuth as a node backend. Control characters in coinbase and OP_RETURN text are stripped again — the 3.14 frontend build had slipped past that fix. Backups now keep only your settings — the node choice and the credential registered on Flowee — and skip the explorer index, which is rebuilt from your node and indexer after a restore.',
    es_ES:
      'Actualiza BCH Explorer a la versión 3.14.2 del proyecto original y añade Knuth como nodo. Los caracteres de control en el texto de coinbase y OP_RETURN vuelven a eliminarse — la compilación del frontend 3.14 se saltaba esa corrección. Las copias de seguridad ahora conservan solo tu configuración — la elección de nodo y la credencial registrada en Flowee — y omiten el índice del explorador, que se reconstruye a partir de tu nodo y tu indexador tras una restauración.',
    de_DE:
      'Aktualisiert BCH Explorer auf die Upstream-Version 3.14.2 und fügt Knuth als Knoten hinzu. Steuerzeichen in Coinbase- und OP_RETURN-Text werden wieder entfernt — der Frontend-Build von 3.14 hatte diese Korrektur umgangen. Sicherungen bewahren jetzt nur Ihre Einstellungen — die Knotenauswahl und die bei Flowee registrierte Zugangskennung — und lassen den Explorer-Index aus, der nach einer Wiederherstellung aus Ihrem Knoten und Indexer neu aufgebaut wird.',
    pl_PL:
      'Aktualizuje BCH Explorer do wersji 3.14.2 z projektu źródłowego i dodaje Knuth jako węzeł. Znaki sterujące w tekście coinbase i OP_RETURN są znów usuwane — kompilacja frontendu 3.14 omijała tę poprawkę. Kopie zapasowe zachowują teraz tylko ustawienia — wybór węzła i poświadczenie zarejestrowane we Flowee — i pomijają indeks eksploratora, który po przywróceniu jest odtwarzany z Twojego węzła i indeksera.',
    fr_FR:
      "Met à jour BCH Explorer vers la version amont 3.14.2 et ajoute Knuth comme nœud. Les caractères de contrôle dans le texte coinbase et OP_RETURN sont de nouveau supprimés — la compilation du frontend 3.14 contournait ce correctif. Les sauvegardes ne conservent désormais que vos réglages — le choix du nœud et l'identifiant enregistré auprès de Flowee — et ignorent l'index de l'explorateur, reconstruit à partir de votre nœud et de votre indexeur après une restauration.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: ALLOW_DOWNGRADE ? async () => {} : IMPOSSIBLE,
  },
})
