/**
 * Validate catalog image metadata and basic file signature before uploading.
 * Resolves to the normalized extension (jpg, png, webp, gif); rejects with a
 * Spanish user-facing Error. Expects a browser File with slice().arrayBuffer().
 * This client-side check is not antivirus, a full image decoder, or a substitute
 * for server-side validation and Storage access policies.
 */
async function validateCatalogImage(file) {
    if (!file || !Number.isFinite(file.size) || file.size <= 0) {
        throw new Error('El archivo de imagen está vacío.');
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('La imagen no puede superar los 5 MB.');
    }

    const formats = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif'
    };
    const match = typeof file.name === 'string' && /\.([^.]+)$/.exec(file.name);
    const extension = match ? match[1].toLowerCase() : '';
    if (!Object.prototype.hasOwnProperty.call(formats, extension) || file.type !== formats[extension]) {
        throw new Error('Formato no permitido: selecciona una imagen JPEG, PNG, WebP o GIF con extensión y tipo coincidentes.');
    }

    let bytes;
    try {
        bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    } catch (_) {
        throw new Error('No se pudo leer el contenido de la imagen. Selecciona el archivo de nuevo.');
    }
    const startsWith = signature => signature.every((value, index) => bytes[index] === value);
    const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
    const signatures = {
        jpg: () => startsWith([0xff, 0xd8, 0xff]),
        png: () => startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        gif: () => startsWith([0x47, 0x49, 0x46, 0x38]) &&
            (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61,
        webp: () => startsWith([0x52, 0x49, 0x46, 0x46]) &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    };
    if (!signatures[normalizedExtension]()) {
        throw new Error('El contenido del archivo no coincide con el formato de imagen indicado.');
    }
    return normalizedExtension;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateCatalogImage };
}
