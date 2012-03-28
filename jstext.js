(function($, undefined) {
	$.jsText = $.jsText || {};
	
	var trim = function(string) {
		return string.replace(/^\s+|\s+$/g, ''); 
	};

	var MEASURE_HELPER_PROPERTIES = {
		position: "absolute",
		top: "10px",
		padding: "0px",
		margin: "0px",
		border: "none",
		"font-familly": "Arial",
		"font-size": "12px",
		"font-weight": "normal",
		"font-style": "normal",
		"text-decoration": "none"
	};

	var MEASURE_REPEAT_X = 1;

	$.jsText.computeTextMeasure = function(text, css) {
		text = (new Array(MEASURE_REPEAT_X + 1)).join(text);
		var span = $("<span/>")
			.text(text)
			.css($.extend({}, MEASURE_HELPER_PROPERTIES, css));
		$(document.body).append(span);
		var result = {
			w: (span.width() / MEASURE_REPEAT_X),
			h: span.height()
		};
		span.remove();
		return result;
	};

	var cache = {};
	$.jsText.getTextMeasure = function(text, css) {
		var key = css["font-familly"] + "/" + css["font-size"] + "/" + css["font-weight"] + "/" + css["font-style"] + "/" + css["text-decoration"] + "/" + text;
		var cachedResult = cache[key];
		if(cachedResult == null) {
			cachedResult = $.jsText.computeTextMeasure(text, css);
			cache[key] = cachedResult;
		}
		return cachedResult;
	};
	//$.jsText.getTextMeasure = $.jsText.computeTextMeasure;
	
	$.jsText.splitWords = function(text) {
		return $.map(text.replace(/[\t\n\r]/g, " ").split(" "), function(word) {
			return word == "" ? null : word;
		});
	};

	Flow = function(text, css) {
		var lineHeight = $.jsText.getTextMeasure("a", css).h;
		var spaceWidth = $.jsText.getTextMeasure("a a", css).w - $.jsText.getTextMeasure("aa", css).w + 0.5;
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
		
		this.layout = function(options) {
			var width = options.width;
			if(width == null) throw "Missing option width";
			var maxLines = null;
			if(options.maxLines != null) maxLines = options.maxLines;
			if(options.height != null) {
				var heightMaxLines = Math.floor(options.height / lineHeight);
				if(maxLines == null || heightMaxLines < maxLines) maxLines = heightMaxLines;
			}
			var useThreeDots = true;
			if(options.useThreeDots == false) useThreeDots = false;
			
			var lines = [];
			var currentLine = "";
			var remainingSpace = width;
			var lastLine = (maxLines == 1);
			var maxLinesUsed = (maxLines == 0);

			var finalizeCurrentLine = function() {
				if(maxLinesUsed) return;
				currentLine = trim(currentLine);
				if(currentLine.length > 0) {
					if(lastLine && useThreeDots) {
						currentLine += "...";
					}
					lines.push(currentLine);
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
			
			$.each(words, function() {
				if(maxLinesUsed) return;
				if(this.w > remainingSpace) { // not enough place for the current word
					if(this.w > width) { // word does not fit in a line, let's handle it at letter level
						$.each(this.l, function() {
							if(maxLinesUsed) return;
							if(this.w > remainingSpace) { // not enough place for the current letter
								if(this.w > width) { // if the letter does not fit in a line, let's drop the letter (limit case handling)
									return;
								}
								else { // letter fits in a line, let's start the next line
									finalizeCurrentLine();
									if(maxLinesUsed) return;
								}
							}
							currentLine += this.e;
							remainingSpace -= this.w;
						});
						currentLine += " ";
						remainingSpace -= spaceWidth;
						return;
					}
					else { // word fits in a line, let's start the next line
						finalizeCurrentLine();
						if(maxLinesUsed) return;
					}
				}
				currentLine += (this.e + " ");
				remainingSpace -= (this.w + spaceWidth);
			});

			finalizeCurrentLine();
			
			return {
				lineHeight: lineHeight,
				lines: lines
			};
		};
	};
	
	$.jsText.flow = function(text, css) {
		return new Flow(text, css);
	};

})(jQuery);