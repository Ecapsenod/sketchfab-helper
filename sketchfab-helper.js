(function () {
    console.log('[Helper] Sketchfab Helper Loaded');

    function waitForSketchfabAPI() {
        if (typeof Sketchfab === 'undefined') {
            return setTimeout(waitForSketchfabAPI, 500);
        }

        const iframe = window.frameElement;
        const uidMatch = window.location.href.match(/\/models\/([a-f0-9]+)/i);
        const uid = uidMatch ? uidMatch[1] : null;

        if (!uid) {
            console.error('[Helper] Could not find model UID in URL');
            return;
        }

        const client = new Sketchfab(iframe);
        client.init(uid, {
            success(api) {
                api.start();
                api.addEventListener('viewerready', function () {
                    console.log('[Helper] Sketchfab Viewer Ready');
                    setupExportButton(api);
                });
            },
            error() {
                console.error('[Helper] Sketchfab API init failed');
            }
        });
    }

    function setupExportButton(api) {
        const btn = document.createElement('button');
        btn.textContent = '⬇️ Download Model (OBJ)';
        btn.style.position = 'absolute';
        btn.style.top = '10px';
        btn.style.left = '10px';
        btn.style.zIndex = 9999;
        btn.style.padding = '10px';
        btn.style.background = '#1eaedb';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        document.body.appendChild(btn);

        btn.addEventListener('click', () => exportModel(api));
    }

    async function exportModel(api) {
        console.log('[Helper] Extracting geometry...');
        const zip = new JSZip();
        const mtlParts = [];
        const objParts = [];
        const textureMap = new Map();
        let modelName = document.title.split(' - ')[0].trim().replace(/[^\w\d\-]/g, '_');

        const scene = await api.getSceneGraph();
        const meshes = [];

        scene.traverse((node) => {
            if (node.type === 'Geometry') {
                meshes.push(node);
            }
        });

        const materialMap = await api.getMaterialList();

        for (let i = 0; i < meshes.length; i++) {
            const geom = meshes[i];
            const meshData = await api.getGeometry(geom.instanceID);

            const obj = [];
            const mtl = [];

            const meshName = geom.name || `mesh_${i}`;
            obj.push(`o ${meshName}`);

            let vOffset = 1;

            for (const prim of meshData) {
                if (!prim.positions) continue;

                const positions = prim.positions;
                const normals = prim.normals || [];
                const uvs = prim.uvs || [];
                const indices = prim.indices || [];

                for (let j = 0; j < positions.length; j += 3) {
                    obj.push(`v ${positions[j]} ${positions[j + 1]} ${positions[j + 2]}`);
                }
                for (let j = 0; j < normals.length; j += 3) {
                    obj.push(`vn ${normals[j]} ${normals[j + 1]} ${normals[j + 2]}`);
                }
                for (let j = 0; j < uvs.length; j += 2) {
                    obj.push(`vt ${uvs[j]} ${uvs[j + 1]}`);
                }

                const materialName = `material_${i}`;
                obj.push(`usemtl ${materialName}`);
                mtl.push(`newmtl ${materialName}`);

                // Handle textures
                const mat = materialMap.find(m => m.instanceID === prim.materialId);
                if (mat && mat.channels && mat.channels.AlbedoPBR) {
                    const tex = mat.channels.AlbedoPBR.texture;
                    if (tex && tex.uid && tex.url && !textureMap.has(tex.uid)) {
                        const res = await fetch(tex.url);
                        const blob = await res.blob();
                        const fileName = `textures/${tex.uid}.jpg`;
                        zip.file(fileName, blob);
                        textureMap.set(tex.uid, fileName);
                        mtl.push(`map_Kd ${fileName}`);
                    }
                }

                for (let j = 0; j < indices.length; j += 3) {
                    const a = indices[j] + vOffset;
                    const b = indices[j + 1] + vOffset;
                    const c = indices[j + 2] + vOffset;
                    obj.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
                }

                vOffset += positions.length / 3;
            }

            zip.file(`${meshName}.obj`, obj.join('\n'));
            zip.file(`${meshName}.mtl`, mtl.join('\n'));
        }

        console.log('[Helper] Zipping...');
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${modelName}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    }

    waitForSketchfabAPI();
})();
