/**
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

};