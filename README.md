Tuner
=====

A modular web-based guitar tuner (or _any other instruments_) built entirely with Javascript / HTML 5.

## API
The Tuner API is made of the following classes:
- `Tuner`
- `Tuner.Note`
- `Tuner.Source`
  - `Tuner.Source.Audio`
  - `Tuner.Source.Guitarix`
- `Tuner.Generator`
  - `Tuner.Generator.Audio`
- `Tuner.Ui`
  - `Tuner.Ui.Debug`

Extended documentation can be found in the `doc/jsdoc` and `doc/docco` folders.

  ### `Tuner`

  ### `Tuner.Note`

  ### `Tuner.Source`

  ### `Tuner.Generator`

  ### `Tuner.Ui`

## Browser support
Only modern browsers are supported.
This application was built for mobile (phone / tablet) platforms but can be ran without a problem on desktops. Do not even try in _IE < 8_

### Web Audio API
The `Tuner.Source.Audio` class uses the `Web Audio` API to:
- capture audio input from the microphone
- analyze the audio signal
- generate sine waves for manual tuning (oscilloscope)

### Other HTML5 features
- Canvas (Visualisation)
- Storage (Settings)
- Fullscreen API


## Help  / Development / Contributions
You can start helping now by trying this tool to tune your instrument(s) and reporting bugs. This tool needs to be tested extensively with:
- Violins and viola
- 12-strings accoustic guitars
- Stand-up bass
- Piano
- any unconventional instruments or tuning setups

*Developers* can help by writing more unit tests, fixing the bugs they encounter but 

Translations in other languages would also be welcome / appreciated.

### Unit Tests
Unit tests are located in the `/tests` directory. They are written for QUnit.


### Grunt Automations
`grunt.js` is used to build the final scripts as well as to help with development.


## About the author(s)
- Mathieu Ducharme <mat@locomotive.ca> is a technical director at [Locomotive](http://locomotive.ca), a Montreal Web Agency.

## License
Licensed under the MIT  license:

<pre>
Copyright (c) 2015 Mathieu Ducharme

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
</pre>