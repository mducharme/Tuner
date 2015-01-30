/**
* tuner.source.audio.js
*
* @author Mathieu Ducharme <mat@locomotive.ca>
* @copyright 2015 
*/

/**
* Audio Source (Signal)
*
* @typedef {Object} Tuner.Source.Audio
* @constructor
*/
Tuner.Source.Audio = function(tuner, opts) 
{
	/**
	* Audio / Source options
	* @typedef {Object} Tuner.Source.Audio.Options
	*/
	var default_options = {

		/**
		* The options that will be passed to `getUserMedia()`
		*
		* By default, disable all effects from Chrome
		* @type {Object}
		*/
		media_audio_options: {
			"mandatory": {
				"googEchoCancellation": "false",
				"googAutoGainControl": "false",
				"googNoiseSuppression": "false",
				"googHighpassFilter": "false"
			},
			"optional": []
		},

		/**
		* If false, then integers will be used instead of floats for frequency and timedomain calculations
		* @type {boolean}
		*/
		use_float: true,

		/**
		* If false, all filters will be disabled
		* @type {boolean}
		*/
		use_filters: true,

		/**
		* Filter options
		*/
		filters: {

			lowpass: {
				/**
				* By default, always cut above 5k Hz
				* @type {float}
				*/
				frequency: 5000
			}
		}
	};

	this.options = extend(default_options, opts);

	/**
	* The AudioContext object
	* @type {?AudioContext}
	*/
	this.audio_context = null;

	/**
	* The AnalyserNode object
	* @type {?AnalyserNode}
	*/
	this.analyser = null;

	/**
	* The BiquadFilterNode object holding the lowpass filter (cuts at 5k Hz)
	* @type {?BiquadFilterNode}
	*/
	this.lowpass_filter = null;

	/**
	* The GainNode object, unused for now
	* @type {?GainNode}
	*/
	this.gain = null;

	this.frequency_data = null;
	this.timedomain_data = null;
	this.gain_data = null;

	// Constructor simply cals `init()`
	this.init(tuner);
};

// Inherits Tuner.Source
Tuner.Source.Audio.prototype = new Tuner.Source();
Tuner.Source.Audio.prototype.constructor = Tuner.Source;

/**
* Initialization
*
* @param {Tuner}
*/
Tuner.Source.Audio.prototype.init = function(tuner)
{
	// Parent tuner
	this.tuner = tuner;

	// Set global objects (`AudioContext` and `getUserMedia`) depending on browser
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	navigator.getUserMedia = (
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia
	);

	try {
		
		// Read options from parent's `Tuner` object
		var audio_options = this.options.media_audio_options;
		// Start Audio Input capture
		var usermedia = navigator.getUserMedia({audio:audio_options}, this.connect_success.bind(this), this.connect_error.bind(this));
	}
	catch(e) {

		console.debug(e);
		alert('Unsupported browser. Your browser does not support a microphone.');
	}
};

/**
* Success getting the audio context (callback)
* @callback
*/
Tuner.Source.Audio.prototype.connect_success = function(stream)
{
	//console.debug('Tuner.Source.Audio::connect_success');

	try {
		// Initialize an audio context
		this.audio_context = new window.AudioContext();
		
		// Create an `AudioNode` from the stream.
		var audio_source = this.audio_context.createMediaStreamSource(stream);

		// Create the `BiquadFilterNode` to hold the lowpass filter
		this.lowpass_filter = this.audio_context.createBiquadFilter();
		// And setup to cutoff at 5k Hz. @todo Make customizable per instrument
		this.lowpass_filter.type = "lowpass";
		this.lowpass_filter.frequency.value = 5000;

		// Connect it to to the audio source
		audio_source.connect(this.lowpass_filter);

		// Create an `AnalyserNode`
		this.analyser = this.audio_context.createAnalyser();
		// Setup the analyser. @todo Make customizable
		this.analyser.fftSize = 2048;
		this.analyser.minDecibels = -90;
		this.analyser.maxDecibels = -10;
		this.analyser.smoothingTimeConstant = 0.85;

		// Connect it to the destination.
		this.lowpass_filter.connect(this.analyser);

		this.tuner.tick();
	}
	catch(e) {
		
		console.debug(e);
	}
};

/**
* Error getting the audio context (callback)
* @callback
*/
Tuner.Source.Audio.prototype.connect_error = function(e)
{
	alert('Tuner can not work without microphone access. Please allow tuner to use your microphone or change the object source type.');
};

/**
* Get the frequency data table
* @returns {Float32Array|Uint8Array}
*/
Tuner.Source.Audio.prototype.frequencies = function(buffer)
{
	if(this.analyser === null) {
		// Can't do anything with an inalid analyser...
		return null;
	}

	// Either use buffer from parameter or create one
	if(typeof buffer == 'undefined') {
		buffer = this._get_frequency_data_buffer();
	}

	if(this.options.use_float) {
		this.analyser.getFloatFrequencyData(buffer);
	}
	else {
		this.analyser.getByteFrequencyData(buffer);
	}

	return buffer;
};

Tuner.Source.Audio.prototype._get_frequency_data_buffer = function()
{
	var buffer_size = this.analyser.frequencyBinCount;
	
	//if(this.frequency_data === null) { //} || this.frequency_data.length != buffer_size) {
		if(this.options.use_float) {
			this.frequency_data = new Float32Array(buffer_size);
		}
		else {
			this.frequency_data = new Uint8Array(buffer_size);
		}
	//}
	return this.frequency_data;
};

/**
* Get the timedomain data table
* @returns {Float32Array|Uint8Array|null}
*/
Tuner.Source.Audio.prototype.timedomains = function(buffer)
{
	if(this.analyser === null) {
		// Can't do anything with an inalid analyser...
		return null;
	}

	// Either use buffer from parameter or create one
	buffer = buffer || this._get_timedomain_data_buffer();
	if(typeof buffer == 'undefined') {
		buffer = this._get_timedomain_data_buffer();
	}
	
	// Fill in the data, either as float or 8-bit integers
	if(this.options.use_float) {
		this.analyser.getFloatTimeDomainData(buffer);
	}
	else {
		this.analyser.getByteTimeDomainData(buffer);
	}

	return buffer;
};

Tuner.Source.Audio.prototype._get_timedomain_data_buffer = function()
{
	var buffer_size = this.analyser.fftSize;
	
	//if(this.timedomain_data === null) {//} || this.timedomain_data.length != buffer_size) {
		if(this.options.use_float) {
			this.timedomain_data = new Float32Array(buffer_size);
		}
		else {
			this.timedomain_data = new Uint8Array(buffer_size);
		}
	//}
	return this.timedomain_data;
};


/**
* Get the current source's fundamental frequency, in Hz.
*
* @returns {float}
*/
Tuner.Source.Audio.prototype.frequency = function()
{
	try {

		var timedomain_data = this.timedomains();

		// Auto-correlate timedomain values (RMS)
		var ac = autoCorrelate(timedomain_data, this.audio_context.sampleRate);

		return ac;
	}
	catch(e) {
		// @todo Handle error
		console.debug(e);
	}
};

/**
* Get the signal level, in db
*
* @returns {float}
*/
Tuner.Source.Audio.prototype.level = function()
{
	return 0;
};