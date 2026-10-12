# BE MERCH — Presupuestos

Aplicación web mobile-first para preparar presupuestos de merchandising empresarial y eventos.

## Uso local

Abrí `index.html` en un navegador, o serví esta carpeta con cualquier hosting estático. No requiere instalación ni proceso de compilación.

## Funcionalidad

- Pantalla inicial con todos los presupuestos creados y su estado.
- Creación y edición de presupuestos desde el historial.
- Nombre de proyecto, usado como título del presupuesto.
- Ítems ilimitados con cálculo automático de subtotal, IVA y total.
- Condiciones de pago, entrega y notas.
- Persistencia automática en el almacenamiento local del navegador; los datos no se sincronizan entre dispositivos ni con Firebase.
- Vista de impresión optimizada para guardar el presupuesto como PDF.
- PDF con identidad visual fija: Verde Boston como color principal y blanco como acento.

## Publicación online

Es una app estática publicada en Firebase Hosting. El proyecto todavía no tiene una app Firebase Web ni Firestore/Realtime Database configurados. Para compartir presupuestos entre dispositivos hay que habilitar una base de datos y autenticación, y migrar los datos locales existentes.
