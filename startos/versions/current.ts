import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '3.12.0:1',
  releaseNotes: {
    en_US:
      'The node and indexer are now reached over the internal host bridge rather than the retired .startos hostnames, so the explorer finds them reliably and follows them when their ports move. Selecting Flowee no longer forces its unauthenticated REST API on, and the Knuth option — which no package provides — is gone. Rebuilt on start-sdk 2.0.',
    es_ES:
      'El nodo y el indexador ahora se localizan a través del puente interno del sistema en lugar de los nombres .startos retirados, de modo que el explorador los encuentra de forma fiable y los sigue cuando cambian de puerto. Seleccionar Flowee ya no fuerza su API REST sin autenticación, y la opción Knuth, que ningún paquete proporciona, ha desaparecido. Reconstruido sobre start-sdk 2.0.',
    de_DE:
      'Knoten und Indexer werden jetzt über die interne Host-Bridge statt über die abgeschafften .startos-Namen erreicht, sodass der Explorer sie zuverlässig findet und ihnen folgt, wenn sich ihre Ports ändern. Die Auswahl von Flowee erzwingt nicht mehr dessen unauthentifizierte REST-API, und die Knuth-Option — für die es kein Paket gibt — ist entfallen. Neu gebaut auf start-sdk 2.0.',
    pl_PL:
      'Węzeł i indekser są teraz osiągane przez wewnętrzny mostek systemu zamiast wycofanych nazw .startos, dzięki czemu eksplorator znajduje je niezawodnie i podąża za nimi, gdy zmienią port. Wybranie Flowee nie wymusza już jego nieuwierzytelnionego API REST, a opcja Knuth — której żaden pakiet nie zapewnia — została usunięta. Przebudowano na start-sdk 2.0.',
    fr_FR:
      "Le nœud et l'indexeur sont désormais joints via le pont interne de l'hôte plutôt que par les noms .startos retirés, de sorte que l'explorateur les trouve de façon fiable et les suit lorsque leurs ports changent. Choisir Flowee n'impose plus son API REST non authentifiée, et l'option Knuth — qu'aucun paquet ne fournit — a disparu. Reconstruit sur start-sdk 2.0.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
