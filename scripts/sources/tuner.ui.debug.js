/**
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