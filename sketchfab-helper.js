(function () {
  console.log('[Helper] Injected sketchfab-helper.js');

  function waitForSketchfab(callback) {
    const interval = setInterval(() => {
      if (typeof Sketchfab !== 'undefined') {
        clearInterval(interval);
        callback();
      }
    }, 100);
  }

  // Run after Sketchfab is ready
  waitForSketchfab(() => {
    console.log('[Helper] Sketchfab is available!');

    const iframe = document.querySelector('iframe');

    if (!iframe) {
      console.error('[Helper] No iframe found.');
      return;
    }

    const uid = iframe.src.match(/\/models\/([^/?]+)/)?.[1];
    if (!uid) {
      console.error('[Helper] Could not extract model UID.');
      return;
    }

    const client = new Sketchfab(iframe);

    client.init(uid, {
      success: function (api) {
        console.log('[Helper] API initialized, ready to extract geometry.');

        // Listen for command from parent
        window.addEventListener('message', function (event) {
          if (event.data && event.data.type === 'EXTRACT_GEOMETRY') {
            console.log('[Helper] Received EXTRACT_GEOMETRY command');
            extractGeometry(api);
          }
        });

        // Let parent know we're ready
        window.parent.postMessage({ type: 'HELPER_READY' }, '*');
      },
      error: function () {
        console.error('[Helper] Sketchfab API init failed.');
      }
    });
  });

  // Example extraction handler (just logs mesh list for now)
  function extractGeometry(api) {
    api.getSceneGraph(function (err, graph) {
      if (err) {
        console.error('[Helper] Error getting scene graph:', err);
        return;
      }

      console.log('[Helper] Scene graph received:', graph);

      // You can walk the graph and send mesh info to the parent window
      const meshes = [];

      function walk(node) {
        if (node.type === 'Mesh') {
          meshes.push({ name: node.name, node: node });
        }
        if (node.children) {
          node.children.forEach(walk);
        }
      }

      walk(graph);

      // Send result to parent
      window.parent.postMessage({ type: 'GEOMETRY_DATA', data: meshes }, '*');
    });
  }
})();
