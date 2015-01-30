/**
* tuner.js
*
* @author Mathieu Ducharme <mat@locomotive.ca>
* @copyright 2015 
*/

/**
* Javascript Tuner
*
* ## Options
* - `source_type`
* - `ui_type`
* - `generator_type`
* - `buffer_length`
* - `audio_options`
* - `guitarix_options`
* - `instrument`
* - `tuning`
*
* @typedef {Object} Tuner
* @constructor
* @param {object} opts - Custom initialization options
*/
var Tuner = function(opts) {

	"use strict";

	/**
	* @var Tuner.Source
	*/
	this.source = null;

	/**
	* @var Tuner.Ui
	*/
	this.ui = null;

	
	/**
	* Request Animation Frame ID
	* @var {integer}
	*/
	var raf_id = null;

	/**
	* @typedef {Object} Tuner.Options
	*/
	var default_opts = {
		/**
		* Audio signal source.
		*
		* Available types are:
		* - audio (audiocontext / getUserMedia api)
		* - guitarix (guitarix / websocket -- todo)
		*
		* @type {string}
		*/
		source_type: 'audio',

		/**
		* UI type.
		*
		* The UI is responsible for everything (visual) in the page.
		* Available types are:
		* - debug
		*
		* @type {string}
		*/
		ui_type: 'debug',

		/**
		* Tone generator type. Can be:
		* - audio (audiocontext / oscillator)
		* - guitarix (guitarix / websocket -- todo)
		* 
		* @type {string}
		*/
		generator_type: 'audio',

		/**
		* The buffer length.
		*
		* The lower this number is, the lower the latency should be.
		* This also means higher processing required.
		*/
		buffer_length: 2048,

		/**
		* Default / current instrument
		*
		* @see {this.available_instruments}
		*/
		instrument: 'guitar',
		tuning: null, // When null, use instrument's default

		/**
		* Base frequency (Frequency of A4)
		* @type {float}
		*/
		base_frequency: 440.0,

		/**
		* The cents after which a note will be considered out of tune
		* Typically, JND (Just-noticeable-difference) is 5 cents
		* @type {integer}
		*/
		cents_threshold: 5

	};

	/**
	* Options from parameters or default
	* The extend function is defined in _libs.js
	* @type {Tuner.Options}
	*/
	this.options = extend(default_opts, opts); // @todo Merge instead

	/**
	* Available instruments
	* @type {Object}
	*/
	this.available_instruments = {
		none: {
			name: "None",
			default_tuning: 'chromatic',
			tunings:{
				chromatic:{
					name: "Chromatic",
					notes: null
				}
			}
		},
		guitar: {
			name: "Guitar (6-strings)",
			default_tuning: 'regular',
			tunings:{
				regular: {
					name: "Regular Tuning",
					notes: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2']
				},
				dropd: {
					name: "Drop-D",
					notes: ['D4', 'B3', 'G3', 'D3', 'A2', 'E2']
				},
				openg: {
					name: "Open-G",
					notes: ['D4', 'G4', 'D3', 'G3', 'B2', 'D2']
				}
			}
		},
		guitar7: {
			name: "Guitar (7-strings)",
			default_tuning: 'regular',
			tunings:{
				regular: {
					name: "Regular Tuning",
					notes: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2']
				}
			}
		},
		bass: {
			name: "Bass (4-strings)",
			default_tuning: 'regular',
			tunings:{
				regular: {
					name: "Regular Tuning",
					notes:['G2', 'D2', 'A1', 'E1']
				}
			}
		},
		bass5: {
			name: "Bass (5-strings)",
			default_tuning: 'regular',
			tuning:{
				regular: {
					name: "Regular Tuning",
					notes:['G2', 'D2', 'A1', 'E1', 'B0']
				}
			}
		},
		bass5tenor: {
			name: "Bass (5-strings, tenor)",
			default_tuning: 'regular',
			tunings:{
				regular: {
					name: "Regular Tuning",
					notes: ['C3', 'G2', 'D2', 'A1', 'E1']
				}
			}
		},
		ukulele: {
			name: "Ukulele",
			default_tuning: 'regular',
			tunings: {
				regular: {
					name: "Regular Tuning",
					notes:['A', 'E', 'C', 'G']
				},
				english: {
					name: "English Tuning",
					notes: ['B', 'F#', 'D', 'A']
				},
				baritone: {
					name: "Baritone Tuning",
					notes: ['E', 'B', 'G', 'D']
				}
			}
		}
	};

	// Initialize tuner
	this.init();
	
};

/**
* Main loop
*/
Tuner.prototype.tick = function()
{
	// Nothing more to do than update the UI.
	this.ui.update();	

	if (!window.requestAnimationFrame) {
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
	}

	// Main loop, using main timer (requestAnimationFrame)
	this.raf_id = window.requestAnimationFrame(this.tick.bind(this));
};

/**
	* Initialization
	*
	* Connect the Source (audio signal) and the Ui
	*
	* @see Tuner.Source
	* @see Tuner.Ui
	*/
Tuner.prototype.init = function()
{
		console.debug('Tuner::init');

		// Connect source
		var source_type = this.source_type();
		switch(source_type) {
			case 'audio':
				try {
					this.source = new Tuner.Source.Audio(this);
				}
				catch(e) {
					console.debug(e);
				}
			break;
		}

		// Attach UI
		var ui_type = this.ui_type();
		switch(ui_type) {
			case 'debug':
				this.ui = new Tuner.Ui.Debug(this);
			break;
		}

};

/**
* Get the actual source type from options
*
* @return string
*/
Tuner.prototype.source_type = function()
{
	var source_type = this.options.source_type;
	return source_type;
};

/**
* Get the actual source type from options
* @return string
*/
Tuner.prototype.ui_type = function()
{
	console.debug(this.options.ui_type);
	return this.options.ui_type;
};

/**
* Get the actual instrument from options
* @return string
*/
Tuner.prototype.instrument = function()
{
	return this.options.instrument;
};

/**
* Get the actual tuning type
*
* @return string
*/
Tuner.prototype.tuning = function()
{
	var tuning = this.options.tuning;
	if(tuning === null) {
		var instrument = this.instrument();
		var inst = this.available_instruments[instrument];
		return inst.default_tuning;
	}

	return tuning;
};

/**
* Get the actual frequency, in Hz, from source
*
* @return {float}
*/
Tuner.prototype.frequency = function()
{
	try {
		return this.source.frequency();
	}
	catch(e) {
		console.debug(e);
		// Source could not return frequency.
		return 0;
	}
};

/**
* Get the current note (name)
*
* Returns the note object from the current frequency
*
* @returns {Tuner.Note}
*/
Tuner.prototype.note = function()
{
	var freq = this.frequency();
	var n = new Tuner.Note();
	n.from_frequency(this.frequency());

	return n;
};


