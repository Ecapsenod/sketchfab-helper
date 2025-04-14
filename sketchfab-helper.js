function waitForSketchfab(callback) {
    const interval = setInterval(() => {
        if (typeof Sketchfab !== 'undefined') {
            clearInterval(interval);
            callback(Sketchfab);
        }
    }, 100);
}

waitForSketchfab((Sketchfab) => {
    console.log("[Helper] Sketchfab API is available!");

    // Set up message listener
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'EXTRACT_GEOMETRY') {
            console.log("[Helper] Received EXTRACT_GEOMETRY signal");

            // Initialize Sketchfab viewer
            const iframe = document.querySelector('iframe');
            const uidMatch = window.location.href.match(/\/([0-9a-f]{32})/i);
            const uid = uidMatch ? uidMatch[1] : null;

            if (!uid) {
                console.error("Could not find model UID from URL");
                return;
            }

            const client = new Sketchfab("1.12.1", iframe);
            client.init(uid, {
                success: function(api) {
                    console.log("[Helper] Sketchfab viewer initialized.");

                    api.start();
                    api.addEventListener('viewerready', function() {
                        console.log("[Helper] Viewer is ready. Starting geometry extraction...");

                        // TODO: Insert geometry + texture extraction logic here
                        alert('Viewer is ready — add your geometry extraction here!');
                    });
                },
                error: function() {
                    console.error("Failed to initialize Sketchfab viewer.");
                }
            });
        }
    });

    console.log("[Helper] Listening for EXTRACT_GEOMETRY...");
});
