/**
* _libs.js
*
* This file contains required external libraries required for Tuner:
* - extend, which reimplements jQuery's _extend_ method without the need for jQuery
* - autoCorrelate
*/

// jQuery extends, without jQuery. From https://github.com/dansdom/extend/blob/master/extend.js
// No license specified, but derived from jQuery.
extend = function() 
{

    var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false,
        // helper which replicates the jquery internal functions
        objectHelper = {
            hasOwn : Object.prototype.hasOwnProperty,
            class2type : {},
            type: function( obj ) {
                return obj == null ?
                    String( obj ) :
                    objectHelper.class2type[ Object.prototype.toString.call(obj) ] || "object";
            },
            isPlainObject: function( obj ) {
                if ( !obj || objectHelper.type(obj) !== "object" || obj.nodeType || objectHelper.isWindow( obj ) ) {
                    return false;
                }

                try {
                    if ( obj.constructor &&
                        !objectHelper.hasOwn.call(obj, "constructor") &&
                        !objectHelper.hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
                        return false;
                    }
                } catch ( e ) {
                    return false;
                }

                var key;
                for ( key in obj ) {}

                return key === undefined || objectHelper.hasOwn.call( obj, key );
            },
            isArray: Array.isArray || function( obj ) {
                return objectHelper.type(obj) === "array";
            },
            isFunction: function( obj ) {
                return objectHelper.type(obj) === "function";
            },
            isWindow: function( obj ) {
                return obj != null && obj == obj.window;
            }
        };  // end of objectHelper

    // Handle a deep copy situation
    if ( typeof target === "boolean" ) {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && !objectHelper.isFunction(target) ) {
        target = {};
    }

    // If no second argument is used then this can extend an object that is using this method
    if ( length === i ) {
        target = this;
        --i;
    } 

    for ( ; i < length; i++ ) {
        // Only deal with non-null/undefined values
        if ( (options = arguments[ i ]) != null ) {
            // Extend the base object
            for ( name in options ) {
                src = target[ name ];
                copy = options[ name ];

                // Prevent never-ending loop
                if ( target === copy ) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if ( deep && copy && ( objectHelper.isPlainObject(copy) || (copyIsArray = objectHelper.isArray(copy)) ) ) {
                    if ( copyIsArray ) {
                        copyIsArray = false;
                        clone = src && objectHelper.isArray(src) ? src : [];

                    } else {
                        clone = src && objectHelper.isPlainObject(src) ? src : {};
                    }

                    // Never move original objects, clone them
                    target[ name ] = Extend( deep, clone, copy );

                // Don't bring in undefined values
                } else if ( copy !== undefined ) {
                    target[ name ] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;
};

// Auto-correlate function. MIT-Licensed From https://github.com/cwilso/PitchDetect/blob/master/js/pitchdetect.js
// Copyright (c) 2014 Chris Wilson
function autoCorrelate(buffer, sample_rate) 
{
	var SIZE = buffer.length;
	var MIN_SAMPLES = 0;
	var MAX_SAMPLES = Math.floor(SIZE/2);

	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0;
	var foundGoodCorrelation = false;
	var correlations = new Array(MAX_SAMPLES);

	for (var i=0; i<SIZE; i++) {
		var val = buffer[i];
		rms += (val*val); // val^2;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) {
        // not enough signal
		return -1;
    }

	var last_correlation=1;
	for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (var i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buffer[i]) - (buffer[i+offset]));
		}
		correlation = 1 - (correlation / MAX_SAMPLES);
		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
		if ((correlation>0.9) && (correlation > last_correlation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} 
        else if(foundGoodCorrelation) {
			// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
			// Now we need to tweak the offset - by interpolating between the values to the left and right of the
			// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
			// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
			// (anti-aliased) offset.

			// we know best_offset >=1, 
			// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
			// we can't drop into this clause until the following pass (else if).
			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
			return sample_rate/(best_offset+(8*shift));
		}
		last_correlation = correlation;
	}
	if(best_correlation > 0.01) {
		// console.log("f = " + sample_rate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
		return (sample_rate / best_offset);
	}

	return -1;
//	var best_frequency = sample_rate/best_offset;
};/**
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


;/**
* @file tuner.note.js
*

* @author Mathieu Ducharme <mat@locomotive.ca>
* @copyright Mathieu Ducharme 2015 
*/

// Ensure namespace is set, if using this file as standalone
var Tuner = Tuner || {};

/**
* Tuner.Note class
*
* This class allows to find the proper target note from a frequency but
* also to get name (or fullname), octave, frequency of a note or its delta to another frequency.
*
* Usage:
* ```
* var note = new Tuner.Note('440 Hz');
* note.fullname(); // Output: "A4"
* note.name(); // Output "A"
* note.octave(); // Output "4"
* note.number(); // Output "69"
* note.frequency(); // Output "440"
* ```
*
* Alternative constructor parameters:
* ```
* // Use 443Hz tuning (orchestra)
* var note = new Tuner.Note(null, {base_frequency:443});
* note.from_number(69);
* ```
*
* ## Note information
* Note informations can be gathered with the methods:
* - `fullname()`
* - `name()`
* - `octave()`
* - `frequency()`
* - `number()`
*
* ## Using flat symbols or sharp symbols
* Every sharp notes can be displayed in two ways, either as a sharp-note or a flat-note.
*
* ## Finding the proper note from string
* The constructor accepts any type as a parameter. If it is a number of a numberic string, then it
* will be assumed to be a frequency (in _Hz_). If it is a non-numeric string, it will
*
* ## Using as a tuner
* There are 
*
* @class Tuner.Note
* @typedef {Object} Tuner.Note
* @param {string|number} note_ident
* @param {Tuner.Note.Options} opts
* @constructor
*/
Tuner.Note = function(note_ident, opts)
{
	// 12 half-tones, can be expressed as sharps or flat (depending on `default_opts.use_sharp`)
	this.NOTES_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
	this.NOTES_FLAT =  ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
	this.NUM_NOTES = 12; // this.NOTES_SHARP.length; 

	/**
	* @typedef {Tuner.Note.Options}
	*/
	var default_opts = {
		/**
		* Base frequency, for calculation. 
		* Defaults to 440 Hz. (A4)
		* @type {float}
		*/
		base_frequency: 440,
		/**
		* Base note, for frequency calculation. Should match base frequency.
		* Defaults to 69. (A4)
		* @type {integer}
		*/
		base_note: 69,

		/**
		* If no octave is present in a not name, the default will be used.
		* @type {integer}
		*/
		default_octave: 4,

		/**
		* If set to false, the "flat" notation will be displayed instead
		* @type {boolean}
		*/
		use_sharp: true
	};

	/**
	* @type {Object}
	*/
	this.options = extend(default_opts, opts);

	/**
	* The note number
	* @type {?integer}
	*/
	this.val = null;

	/**
	* The difference (in Hz) from the exact note frequency
	* @type {?float}
	*/
	this.delta = null;


	// Get the value from parameter, if any passed
	if(note_ident) {
		this.from_ident(note_ident);
	}

};


/**
* Attempt to load from a parameter, wich can be a name or a frequency
*/
Tuner.Note.prototype.from_ident = function(ident)
{
	if(!ident) {
		return this;
	}

	// If a number, assume frequency
	var f = parseFloat(ident);
	if(f) {
		return this.from_frequency(f);
	}
	else {
		return this.from_name(ident);
	}
};

/**
* Get the closest note from frequency
*
* @return {Tuner.Note}
* @see http://en.wikipedia.org/wiki/Piano_key_frequencies
*/
Tuner.Note.prototype.from_frequency = function(frequency)
{
	// Allow numeric string
	frequency = parseFloat(frequency);

	// A6 = 440Hz = 69. @todo From options
	var base_freq = this.options.base_frequency;
	var base_number = this.options.base_note;

	if(frequency < 0) {
		this.val = null;
		this.delta = null;
		return this;
	}

	// n = (12 × log2 (f / 440)) + 69
	this.val = Math.round(this.NUM_NOTES*(Math.log(frequency / base_freq)/Math.log(2))+base_number);
	this.delta = this.diff(frequency);

	// Chainable
	return this;
};

/**
* Initialize from an exact note number.
*
* The note number is the 
*
* @param {integer} number - The note's number (index)
*/
Tuner.Note.prototype.from_number = function(number)
{
	this.val = number;
	this.delta = 0;

	// Chainable
	return this;
};

/**
* Attempt to find note number from a note name.
* 
* The note name (the `fullname` parameter) can be:
* - The complete note name, including the sharp / flat sign and the octave
*   - Ex: "A4", "E♭6"
* - Only the note name without the octave
*   - Ex: "A", "F♯"
*   - In this case, the default octave (from options) will be assumed
* - The note with the flat sign or sharp sign as ASCII charavers (# or b)
*   - Ex: "A#", "Eb6", "F#2"
* 
* @param {string} fullname
* @returns {Tuner.Note}
*/
Tuner.Note.prototype.from_name = function(fullname)
{
	// This script works in Unicode. Input might not
	fullname = fullname.replace(/#/g, '♯');
	fullname = fullname.replace(/b/g, '♭');

	// Fullname parameter is split in name + octave
	var name = fullname.replace(/\d+/g, '');
	var octave = parseInt(fullname.replace(/\D+/g, ''));
	// If no octave was specified, use default
	octave = octave || this.options.default_octave;

	// Check If the note exists. 
	var num = (name.indexOf('♭') >= 0) ? this.NOTES_FLAT.indexOf(name) : this.NOTES_SHARP.indexOf(name);
	
	if(num !== -1) {
		this.val = num + (this.NUM_NOTES * (octave + 1));
		this.delta = 0;
	}

	// Chainable
	return this;
};

/**
* Get the note's index number.
*
* This is also its MIDI number.
* - `C-1` is #0 (8.176 Hz)
* - `A0` is #21 (27.5 Hz)
* - `C4` is #60 (261.626 Hz)
* - `A4` is #69 (440 Hz)
* - `C8` is #88 (4186.01 Hz)
*
* Note that this does not correspont to piano key
*
* @returns {integer}
*/
Tuner.Note.prototype.number = function()
{
	// 
	return this.val;
};

/**
* Get the note's piano key number.
*
* Piano key starts at #21 (`A0` / 27.5 Hz)
*
* @returns {integer}
*/
Tuner.Note.prototype.piano_key = function()
{
	return this.number() - 20;
};


/**
* Get the name (without octave) of the current note.
*
* ## Options:
* - `use_sharp`
*
* @param {Object} opts - Extended options
* @returns {string}
*/
Tuner.Note.prototype.name = function(opts)
{
	if(this.val === null) {
		return '--';
	}

	// Allow custom options
	var default_opts = {
		use_sharp: this.options.use_sharp
	};
	var options = extend(default_opts, opts);

	// Ensure pos is between 0 and 12
	var pos = (this.val % this.NUM_NOTES);

	if(options.use_sharp) {
		return this.NOTES_SHARP[pos];
	}
	else {
		return this.NOTES_FLAT[pos];
	}
};

/**
* Get the note's full name (The name + the octave number)
*/
Tuner.Note.prototype.fullname = function()
{
	var val = this.number();
	if(val === null) {
		return '--';
	}
	return (this.name() + this.octave());
};

/**
* Get the note's exact frequency
*
* @returns {float}
*/
Tuner.Note.prototype.frequency = function()
{
	var val = this.number();
	if(val === null) {
		return null;
	}

	// Typically, use A4 (69) = 440 Hz
	var base_freq = this.options.base_frequency;
	var base_number = this.options.base_note; 

	return (base_freq * Math.pow(2,(val-base_number)/this.NUM_NOTES));
};

/**
* Get the note's octave
*
* Between -1 and 9 (`A0` is first piano key, note #21)
*
* @returns {integer}
*/
Tuner.Note.prototype.octave = function()
{
	if(this.val === null) {
		return null;
	}

	return (Math.floor(this.val / this.NUM_NOTES)-1);
};

/**
* Get the Hz difference of this note from a given frequency
*
* @returns {float}
*/
Tuner.Note.prototype.diff = function(freq)
{
	freq = freq || null;
	if(!freq) {
		// Called without parameters, this returns the saved delta
		return this.delta;
	}

	var note_freq = this.frequency();
	if(note_freq === null) {
		return null;
	}

	return (note_freq - freq);
};

/**
* Get the "cents" difference of this note from a given frequency
*
* A "cent" is 1/100 of a halftone. The logarithmic equation is:
* `cents = 1200 * ln(f2/f1) / ln2`
*
* @returns {float}
* @see http://hyperphysics.phy-astr.gsu.edu/hbase/music/cents.html
*/
Tuner.Note.prototype.diff_cents = function(freq)
{
	freq = freq || null;
	if(!freq) {
		// Called without parameters, this returns the saved delta
		freq = this.delta;
	}

	// Get the diff in Hz
	var freq_note = this.frequency();
	if(freq == freq_note) {
		return 0;
	}

	// Calcluate cents difference 
	var cents = Math.floor(1200 * Math.log(freq / this.frequency()) / Math.log(2));

	return cents;
};

;/**
* Tuner Source (Audio signal source)
*
* @typedef {Object} Tuner.Source
* @abstract
*/
Tuner.Source = function(tuner, opts)
{
	console.debug('Tuner.Source');
	var default_opts = {};

	this.options = extend(default_opts, opts);

	this.init(tuner);
};

Tuner.Source.prototype.init = function(tuner)
{
	console.debug('Tuner.Source::init');
	this.tuner = tuner;
};
;/**
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
};;/**
* tuner.generator.js
*
* @author Mathieu Ducharme <mat@locomotive.ca>
* @copyright 2015 
*/

/**
* Note generator
*/
Tuner.Generator = function(opt)
{

};;/**
* tuner.generator.audio.js
*
* @author Mathieu Ducharme <mat@locomotive.ca>
* @copyright 2015 
*/

/**
* Audio note generator
*
* This generator uses the Oscillator
*/
Tuner.Generator.Audio = function(opts)
{

};
Tuner.Generator.Audio.prototype = new Tuner.Generator();
Tuner.Generator.Audio.prototype.constructor = Tuner.Generator;;/**
* tuner.ui.js
*
* @author Mathieu Ducharme <mat@locomotive.ca>
* @copyright 2015 
*/

/**
* Tuner UI
*
* @typedef {Object} Tuner.Ui
* @constructor
*/
Tuner.Ui = function(opts)
{
	this.tuner = null;

	var default_opts = {};
	this.options = extend(default_opts, opts);
};

/**
* Called every tick
*/
Tuner.Ui.prototype.update = function()
{
	console.debug('Update UI');

};

/**
* Draw a waveform in a Canvas
*
* @param {CanvasRenderingContext2D} ctx - The Canvas' 2D context
* @param {Uint8Array|Float32Array} buffer - The array of values to display
* @param {Object} opts - Extra options, to override defaults
*/
Tuner.Ui.prototype.draw_waveform = function(ctx, buffer, opts)
{
	var default_opts = {
		background: {
			//color: 'black',

			num_separator: 8,
			separator_color: 'lightgray',
			separator_width: 1
		},
		graph: {
			color: 'green',
			width: 1,
			fill_color: 'red'
		}
	};
	var options = extend(default_opts, opts);

	var w = ctx.canvas.width;
	var h = ctx.canvas.height;
	ctx.clearRect(0, 0, w, h);


	if(options.background.color) {
		ctx.save();
		ctx.fillStyle = options.background.color;
		ctx.fillRect(0, 0, w, h);
		ctx.restore();
	}

	// Background
	var num_lines = options.background.num_separator;
	ctx.strokeStyle = options.background.separator_color;
	ctx.lineWidth = options.background.separator_width;
	ctx.beginPath();
	for(var l=0; l<=num_lines; l++) {
		var p = (w * (l / num_lines));
		ctx.moveTo(p, 0);
		ctx.lineTo(p, h);
	}
	ctx.stroke();

	// Graph
	ctx.strokeStyle = options.graph.color;
	ctx.lineWidth = options.graph.width;
	if(options.graph.fill_color) {
		ctx.fillStyle = options.graph.fill_color;
	}
	ctx.beginPath();

	var step_size = w * 1.0 / buffer.length;
	var x = 0;
	for(var j = 0; j < buffer.length; j++) {

		var y = (h/2) + (buffer[j] * (h/2));
		ctx.lineTo(x, y);
		x += step_size;
	}

	//ctx.lineTo(w, h/2);
	ctx.stroke();

};

/**
* Draw a waveform in a Canvas
*
* @param {CanvasRenderingContext2D} ctx - The Canvas' 2D context
* @param {Uint8Array|Float32Array} buffer - The array of values to display
* @param {Object} opts - Extra options, to override defaults
*/
Tuner.Ui.prototype.draw_bargraph = function(ctx, buffer, opts)
{
	var default_opts = {
		background: {
			fillstyle: 'black',

			num_separator: 8,
			separator_strokestyle: 'lightgray',
			separator_linewidth: 1
		},
		graph: {
			strokestyle: 'green',
			linewidth: 1

		}
	};
	var options = extend(default_opts, opts);

	var w = ctx.canvas.width;
	var h = ctx.canvas.height;
	ctx.clearRect(0, 0, w, h);

	// Background
	if(options.background.fillstyle) {
		ctx.fillStyle = options.background.fillstyle;
		ctx.fill();
	}
	var num_lines = options.background.num_separator;
	ctx.strokeStyle = options.background.separator_strokestyle;
	ctx.lineWidth = options.background.separator_linewidth;
	ctx.beginPath();
	for(var l=0; l<=num_lines; l++) {
		var p = (w * (l / num_lines));
		ctx.moveTo(p, 0);
		ctx.lineTo(p, h);
	}
	ctx.stroke();

	// Graph
	ctx.strokeStyle = options.graph.strokestyle;
	ctx.lineWidth = options.graph.linewidth;
	ctx.beginPath();
	for(var i=1; i<w; i++) {
		var x = i;
		var y = (h/2) + (buffer[i] * (h/2));
		ctx.lineTo(x, y);
	}
	ctx.stroke();

};;/**
* tuner.ui.debug.js
*
* @author Mathieu Ducharme <mat@locomotive.ca>
* @copyright 2015 
*/

/**
* The debug UI is as simple as it gets
*
* @typedef {Objet} Tuner.Ui.Debug
* @constructor
*/
Tuner.Ui.Debug = function(tuner, opts)
{
	var default_opts = {};
	this.options = 

	this.init(tuner);
};
Tuner.Ui.Debug.prototype = new Tuner.Ui();
Tuner.Ui.Debug.prototype.constructor = Tuner.Ui;

/**
* Debug Ui Initialization
*
*/
Tuner.Ui.Debug.prototype.init = function(tuner)
{
	this.tuner = tuner;

	this.el_waveform = document.getElementById("waveform").getContext("2d");

	this.el_frequency = document.querySelector('.tuner-data.frequency');
	this.el_note_index = document.querySelector('.tuner-data.note_index');
	this.el_note = document.querySelector('.tuner-data.note');
	this.el_octave = document.querySelector('.tuner-data.octave');
	this.el_diff = document.querySelector('.tuner-data.diff');
	this.el_diff_cents = document.querySelector('.tuner-data.diff_cents');
};

/**
* Update the debug UI
*/
Tuner.Ui.Debug.prototype.update = function()
{
	//console.debug('Update UI');
	var frequency;
	var note;

	try {
		frequency = this.tuner.frequency();
		note = new Tuner.Note(frequency);
	}
	catch(e) {
		console.debug('Could not show UI');
		console.debug(e);
		return false;
	}

	if(frequency == -1 || frequency === null || isNaN(frequency)) {
		//$('.tuner-data.frequency').html('--');
		this.el_frequency.innerHTML = '--';
	}
	else {
		//$('.tuner-data.frequency').html(frequency.toFixed(2) + ' Hz');
		this.el_frequency.innerHTML = frequency.toFixed(2) + ' Hz';
	}

	// Note (frequency) information
	var number = note.number();
	var name = note.name();
	var octave = note.octave();
	var diff = note.diff();
	diff = (typeof diff == 'number') ? diff.toFixed(2) : diff;
	var diff_cents = note.diff_cents();
	diff_cents = (typeof diff_cents == 'number') ? diff_cents.toFixed(2) : diff_cents;

	$('.tuner-data.note-index').html(number);
	$('.tuner-data.note').html(name);
	$('.tuner-data.octave').html(octave);
	$('.tuner-data.diff').html(diff);
	$('.tuner-data.diff_cents').html(diff_cents);
	
	// Signal information
	this.draw_waveform(this.el_waveform, this.tuner.source.timedomain_data);

	// Tuner Settings
	var base_freq = (this.tuner.options.base_frequency || 440);
	var instrument = this.tuner.instrument();
	var instrument_str = this.tuner.available_instruments[instrument].name;
	var tuning = this.tuner.tuning();
	//console.debug(this.tuner.available_tunings[instrument]);
	var tuning_str = this.tuner.available_instruments[instrument].tunings[tuning].name;
	var tuning_notes = this.tuner.available_instruments[instrument].tunings[tuning].notes;
	var notes_str = '';
	for(var n in tuning_notes) {
		notes_str += (tuning_notes[n]+' ');
	}

	$('.tuner-data.base-frequency').html(base_freq + ' Hz');
	$('.tuner-data.instrument').html(instrument_str);
	$('.tuner-data.tuning').html(tuning_str);
	$('.tuner-data.tuning-info').html(notes_str);
	
	return true;
};