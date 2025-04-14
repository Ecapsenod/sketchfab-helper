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

    window.addEventListener("message", async (event) => {
        if (event.data === "EXTRACT_GEOMETRY") {
            console.log("[Helper] Received EXTRACT_GEOMETRY signal");

            const iframe = document.querySelector('iframe');
            const uidMatch = window.location.href.match(/\/([0-9a-f]{32})/i);
            const uid = uidMatch ? uidMatch[1] : null;

            if (!uid) {
                console.error("Could not find UID");
                return;
            }

            const client = new Sketchfab("1.12.1", iframe);
            client.init(uid, {
                success: function(api) {
                    console.log("[Helper] Sketchfab viewer initialized.");
                    // Continue with geometry extraction logic...
                },
                error: function() {
                    console.error("Failed to initialize Sketchfab viewer.");
                }
            });
        }
    });

    console.log("[Helper] Listening for EXTRACT_GEOMETRY...");
});
