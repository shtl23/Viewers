/**
 * Obtain an imageId for Cornerstone from an image instance
 *
 * @param instance
 * @returns {string} The imageId to be used by Cornerstone
 */
getImageId = function(instance, frame) {
    if (!instance) {
        return;
    }

    if (instance.url) {
        return instance.url;
    }

    if (instance.wadouri) {
        var imageId = 'dicomweb:' + instance.wadouri; // WADO-URI;
        if (frame !== undefined) {
            imageId += '&frame=' + frame;
        }

        return imageId;
    } else {
        return getWADORSImageId(instance, ++frame); // WADO-RS Retrieve Frame
    }
};