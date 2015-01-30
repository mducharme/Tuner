/**
* Unit tests for Tuner.Note
*/
QUnit.module("Tuner.Note");

// Simple test to ensure everything has been included properly
QUnit.test("Tuner.Note class", function(assert) 
{
	assert.ok(Tuner.Note, "Main namespace exists");
});

// No value should be set when constructed without any parameter
QUnit.test("Constructor without parameters", function(assert) 
{
	var n = new Tuner.Note();
	assert.equal(n.number(), null, "Value (number) is null when called without parameters");
});

// No value should be set when constructed without any parameter
QUnit.test("Constructor with frequency parameter", function(assert) 
{
	var n1 = new Tuner.Note(440.0);
	assert.equal(n1.frequency(), 440.0, "Frequency is properly set when constructor has float parameter");

	var n2 = new Tuner.Note("440.00");
	assert.equal(n2.frequency(), 440.0, "Frequency is properly set when constructor has a string parameter");

	var n3 = new Tuner.Note("440 Hz");
	assert.equal(n3.frequency(), 440.0, "Frequency is properly set when constructor has a string parameter containing \"Hz\"");

	var n4 = new Tuner.Note(440);
	assert.equal(n4.frequency(), 440.0, "Frequency is properly set when constructor has integer parameter");
});


// Constructor with note name (ex: "A#" parameter). This also tests the `from_name()` function.
QUnit.test("Constructor with note name parameter", function(assert) 
{
	var n1 = new Tuner.Note("A");
	assert.equal(n1.name(), "A", "Note is properly set when constructor has a note string parameter");
	assert.equal(n1.octave(), 4, "Default octave is 4 when none is passed");

	var n2 = new Tuner.Note("A", {default_octave: 5});
	assert.equal(n2.name(), "A", "Frequency is properly set when constructor has a note string parameter with a custom octave");
	assert.equal(n2.octave(), 5, "Frequency is properly set when constructor has a note string parameter with a custom octave");

	var n3 = new Tuner.Note("A#");
	assert.equal(n3.name(), "A♯", "Frequency is properly set when constructor has a a sharp note with the \"#\" symbol");

	var n4 = new Tuner.Note("A♯");
	assert.equal(n4.name(), "A♯", "Frequency is properly set when constructor has a a sharp note with the \"♯\" symbol");

	var n5 = new Tuner.Note("Eb");
	assert.equal(n5.name(), "D♯", "Frequency is properly set when constructor has a a flat note with the \"b\" symbol");

	var n6 = new Tuner.Note("E♭");
	assert.equal(n6.name(), "D♯", "Frequency is properly set when constructor has a a flat note with the \"♭\" symbol");
});

// Constructor with invalid parameters
QUnit.test("Constructor with invalid parameter", function(assert) 
{
	var n1 = new Tuner.Note('X');
	assert.equal(n1.frequency(), null, "Frequency is null when constructor parameter is an invalid string (\"X\")");

	var n2 = new Tuner.Note(null);
	assert.equal(n2.frequency(), null, "Frequency is null when constructor parameter is invalid (null)");

	/*var n3 = new Tuner.Note({});
	assert.equal(n3.frequency(), null, "Frequency is null when constructor parameter is invalid (null)");*/
});

// Constructor with custom options passed as 2nd parameter
QUnit.test("Constructor with custom options", function(assert) 
{
	var n1 = new Tuner.Note(null, {});
	assert.expect(0);
});

// Creating from note names get the proper number and vice-versa
QUnit.test("Note name and number matches", function(assert) 
{
	// From http://www.sengpielaudio.com/calculator-notenames.htm
	var tb = {
		//"C0":12,
		//"F♯0":18,
		"G1": 31,
		"A3": 57,
		"A♯3": 58,
		"C4": 60,
		"A4": 69,
		"G♯6": 92,
		"F9": 125
	};
	var  n = new Tuner.Note();

	// Test from_name
	for(var i in tb) {
		n.from_name(i);
		assert.equal(n.number(), tb[i], "Note from name ("+i+") matches number ("+tb[i]+")");
	}

	// Test from_number
	for(var j in tb) {
		n.from_number(tb[j]);
		assert.equal(n.fullname(), j, "Note from number ("+tb[j]+") matches name ("+j+")");
	}
});

// Creating from note frequency gets the proper number and vice-versa
QUnit.test("Note number and frequency matches", function(assert) 
{
	// From http://www.sengpielaudio.com/calculator-notenames.htm
	var tb = {
		0: 8.176,
		1: 8.662,
		10: 14.568,
		15: 19.445,
		25: 34.648,
		40: 82.406,
		60: 261.63,
		69: 440.0,
		92: 1661.22,
		125: 11175.3
	};
	var  n = new Tuner.Note();

	// Test from_number
	for(var i in tb) {
		n.from_number(i);
		assert.equal(n.frequency().toFixed(2), tb[i].toFixed(2), "Note from name ("+i+") matches frequency ("+tb[i]+")");
	}

	// Test from_frequency
	for(var j in tb) {
		n.from_frequency(tb[j]);
		assert.equal(n.number(), j, "Note from frequency ("+tb[j]+") matches number ("+j+")");
	}
});
