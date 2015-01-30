/**
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

