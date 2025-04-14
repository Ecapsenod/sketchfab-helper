window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'EXTRACT_GEOMETRY') {
    console.log('[Helper] Received EXTRACT_GEOMETRY');

    const client = new Sketchfab('1.12.1', window);

    client.init(null, {
      success: function (api) {
        console.log('[Helper] Viewer is ready');

        api.addEventListener('viewerready', function () {
          console.log('[Helper] Viewer event triggered');

          api.getSceneGraph(async function (err, result) {
            if (err) {
              console.error('[Helper] Error getting scene graph:', err);
              return;
            }

            const meshNodes = [];
            function traverse(node) {
              if (node.type === 'MatrixTransform' && node.children) {
                node.children.forEach(traverse);
              } else if (node.type === 'Geometry') {
                meshNodes.push(node);
              }
            }
            traverse(result);

            const materials = await new Promise((resolve) =>
              api.getMaterialList((err, mats) => resolve(mats))
            );

            const JSZipLib = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
            const zip = new JSZipLib.default();

            const textureMap = new Map();
            const mtlLines = [];

            const objLines = [];
            let vertexOffset = 0;

            for (const meshNode of meshNodes) {
              const meshData = await new Promise((resolve) =>
                api.getMeshData(meshNode.instanceID, (err, data) =>
                  resolve(err ? null : data)
                )
              );
              if (!meshData) continue;

              const material = materials.find((mat) => mat.id === meshNode.material);

              const matName = `mat_${meshNode.instanceID}`;
              mtlLines.push(`newmtl ${matName}`);
              if (material?.channels?.AlbedoPBR?.texture?.url) {
                const texUrl = material.channels.AlbedoPBR.texture.url;
                const texName = `texture_${meshNode.instanceID}.jpg`;
                mtlLines.push(`map_Kd ${texName}`);

                if (!textureMap.has(texUrl)) {
                  const blob = await fetch(texUrl).then(r => r.blob());
                  zip.file(texName, blob);
                  textureMap.set(texUrl, texName);
                }
              }

              objLines.push(`o mesh_${meshNode.instanceID}`);
              objLines.push(`usemtl ${matName}`);

              const { vertices, uvs, normals, faces } = meshData;

              for (let i = 0; i < vertices.length; i += 3) {
                objLines.push(`v ${vertices[i]} ${vertices[i + 1]} ${vertices[i + 2]}`);
              }

              for (let i = 0; i < uvs.length; i += 2) {
                objLines.push(`vt ${uvs[i]} ${1 - uvs[i + 1]}`);
              }

              for (let i = 0; i < normals.length; i += 3) {
                objLines.push(`vn ${normals[i]} ${normals[i + 1]} ${normals[i + 2]}`);
              }

              for (let i = 0; i < faces.length; i += 3) {
                const a = faces[i] + 1 + vertexOffset;
                const b = faces[i + 1] + 1 + vertexOffset;
                const c = faces[i + 2] + 1 + vertexOffset;
                objLines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
              }

              vertexOffset += vertices.length / 3;
            }

            zip.file('model.obj', objLines.join('\n'));
            zip.file('model.mtl', mtlLines.join('\n'));

            const content = await zip.generateAsync({ type: 'blob' });
            const reader = new FileReader();
            reader.onload = function () {
              window.parent.postMessage(
                {
                  type: 'GEOMETRY_EXTRACTED',
                  filename: 'SketchfabModel.zip',
                  data: reader.result,
                },
                '*'
              );
            };
            reader.readAsDataURL(content);
          });
        });
      },
      error: function () {
        console.error('[Helper] Error initializing Sketchfab Viewer API');
      }
    });
  }
});

console.log('[Helper] Listening for EXTRACT_GEOMETRY...');
