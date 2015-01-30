/**
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
