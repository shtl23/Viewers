import { cornerstoneWADOImageLoader } from 'meteor/ohif:cornerstone';

Meteor.startup(function() {
	const maxWebWorkers = Math.max(navigator.hardwareConcurrency - 1, 1);
    const config = {
	    maxWebWorkers: maxWebWorkers,	
    	startWebWorkersOnDemand: true,
        webWorkerPath : '/packages/ohif_cornerstone/public/js/cornerstoneWADOImageLoaderWebWorker.js',
        taskConfiguration: {
            'decodeTask' : {
		        loadCodecsOnStartup : true,
		        initializeCodecsOnStartup: false,
                codecsPath: '/packages/ohif_cornerstone/public/js/cornerstoneWADOImageLoaderCodecs.js',
                usePDFJS: false
            }
        }
    };

    cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
});