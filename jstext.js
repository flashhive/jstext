/*

Copyright © 2012 by Samuel Rossille

*/
(function($, undefined) {
	$.jsText = $.jsText || {};
	
	var trim = function(string) {
		return string.replace(/^\s+|\s+$/g, ''); 
	};
	var textMeasuresCache = {};
	var MEASURE_HELPER_PROPERTIES = {
		position: "absolute",
		top: "10px",
		padding: "0px",
		margin: "0px",
		border: "none",
		"font-family": "Arial",
		"font-size": "12px",
		"font-weight": "normal",
		"font-style": "normal",
		"text-decoration": "none"
	};
	
	var INTERNET_EXPLORER_VERSION = (function() {
		var rv = null; // Return value assumes failure.
		if (navigator.appName == 'Microsoft Internet Explorer')
		{
		 var ua = navigator.userAgent;
		 var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
		 if (re.exec(ua) != null)
			rv = parseFloat( RegExp.$1 );
		}
		return rv;
	})();

	/**
	 * Measures text.
	 *
	 * @param text 
	 *            The text to measure
	 * @param css 
	 *            A map of the css properties to use for the measure. The default values are in the MEASURE_HELPER_PROPERTIES constant.
	 * @return
	 *            {w: <int>, h: <int>}
	 */
	$.jsText.computeTextMeasure = function(text, css) {
		var span = $("<span/>")
			.text(text)
			.css($.extend({}, MEASURE_HELPER_PROPERTIES, css));
		$(document.body).append(span);
		
		var w1 = span.width();
		span.text(text + text);
		var w2 = span.width();
		
		var result = {
			w: w2 - w1,
			h: span.height()
		};
		span.remove();
		return result;
	};

	/**
	 * Measures text.
	 *
	 * See $.jsText.computeTextMeasure for the contract, but this method caches the results
	 */
	$.jsText.getTextMeasure = function(text, css) {
		var key = css["font-family"] + "/" + css["font-size"] + "/" + css["font-weight"] + "/" + css["font-style"] + "/" + css["text-decoration"] + "/" + text;
		var cachedResult = textMeasuresCache[key];
		if(cachedResult == null) {
			cachedResult = $.jsText.computeTextMeasure(text, css);
			textMeasuresCache[key] = cachedResult;
		}
		return cachedResult;
	};
	
	/**
	 * Splits a text in words.
	 * 
	 * @param text 
	 *            The text to split in words. Whitespace characters are space, tab, carriage return and line break
	 * @return
	 *            An array of strings containing the words
	 */
	$.jsText.splitWords = function(text) {
		return $.map(text.replace(/[\t\n\r]/g, " ").split(" "), function(word) {
			return word == "" ? null : word;
		});
	};

	/**
	 * Creates an instance of flow
	 * The Flow is the central object which containt all necessary data about a text's properties to be able to perform text layout in different conditions
	 * It's main and only feature is to create a Layout for given constraints.
	 * See layout method of the Flow class, and the Layout class.
	 * @param text 
	 *            The text to create a flow from
	 * @param css 
	 *            A map of the css properties to use for this flow. The default values are in the MEASURE_HELPER_PROPERTIES constant.
	 * @return
	 *            An new Flow, capable of performing layouts of the provided text and css properties
	 */
	$.jsText.flow = function(text, css) {
		return new Flow(text, css);
	};

	var SPACE_WIDTH_DELTA = INTERNET_EXPLORER_VERSION == null
		? 0.5
		: INTERNET_EXPLORER_VERSION >= 9
			? 4
			: 0.5;
	
	var Flow = function(text, css) {
		var lineHeight = $.jsText.getTextMeasure("a", css).h;
		var spaceWidth = $.jsText.getTextMeasure("a a", css).w - $.jsText.getTextMeasure("aa", css).w + SPACE_WIDTH_DELTA;
		var words = $.map($.jsText.splitWords(text), function(word) {
			var wordWidth = 0;
			return {
				l: $.map(word.split(""), function(letter) {
					var letterMeasure = $.jsText.getTextMeasure(letter, css);
					wordWidth += letterMeasure.w;
					return {
						e: letter,
						w: letterMeasure.w
					};
				}),
				e: word,
				w: wordWidth
			};
		});
		
		/**
		 * Performs a layout of this flow, taking into account the provided constraints.
		 * 
		 * @param options
		 *            A map of properties which provides the different options of the layout operation.
		 * 				  - width: required, in pixels. the maximum available width for the text. 
		 *                         The generated layout guarantees that rendering any of the generated 
		 *                         lines with the css properties of the flow will not be larger than the width.
		 *                - maxLines: optional. If provided, the generated layout will not contain more than
		 *                         this number of lines, croping the text if necessary
		 *                - height: optional, in pixels. If provided, rendering all the lines of the flow with the 
		 *                         with the css properties of the flow will not require more space than the provided
		 *                         height. The text will be croped if necessary.
		 *                - useThreeDots: optional, default is true. if the text has to be croped, three character 
		 *                         will be present at the end of the croped text (possibily reducing the amount of 
		 *                         text remaining after the croping).
		 *                - exactLineWidths: optional, default is false. the line width will be computed more accurately, 
		 *                         but it will take more CPU. Use this option only if you intend to use the lineWidth
		 *                         parameter of the callback of the render method of the generated layout and need
		 *                         perfectly accurate line width measures.
		 *                          
		 * @return
		 *            An instance of Layout, which represents the appropriate layout of the text given the provided options.
		 */
		this.layout = function(options) {
			var width = options.width;
			if(width == null) throw "Missing option width";
			var maxLines = null;
			if(options.maxLines != null) maxLines = options.maxLines;
			if(options.height != null) {
				var heightMaxLines = Math.max(Math.floor(options.height / lineHeight), 0);
				if(maxLines == null || heightMaxLines < maxLines) maxLines = heightMaxLines;
			}
			var useThreeDots = true;
			if(options.useThreeDots == false) useThreeDots = false;
			
			var lines = [];
			var lineWidths = [];
			var currentLine = "";
			var remainingSpace = width;
			var lastLine = (maxLines == 1);
			var maxLinesUsed = (maxLines == 0);

			var finalizeCurrentLine = function(textRemaining) {
				if(maxLinesUsed) return;
				currentLine = trim(currentLine);
				if(currentLine.length > 0) {
					if(lastLine && textRemaining && useThreeDots) {
						currentLine += "...";
					}
					lines.push(currentLine);
					if(options.exactLineWidths) {
						lineWidths.push($.jsText.getTextMeasure(currentLine, css).w);
					}
					else {
						lineWidths.push(width - remainingSpace);
					}
				}
				remainingSpace = width;
				currentLine = "";
				lastLine = (lines.length + 1) == maxLines;
				maxLinesUsed = lines.length == maxLines;
				if(lastLine && useThreeDots) {
					var dotsWidth = $.jsText.getTextMeasure("...", css).w;
					if(dotsWidth <= remainingSpace) {
						remainingSpace -= dotsWidth;
					}
					else {
						useThreeDots = false;
					}
				}
			};
			
			var lastWordIndex = null;
			$.each(words, function(wordIndex, word) {
				if(maxLinesUsed) return false;
				if(word.w > remainingSpace) { // not enough place for the current word
					if(word.w > width) { // word does not fit in a line, let's handle it at letter level
						$.each(word.l, function(letterIndex) {
							if(maxLinesUsed) return false;
							if(this.w > remainingSpace) { // not enough place for the current letter
								if(this.w > width) { // if the letter does not fit in a line, let's drop the letter (limit case handling)
									return true;
								}
								else { // letter fits in a line, let's start the next line
									finalizeCurrentLine(wordIndex < words.length - 1 || letterIndex < word.l.length);
									if(maxLinesUsed) return false;
								}
							}
							currentLine += this.e;
							remainingSpace -= this.w;
						});
						currentLine += " ";
						remainingSpace -= spaceWidth;
						return true;
					}
					else { // word fits in a line, let's start the next line
						finalizeCurrentLine(wordIndex < words.length - 1);
						if(maxLinesUsed) return false;
					}
				}
				currentLine += (word.e + " ");
				remainingSpace -= (word.w + spaceWidth);
				
				lastWordIndex = wordIndex;
			});

			finalizeCurrentLine(lastWordIndex != null && lastWordIndex < words.length - 1);
			
			return new Layout(width, options.height, lines, lineWidths, lineHeight);
		};
	};

	/**
	 * Represents the layout of a text under some constraints.
	 */
	var Layout = function(width, height, lines, lineWidths, lineHeight) {
		/**
		 * The height in pixel of a line in this layout.
		 */
		this.lineHeight = lineHeight;
		/**
		 * The lines of the layout, as an Array of Strings
		 */
		this.lines = lines;
		/**
		 * The widths of the lines of the layout, as an Array of Integers
		 */
		this.lineWidths = lineWidths;
		/**
		 * The width constraint used to generate this layout
		 */
		this.width = width;
		/**
		 * The width constraint used to generate this, if any, or null otherwise
		 */
		this.height = height;
	};
	
	/**
	 * Renders this layout width the provided alignment properties.
	 * 
	 * @param horizontalAlign 
	 *            "top", "bottom", or "middle". The argument will be ignored if the layout has been generated without the height option.
	 * @param verticalAlign 
	 *            "left", "right", or "center".
	 * @param callback 
	 *            a callback function that performs the rendering of a line, at the provided coordinates.
	 *            callback(line, x, y, lineWidth)
	 *                - line: the text to render for this line (String)
	 *                - x: the x coordinate of the top left corner of the rectangle containing the text of the line, relative to the constraining box
	 *                - y: the y coordinate of the top left corner of the rectangle containing the text of the line, relative to the constraining box
	 *                - lineWidth: the with of the line (value can be an approximation, see exactLineWidths option of the layout method of the Flow class)
	 */
	Layout.prototype.render = function(horizontalAlign, verticalAlign, callback) {
		var y;
		if(this.height == null || verticalAlign != "bottom" && verticalAlign != "middle") {
			y = 0;
		}
		else {
			var totalHeight = this.lines.length * this.lineHeight;
			if(verticalAlign == "bottom") {
				y = this.height - totalHeight;
			}
			else { // middle
				y = (this.height - totalHeight) / 2;
			}
		}
		
		for(var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i];
			var x;
			if(this.width == null || horizontalAlign != "right" && horizontalAlign != "center") {
				x = 0;
			}
			else {
				var lineWidth = this.lineWidths[i];
				if(horizontalAlign == "right") {
					x = this.width - lineWidth;
				}
				else { // center
					x = (this.width - lineWidth) / 2;
				}
			}
			callback(line, x, y, lineWidth);
			y += this.lineHeight;
		}
	};
})(jQuery);