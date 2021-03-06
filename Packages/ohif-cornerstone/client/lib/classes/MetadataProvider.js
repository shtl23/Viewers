import { parsingUtils } from '../parsingUtils';

export class MetadataProvider {

    constructor() {
        this.metadataLookup = new Map();
    }

    /**
     * Cornerstone Metadata provider to store image meta data
     * Data from instances, series, and studies are associated with
     * imageIds to facilitate usage of this information by Cornerstone's Tools
     *
     * e.g. the imagePlane metadata object contains instance information about
     * row/column pixel spacing, patient position, and patient orientation. It
     * is used in CornerstoneTools to position reference lines and orientation markers.
     *
     * @param {String} imageId The Cornerstone ImageId
     * @param {Object} data An object containing instance, series, and study metadata
     */
    addMetadata(imageId, data) {
        const instanceMetadata = data.instance;
        const seriesMetadata = data.series;
        const studyMetadata = data.study;
        const numImages = data.numImages;

        const metadata = {};

        metadata.study = {
            accessionNumber: studyMetadata.accessionNumber,
            patientId: studyMetadata.patientId,
            studyInstanceUid: studyMetadata.studyInstanceUid,
            studyDate: studyMetadata.studyDate,
            studyTime: studyMetadata.studyTime,
            studyDescription: studyMetadata.studyDescription,
            institutionName: studyMetadata.institutionName,
            patientHistory: studyMetadata.patientHistory
        };

        metadata.series = {
            seriesDescription: seriesMetadata.seriesDescription,
            seriesNumber: seriesMetadata.seriesNumber,
            modality: seriesMetadata.modality,
            seriesInstanceUid: seriesMetadata.seriesInstanceUid,
            numImages: numImages
        };

        metadata.instance = instanceMetadata;

        metadata.patient = {
            name: studyMetadata.patientName,
            id: studyMetadata.patientId,
            birthDate: studyMetadata.patientBirthDate,
            sex: studyMetadata.patientSex
        };

        // If there is sufficient information, populate
        // the imagePlane object for easier use in the Viewer
        metadata.imagePlane = this.getImagePlane(instanceMetadata);

        // Add the metadata to the imageId lookup object
        this.metadataLookup.set(imageId, metadata);
    }

    /**
     * Return the metadata for the given imageId
     * @param {String} imageId The Cornerstone ImageId
     * @returns image metadata
     */
    getMetadata(imageId) {
        return this.metadataLookup.get(imageId);
    }

    /**
     * Adds a set of metadata to the Cornerstone metadata provider given a specific
     * imageId, type, and dataset
     *
     * @param imageId
     * @param type (e.g. series, instance, tagDisplay)
     * @param data
     */
    addSpecificMetadata(imageId, type, data) {
        const metadata = {};
        metadata[type] = data;

        const oldMetadata = this.metadataLookup.get(imageId);
        this.metadataLookup.set(imageId, Object.assign(oldMetadata, metadata));
    }

    getFromDataSet(dataSet, type, tag) {
        if (!dataSet) {
            return;
        }

        const fn = dataSet[type];
        if (!fn) {
            return;
        }

        return fn.call(dataSet, tag);
    }

    /**
     * Updates the related metadata for missing fields given a specified image
     *
     * @param image
     */
    updateMetadata(image) {
        const imageMetadata = this.metadataLookup.get(image.imageId);
        if (!imageMetadata) {
            return;
        }

        imageMetadata.instance.rows = imageMetadata.instance.rows || image.rows;
        imageMetadata.instance.columns = imageMetadata.instance.columns || image.columns;

        imageMetadata.instance.sopClassUid = imageMetadata.instance.sopClassUid || this.getFromDataSet(image.data, 'string', 'x00080016');
        imageMetadata.instance.sopInstanceUid = imageMetadata.instance.sopInstanceUid || this.getFromDataSet(image.data, 'string', 'x00080018');

        imageMetadata.instance.pixelSpacing = imageMetadata.instance.pixelSpacing || this.getFromDataSet(image.data, 'string', 'x00280030');
        imageMetadata.instance.frameOfReferenceUID = imageMetadata.instance.frameOfReferenceUID || this.getFromDataSet(image.data, 'string', 'x00200052');
        imageMetadata.instance.imageOrientationPatient = imageMetadata.instance.imageOrientationPatient || this.getFromDataSet(image.data, 'string', 'x00200037');
        imageMetadata.instance.imagePositionPatient = imageMetadata.instance.imagePositionPatient || this.getFromDataSet(image.data, 'string', 'x00200032');

        imageMetadata.instance.sliceThickness = imageMetadata.instance.sliceThickness || this.getFromDataSet(image.data, 'string', 'x00180050');
        imageMetadata.instance.sliceLocation = imageMetadata.instance.sliceLocation || this.getFromDataSet(image.data, 'string', 'x00201041');
        imageMetadata.instance.tablePosition = imageMetadata.instance.tablePosition || this.getFromDataSet(image.data, 'string', 'x00189327');
        imageMetadata.instance.spacingBetweenSlices = imageMetadata.instance.spacingBetweenSlices || this.getFromDataSet(image.data, 'string', 'x00180088');

        imageMetadata.instance.lossyImageCompression = imageMetadata.instance.lossyImageCompression || this.getFromDataSet(image.data, 'string', 'x00282110');
        imageMetadata.instance.lossyImageCompressionRatio = imageMetadata.instance.lossyImageCompressionRatio || this.getFromDataSet(image.data, 'string', 'x00282112');

        imageMetadata.instance.frameIncrementPointer = imageMetadata.instance.frameIncrementPointer || this.getFromDataSet(image.data, 'string', 'x00280009');
        imageMetadata.instance.frameTime = imageMetadata.instance.frameTime || this.getFromDataSet(image.data, 'string', 'x00181063');
        imageMetadata.instance.frameTimeVector = imageMetadata.instance.frameTimeVector || this.getFromDataSet(image.data, 'string', 'x00181065');

        if (image.data && !imageMetadata.instance.multiframeMetadata) {
            imageMetadata.instance.multiframeMetadata = this.getMultiframeModuleMetadata(image.data);
        }

        imageMetadata.imagePlane = imageMetadata.imagePlane || this.getImagePlane(imageMetadata.instance);
    }

    /**
     * Constructs and returns the imagePlane given the metadata instance
     *
     * @param metadataInstance The metadata instance (InstanceMetadata class) containing information to construct imagePlane
     * @returns imagePlane The constructed imagePlane to be used in viewer easily
     */
    getImagePlane(instance) {
        if (!instance.rows || !instance.columns || !instance.pixelSpacing ||
            !instance.frameOfReferenceUID || !instance.imageOrientationPatient ||
            !instance.imagePositionPatient) {
            return;
        }

        const imageOrientation = instance.imageOrientationPatient.split('\\');
        const imagePosition = instance.imagePositionPatient.split('\\');

        let columnPixelSpacing = 1.0;
        let rowPixelSpacing = 1.0;
        if (instance.pixelSpacing) {
            const split = instance.pixelSpacing.split('\\');
            rowPixelSpacing = parseFloat(split[0]);
            columnPixelSpacing = parseFloat(split[1]);
        }

        return {
            frameOfReferenceUID:
                instance.frameOfReferenceUID,
            rows:
                instance.rows,
            columns:
                instance.columns,
            rowCosines:
                new cornerstoneMath.Vector3(parseFloat(imageOrientation[0]), parseFloat(imageOrientation[1]), parseFloat(imageOrientation[2])),
            columnCosines:
                new cornerstoneMath.Vector3(parseFloat(imageOrientation[3]), parseFloat(imageOrientation[4]), parseFloat(imageOrientation[5])),
            imagePositionPatient:
                new cornerstoneMath.Vector3(parseFloat(imagePosition[0]), parseFloat(imagePosition[1]), parseFloat(imagePosition[2])),
            rowPixelSpacing:
                rowPixelSpacing,
            columnPixelSpacing:
                columnPixelSpacing,
        };
    }

    /**
     * This function extracts miltiframe information from a dicomParser.DataSet object.
     *
     * @param dataSet {Object} An instance of dicomParser.DataSet object where multiframe information can be found.
     * @return {Object} An object containing multiframe image metadata (frameIncrementPointer, frameTime, frameTimeVector, etc).
     */
    getMultiframeModuleMetadata(dataSet) {
        const imageInfo = {
            isMultiframeImage: false,
            frameIncrementPointer: null,
            numberOfFrames: 0,
            frameTime: 0,
            frameTimeVector: null,
            averageFrameRate: 0 // backwards compatibility only... it might be useless in the future
        };

        let frameTime;

        if (parsingUtils.isValidDataSet(dataSet)) {

            // (0028,0008) = Number of Frames
            const numberOfFrames = dataSet.intString('x00280008', -1);
            if (numberOfFrames > 0) {

                // set multi-frame image indicator
                imageInfo.isMultiframeImage = true;
                imageInfo.numberOfFrames = numberOfFrames;

                // (0028,0009) = Frame Increment Pointer
                const frameIncrementPointer = parsingUtils.attributeTag(dataSet, 'x00280009') || '';

                if (frameIncrementPointer === 'x00181065') {
                    // Frame Increment Pointer points to Frame Time Vector (0018,1065) field
                    const frameTimeVector = parsingUtils.floatArray(dataSet, 'x00181065');
                    if (frameTimeVector instanceof Array && frameTimeVector.length > 0) {
                        imageInfo.frameIncrementPointer = 'frameTimeVector';
                        imageInfo.frameTimeVector = frameTimeVector;
                        frameTime = frameTimeVector.reduce((a, b) => a + b) / frameTimeVector.length;
                        imageInfo.averageFrameRate = 1000 / frameTime;
                    }
                } else if (frameIncrementPointer === 'x00181063' || frameIncrementPointer === '') {
                    // Frame Increment Pointer points to Frame Time (0018,1063) field or is not defined (for addtional flexibility).
                    // Yet another value is possible for this field (5200,9230 for Multi-frame Functional Groups)
                    // but that case is currently not supported.
                    frameTime = dataSet.floatString('x00181063', -1);
                    if (frameTime > 0) {
                        imageInfo.frameIncrementPointer = 'frameTime';
                        imageInfo.frameTime = frameTime;
                        imageInfo.averageFrameRate = 1000 / frameTime;
                    }
                }

            }

        }

        return imageInfo;
    }

    /**
     * Looks up metadata for Cornerstone Tools given a specified type and imageId
     * A type may be, e.g. 'study', or 'patient', or 'imagePlane'. These types
     * are keys in the stored metadata objects.
     *
     * @param type
     * @param imageId
     * @returns {Object} Relevant metadata of the specified type
     */
    provider(type, imageId) {
        const imageMetadata = this.metadataLookup.get(imageId);
        if (!imageMetadata) {
            return;
        }

        if (imageMetadata.hasOwnProperty(type)) {
            return imageMetadata[type];
        }
    }
}
