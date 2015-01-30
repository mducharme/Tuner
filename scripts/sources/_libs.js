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
}