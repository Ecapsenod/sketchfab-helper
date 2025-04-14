// sketchfab-helper.js

window.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;

  if (event.data.type === 'EXTRACT_GEOMETRY') {
    console.log('[Helper] Received EXTRACT_GEOMETRY');

    // Find the Sketchfab iframe
    const iframe = document.querySelector('iframe');
    if (!iframe) {
      console.error('[Helper] Sketchfab iframe not found');
      return;
    }

    // Initialize the Sketchfab Viewer API
    const client = new Sketchfab(iframe);

    client.init(null, {
      success: function (api) {
        api.addEventListener('viewerready', function () {
          console.log('[Helper] Viewer is ready');

          // Extract the model's geometry
          api.getSceneGraph(function (err, result) {
            if (err) {
              console.error('[Helper] Error getting scene graph:', err);
              return;
            }

            // For demonstration purposes, we'll just log the scene graph
            // In a real implementation, you'd traverse the scene graph,
            // extract mesh data, and convert it to OBJ format

            console.log('[Helper] Scene graph:', result);

            // Placeholder: Send a message back to the parent window
            window.parent.postMessage(
              {
                type: 'GEOMETRY_EXTRACTED',
                data: 'OBJ data would go here',
              },
              '*'
            );
          });
        });
      },
      error: function () {
        console.error('[Helper] Error initializing Sketchfab Viewer API');
      },
    });
  }
});
