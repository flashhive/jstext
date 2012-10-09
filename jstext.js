/*
*
* Copyright @ 2012 by Samuel Rossille
* 
* Updates:
*     * 2 Oct 2012 - Julien Durand: support a flow of formatted sections.
*
*/

(function($, undefined) {
	$.jsText = $.jsText || {};
	
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
	 * Isolates line breaks in distinct sections
	 * 
	 *  @param text
	 *  		The text to split in sections
	 *  @return 
	 *  		A array of strings
	 */
	$.jsText.splitSection = function(text){ 
		var sections = [];
		var stringBuffer = [];
		for(var index in text){
			var char = text[index];
			switch(char){
				case '\t':
					stringBuffer.push("    ");
					break;
				case '\r': // controls flows to next case
				case '\n':
					sections.push(stringBuffer.join(""), char);
					stringBuffer = [];
					break;
				default:
				    stringBuffer.push(char);
			}
		}
		sections.push(stringBuffer.join(""));
		return sections;
	};
	
	/**
	 * Splits a text in words.
	 * 
	 * @param text 
	 *            The text to split in words.
	 * @return
	 *            An array of strings containing the words
	 */
	var splitWords = function(text) {
		var words = [];
		var stringBuffer = [];
		for(var index in text){
			var char = text[index];
			if(char == ' '){
				stringBuffer.push(' ');
			    words.push(stringBuffer.join(""));
			    stringBuffer = [];
			} else {
				stringBuffer.push(char);
			}
		}
		words.push(stringBuffer.join(""));
		return words;
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
		if($.isArray(text)){
			// formatted text with multiple formatting sections and global css
			return new Flow(text, css);
		}else{
			// special case: text with no formatting sections
			return new Flow([{text: text, css: {}}], css);
		}
	};

	var SPACE_WIDTH_DELTA = INTERNET_EXPLORER_VERSION == null
		? 0.5
		: INTERNET_EXPLORER_VERSION >= 9
			? 4
			: 0.5;
	
	function Flow(formattedText, globalcss) {
		
		function calculateWordInSection(word, spaceWidth, css){
			var wordWidth = 0;
			return {
				letters: $.map(word, function(letter) {
					var letterMeasure = letter == " " ? {w: spaceWidth} : $.jsText.getTextMeasure(letter, css);
					wordWidth += letterMeasure.w;
					return {
						letter: letter,
						w: letterMeasure.w
					};
				}),
				word: word,
				w: wordWidth
			};
		}

		var sections = [];
		
		$.each(formattedText, function(section){
			var text = this.text;
			var css = $.extend({}, globalcss, this.css);
			var spaceWidth = $.jsText.getTextMeasure("a a", css).w - $.jsText.getTextMeasure("aa", css).w + SPACE_WIDTH_DELTA;		
			var h = $.jsText.getTextMeasure("a", css).h;
			$.each($.jsText.splitSection(text), function(sectionIndex){
				var sectionWidth = 0;
				sections.push({
					words: $.map(splitWords(this), function(word) {	
						var words = calculateWordInSection(word, spaceWidth, css);
						sectionWidth += words.w;
						return words;
					}),
					text: this,
					css: css,
					w: sectionWidth,
					h: h,
					spaceWidth: spaceWidth
				});
			});
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
			/*
			 * parse options
			 */
			if(options.width == null) throw "Missing option width"; // options.width is mandatory
			options.useThreeDots = (options.useThreeDots == false) ? false : true; // set to true by default
			options.css = options.css ? options.css : {};
			
			
			var lines = [];
						
			var currentLine = [];
			var remainingWidth = options.width;
			var totalHeight = 0;
			
			/*
			 * Calculates the text and width of a newly created sub-section.
			 */
			function finalizeSection(section){
				var stringBuffer = [];
				$.each(section.words, function(){
					section.w += this.w;
					stringBuffer.push(this.word);
				});
				section.text =  stringBuffer.join("");
				// parameter passed by reference => no return value
			}
			
			/*
			 * Calculates and return the longest sub-section fitting in the remaining space.
			 */
			function createLongestSubsection(currentSection, remainingSpace){
				// find the longest subsection fitting in the remaining space
				var consummed = 0;
				var wordIndex = 0;
				for(wordIndex in currentSection.words){
					var word = currentSection.words[wordIndex];
					if(consummed + word.w > remainingSpace){
						break;
					}
					consummed += word.w;
				}
				
				// if no section can be made to fit then restack the section and return an empty section
				if(wordIndex == 0){
					sections.unshift(currentSection);
					return {empty: true};
				}
				
				// split the current section into two sub-sections
				var h = currentSection.h;
				var css = currentSection.css;
				var spaceWidth = currentSection.spaceWidth;
				var firstSection = {words: currentSection.words.slice(0, wordIndex), css: css, w: 0, h: h, spaceWidth: spaceWidth};
				finalizeSection(firstSection);
				var secondSection = {words: currentSection.words.slice(wordIndex), css: css, w: 0, h: h, spaceWidth: spaceWidth};			
				finalizeSection(secondSection);
				
				// restack the second part
				sections.unshift(secondSection);
				
				// and return the first section
				return firstSection;
			}
			
			/*
			 * Calculates the longest string of letters fitting in the remaining space to address the pathological
			 * case when the first word of the section can not fit in the line width.
			 */
			function getSectionWithLettersFitting(remainingSpace){
				var currentSection = sections.shift();
				var consummed = 0;
				var word = currentSection.words[0];
				var letterIndex = 0;
				for(letterIndex in word.letters){
					var letter = word.letters[letterIndex];
					if(consummed + letter.w > remainingSpace){
						break;
					}
					consummed += letter.w;
				}
				
				// if no letter can fit then do as if the first letter is fitting
				if(letterIndex == 0){
					letterIndex = 1;
				}
					
				// split the current Section into two sub-section
				var h = currentSection.h;
				var css = currentSection.css;
				var spaceWidth = currentSection.spaceWidth;
				
				var firstWord = calculateWordInSection(word.word.slice(0, letterIndex), spaceWidth, css);
				var firstSection = {words: [firstWord], css: css, w: 0, h: h, spaceWidth: spaceWidth};
				finalizeSection(firstSection);
				
				var secondWord = calculateWordInSection(word.word.slice(letterIndex), spaceWidth, css);
				currentSection.words[0] = secondWord;
				var secondSection = {words: currentSection.words , css: css, w: 0, h: h, spaceWidth: spaceWidth};			
				finalizeSection(secondSection);
				
				// restack the second part
				sections.unshift(secondSection);
				
				// and return the first section
				return firstSection;
			}
			
			/*
			 * Returns the largest sub-section not exceeding remaingSpace (creating it if necessary).
			 */
			function nextSection(remainingSpace){
				//  are there any more sections to process ?
				if(sections.length == 0){
						return false;
				}
				
				// get the next section
				var currentSection = sections.shift();
				
				// simple case
				if(currentSection.w < remainingSpace){
					return currentSection;
				}
				
				return createLongestSubsection(currentSection, remainingSpace);
			}

			/*
			 * Adds a section to the current line and calculates the remaining space.
			 */
			function addSectionToCurrentLine(section){
				currentLine.push(section);
				remainingWidth -= section.w;
			}
			
			/*
			 * Finalizes a line (calculates width and height) and reset the context to a new line.
			 */
			function finalizeCurrentLine(){
				var lineWidth = 0;
				var lineHeight = 0;
				for(var sectionIndex in currentLine){
					var section = currentLine[sectionIndex];
					lineWidth += section.w;
					if(lineHeight < section. h){
						lineHeight = section.h;
					}
				}
				var newLine = {
						sections: currentLine,
						w: lineWidth,
						h: lineHeight
					};
				lines.push(newLine); 
				totalHeight += lineHeight;
				
				// should this be the last line?
				if(    (options.maxLines && lines.length >= options.maxLines)
					|| (options.height && totalHeight >= options.height) ){
					// do we need to add ellipsis (...)?
					if(sections.length > 0 && options.useThreeDots){
						var lastSection = newLine.sections[newLine.sections.length - 1];
						lastSection.text = [lastSection.text.slice(0, lastSection.text.length - 3) , "..."].join("");
					}
					return false;
				}
				
				// reset context for new line
				currentLine = [];
				remainingWidth = options.width;
				return true;
			}

			/*
			 * the algorithm fitting sections into lines 
			 */ 
			fit:{
				for(var section = nextSection(remainingWidth); section; section = nextSection(remainingWidth)){
					// at the end of the line: no section can be made to fit in the remaining space
					if(section.empty){
						// pathological case when the first word of the section can not fit in the line
						if(currentLine.length == 0){
							addSectionToCurrentLine(getSectionWithLettersFitting(remainingWidth));
						}
						if(!finalizeCurrentLine()){
							break fit;
						}
						continue;
					}
					
					// standard case: a section can be created to fit the remaining space in the line
					switch(section.text[0]){
						case '\n': // control flows to next case !
						case '\r':
							// handle line break
							if(!finalizeCurrentLine()){
								break fit;
							}
							break;
						default:
							addSectionToCurrentLine(section);
					}	
				}
				
				// finalizes the last line
				finalizeCurrentLine();
			}
			
			// creates and returns a new layout object
			return new Layout(lines, options.width, options.height, totalHeight);
		};
	};

	/**
	 * Represents the layout of a text under some constraints.
	 */
	var Layout = function(lines, width, height, totalHeight) {
		/**
		 * The lines of the layout, as an Array of sections [{string, css}]
		 */
		this.lines = lines;
		/**
		 * The width constraint used to generate this layout
		 */
		this.width = width;
		/**
		 * The height constraint used to generate this, if any, or null otherwise
		 */
		this.height = height;
		/**
		 * The total height of the generated paragraph
		 */
		this.totalHeight = totalHeight;		
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
		/*
		 * Calculate starting y position based on vertical alignment parameter
		 */
		var y = 0;
		var height = this.height;
		if(height != null) {
			switch(verticalAlign){
				case "bottom":	
					y = height - this.totalHeight;
					break;
				case "middle":
					y = (height - this.totalHeight) / 2;
					break;
				case "top": 
					// "top" => control flows to default 
				default:
					// No-op
			}
		}
		
		/*
		 * render each line
		 */
		var width = this.width;
		$.each(this.lines, function(){
			/*
			 * Calculate starting x position based on horizontal alignment parameter
			 */
			var x = 0;
			if(width != null) {
				switch(horizontalAlign){
					case "right":
						x = width - this.w;
						break;
					case "center":
						x = (width - this.w) / 2;
						break;
					case "left":
						// "left" => control flows to default
					default:
						// No-op
				}
			}
			
			/*
			 * process each section
			 */
			$.each(this.sections, function(){
				// process the user defined rendering function
				callback(this.text.replace(" ", "&nbsp;"), x, y, this.w, this.css);
				x += this.w;
			});
			y += this.h;
		});
	};
	
	/* for backward compatibility */
	$.jsText.splitWords = function(text) {
		return $.map(text.replace(/[\t\n\r]/g, " ").split(" "), function(word) {
			return word == "" ? null : word;
		});
	};
})(jQuery);